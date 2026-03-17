package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/jeremi16/resisst-api/internal/config"
	"github.com/jeremi16/resisst-api/internal/models"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"gorm.io/gorm"
)

var (
	ErrInvalidRefreshToken   = errors.New("invalid refresh token")
	ErrExpiredRefreshToken   = errors.New("refresh token expired")
	ErrRefreshTokenReuse     = errors.New("refresh token reuse detected")
	ErrEmailDomainNotAllowed = errors.New("email domain is not allowed")
	ErrInvalidGoogleUserInfo = errors.New("invalid google user info")
	ErrUserIdentityConflict  = errors.New("google account conflicts with existing user")
)

type GoogleUserInfo struct {
	Sub           string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
}

type Service struct {
	db       *gorm.DB
	cfg      *config.Config
	tokens   *TokenService
	oauthCfg *oauth2.Config
	client   *http.Client
}

func NewService(db *gorm.DB, cfg *config.Config, tokens *TokenService) (*Service, error) {
	if cfg.GoogleClientID == "" || cfg.GoogleClientSecret == "" || cfg.GoogleRedirectURL == "" {
		return nil, fmt.Errorf("GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URL are required")
	}

	oauthCfg := &oauth2.Config{
		ClientID:     cfg.GoogleClientID,
		ClientSecret: cfg.GoogleClientSecret,
		RedirectURL:  cfg.GoogleRedirectURL,
		Endpoint:     google.Endpoint,
		Scopes: []string{
			"openid",
			"https://www.googleapis.com/auth/userinfo.email",
			"https://www.googleapis.com/auth/userinfo.profile",
			"https://www.googleapis.com/auth/classroom.course-work.readonly",
			"https://www.googleapis.com/auth/classroom.courses.readonly",
		},
	}

	return &Service{
		db:       db,
		cfg:      cfg,
		tokens:   tokens,
		oauthCfg: oauthCfg,
		client:   &http.Client{Timeout: 15 * time.Second},
	}, nil
}

func (s *Service) BuildGoogleLoginURL(state string, hasExistingSession bool) string {
	opts := []oauth2.AuthCodeOption{
		oauth2.AccessTypeOffline,
		oauth2.SetAuthURLParam("include_granted_scopes", "true"),
	}

	// We no longer force 'prompt=consent'. 
	// Google will automatically skip the consent screen if the user has already granted permissions.
	// This provides a much smoother experience for returning users across all devices.

	return s.oauthCfg.AuthCodeURL(state, opts...)
}

func (s *Service) ExchangeGoogleCode(ctx context.Context, code string) (*oauth2.Token, error) {
	return s.oauthCfg.Exchange(ctx, code)
}

func (s *Service) FetchGoogleUser(ctx context.Context, accessToken string) (*GoogleUserInfo, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://www.googleapis.com/oauth2/v3/userinfo", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("google userinfo failed: status=%d body=%s", resp.StatusCode, string(body))
	}

	var info GoogleUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, err
	}
	return &info, nil
}

func (s *Service) UpsertGoogleUser(ctx context.Context, info *GoogleUserInfo) (*models.User, error) {
	if info == nil {
		return nil, ErrInvalidGoogleUserInfo
	}

	email := strings.TrimSpace(info.Email)
	googleID := strings.TrimSpace(info.Sub)
	if email == "" || googleID == "" {
		return nil, ErrInvalidGoogleUserInfo
	}

	if s.cfg.AllowedEmailDomain != "" {
		domain := "@" + strings.ToLower(strings.TrimSpace(s.cfg.AllowedEmailDomain))
		if !strings.HasSuffix(strings.ToLower(email), domain) {
			return nil, ErrEmailDomainNotAllowed
		}
	}

	var user models.User
	// Primary lookup by Google subject (stable identity).
	err := s.db.WithContext(ctx).Where("google_id = ?", googleID).First(&user).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	if err == nil {
		user.Email = email
		user.Name = info.Name
		user.AvatarURL = info.Picture
		user.GoogleID = googleID
		user.EmailVerified = info.EmailVerified
		if err := s.db.WithContext(ctx).Save(&user).Error; err != nil {
			if isUniqueConstraintError(err) {
				return nil, ErrUserIdentityConflict
			}
			return nil, err
		}
		return &user, nil
	}

	// Fallback for legacy rows that may not have google_id set.
	err = s.db.WithContext(ctx).Where("email = ?", email).First(&user).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	if err == nil {
		existingGoogleID := strings.TrimSpace(user.GoogleID)
		if existingGoogleID != "" && existingGoogleID != googleID {
			return nil, ErrUserIdentityConflict
		}

		user.Email = email
		user.Name = info.Name
		user.AvatarURL = info.Picture
		user.GoogleID = googleID
		user.EmailVerified = info.EmailVerified
		if err := s.db.WithContext(ctx).Save(&user).Error; err != nil {
			if isUniqueConstraintError(err) {
				return nil, ErrUserIdentityConflict
			}
			return nil, err
		}
		return &user, nil
	}

	user = models.User{
		Email:         email,
		Name:          info.Name,
		AvatarURL:     info.Picture,
		GoogleID:      googleID,
		EmailVerified: info.EmailVerified,
	}
	if err := s.db.WithContext(ctx).Create(&user).Error; err != nil {
		if isUniqueConstraintError(err) {
			return nil, ErrUserIdentityConflict
		}
		return nil, err
	}
	return &user, nil
}

func (s *Service) UpsertGoogleTokens(ctx context.Context, userID string, token *oauth2.Token) error {
	if token == nil || strings.TrimSpace(token.AccessToken) == "" {
		return fmt.Errorf("google access token is missing")
	}

	updates := map[string]interface{}{
		"google_access_token":      token.AccessToken,
		"google_classroom_enabled": true,
		"lms_last_synced_at":       nil,
	}

	if strings.TrimSpace(token.RefreshToken) != "" {
		updates["google_refresh_token"] = token.RefreshToken
	}

	if token.Expiry.IsZero() {
		updates["google_token_expiry"] = nil
	} else {
		updates["google_token_expiry"] = token.Expiry.UTC()
	}

	return s.db.WithContext(ctx).
		Model(&models.User{}).
		Where("id = ?", userID).
		Updates(updates).Error
}

func (s *Service) GenerateAccessToken(user models.User) (string, time.Time, error) {
	return s.tokens.GenerateAccessToken(user)
}

func (s *Service) ParseAccessToken(raw string) (*AccessClaims, error) {
	return s.tokens.ParseAccessToken(raw)
}

func (s *Service) CreateRefreshToken(ctx context.Context, userID string, userAgent string, ipAddress string) (string, error) {
	raw, err := generateSecureToken(48)
	if err != nil {
		return "", err
	}

	expiresAt := time.Now().UTC().Add(time.Duration(s.cfg.RefreshTokenTTLHour) * time.Hour)
	record := models.RefreshToken{
		UserID:    userID,
		TokenHash: hashToken(raw),
		ExpiresAt: expiresAt,
		UserAgent: userAgent,
		IPAddress: ipAddress,
	}

	if err := s.db.WithContext(ctx).Create(&record).Error; err != nil {
		return "", err
	}
	return raw, nil
}

// ValidateRefreshToken checks if a refresh token is valid without rotating it
func (s *Service) ValidateRefreshToken(ctx context.Context, rawToken string) bool {
	hashed := hashToken(rawToken)
	now := time.Now().UTC()

	var existing models.RefreshToken
	err := s.db.WithContext(ctx).
		Where("token_hash = ?", hashed).
		First(&existing).Error
	if err != nil {
		return false
	}

	// Check if token is revoked or expired
	if existing.RevokedAt != nil {
		return false
	}

	if existing.ExpiresAt.Before(now) {
		return false
	}

	return true
}

func (s *Service) RotateRefreshToken(ctx context.Context, rawToken string, userAgent string, ipAddress string) (*models.User, string, error) {
	hashed := hashToken(rawToken)
	now := time.Now().UTC()

	var existing models.RefreshToken
	err := s.db.WithContext(ctx).
		Where("token_hash = ?", hashed).
		First(&existing).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, "", ErrInvalidRefreshToken
		}
		return nil, "", err
	}

	if existing.RevokedAt != nil {
		// Implement grace period for parallel requests:
		// If the token was revoked less than 30 seconds ago, consider it still valid once.
		if now.Sub(*existing.RevokedAt) < 30*time.Second {
			// Return the user but don't rotate again, the previous rotation's token is already in the air.
			// Actually better to just allow it to proceed to GenerateAccessToken,
			// but we need to return the user.
			var user models.User
			if err := s.db.WithContext(ctx).Where("id = ?", existing.UserID).First(&user).Error; err == nil {
				// We return the user but NO NEW token (empty string).
				// The frontend should be smart enough to handle empty rotation.
				return &user, "", nil
			}
		}

		_ = s.RevokeAllUserRefreshTokens(ctx, existing.UserID)
		return nil, "", ErrRefreshTokenReuse
	}

	if existing.ExpiresAt.Before(now) {
		_ = s.db.WithContext(ctx).
			Model(&models.RefreshToken{}).
			Where("id = ? AND revoked_at IS NULL", existing.ID).
			Update("revoked_at", &now).Error
		return nil, "", ErrExpiredRefreshToken
	}

	var user models.User
	if err := s.db.WithContext(ctx).Where("id = ?", existing.UserID).First(&user).Error; err != nil {
		return nil, "", err
	}

	newRaw, err := generateSecureToken(48)
	if err != nil {
		return nil, "", err
	}

	newRecord := models.RefreshToken{
		UserID:    user.ID,
		TokenHash: hashToken(newRaw),
		ExpiresAt: now.Add(time.Duration(s.cfg.RefreshTokenTTLHour) * time.Hour),
		UserAgent: userAgent,
		IPAddress: ipAddress,
	}

	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		revokeResult := tx.Model(&models.RefreshToken{}).
			Where("id = ? AND revoked_at IS NULL", existing.ID).
			Update("revoked_at", &now)
		if revokeResult.Error != nil {
			return revokeResult.Error
		}
		if revokeResult.RowsAffected == 0 {
			return ErrRefreshTokenReuse
		}

		if err := tx.Create(&newRecord).Error; err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		if errors.Is(err, ErrRefreshTokenReuse) {
			_ = s.RevokeAllUserRefreshTokens(ctx, user.ID)
		}
		return nil, "", err
	}

	return &user, newRaw, nil
}

func (s *Service) RevokeAllUserRefreshTokens(ctx context.Context, userID string) error {
	now := time.Now().UTC()
	return s.db.WithContext(ctx).
		Model(&models.RefreshToken{}).
		Where("user_id = ? AND revoked_at IS NULL", userID).
		Update("revoked_at", &now).Error
}

func (s *Service) RevokeRefreshToken(ctx context.Context, rawToken string) error {
	hash := hashToken(rawToken)
	now := time.Now().UTC()
	return s.db.WithContext(ctx).
		Model(&models.RefreshToken{}).
		Where("token_hash = ? AND revoked_at IS NULL", hash).
		Update("revoked_at", &now).Error
}

func (s *Service) GetUserByID(ctx context.Context, userID string) (*models.User, error) {
	var user models.User
	if err := s.db.WithContext(ctx).Where("id = ?", userID).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func hashToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}

func generateSecureToken(bytesLen int) (string, error) {
	buf := make([]byte, bytesLen)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func isUniqueConstraintError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "duplicate key") ||
		strings.Contains(msg, "unique constraint") ||
		strings.Contains(msg, "unique violation") ||
		strings.Contains(msg, "constraint failed")
}
