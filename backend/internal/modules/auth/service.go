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

	"github.com/jeremi16/ressist-api/internal/config"
	"github.com/jeremi16/ressist-api/internal/models"
	"github.com/jeremi16/ressist-api/internal/shared/middleware"
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

// reuseGraceWindow adalah toleransi pemakaian ulang refresh token yang baru
// saja dirotasi. BFF (khususnya di serverless seperti Vercel) menembak
// beberapa request paralel dengan cookie lama yang sama, sehingga request
// yang kalah race TIDAK boleh dianggap pencurian token.
const reuseGraceWindow = 120 * time.Second

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
	// oauthNative exchanges serverAuthCode from Android native sign-in.
	// Same client ID/secret, but no web redirect URL.
	oauthNative *oauth2.Config
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
			"https://www.googleapis.com/auth/classroom.coursework.me.readonly",
		},
	}
	oauthNative := &oauth2.Config{
		ClientID:     cfg.GoogleClientID,
		ClientSecret: cfg.GoogleClientSecret,
		RedirectURL:  "",
		Endpoint:     google.Endpoint,
		Scopes: []string{
			"openid",
			"https://www.googleapis.com/auth/userinfo.email",
			"https://www.googleapis.com/auth/userinfo.profile",
			"https://www.googleapis.com/auth/classroom.course-work.readonly",
			"https://www.googleapis.com/auth/classroom.courses.readonly",
			"https://www.googleapis.com/auth/classroom.coursework.me.readonly",
		},
	}
	return &Service{
		db:       db,
		cfg:      cfg,
		tokens:   tokens,
		oauthCfg: oauthCfg,
		oauthNative: oauthNative,
		client:   &http.Client{Timeout: 15 * time.Second},
	}, nil
}

func (s *Service) BuildGoogleLoginURL(state string, hasExistingSession bool) string {
	opts := []oauth2.AuthCodeOption{
		oauth2.AccessTypeOffline,
		oauth2.SetAuthURLParam("include_granted_scopes", "true"),
	}
	return s.oauthCfg.AuthCodeURL(state, opts...)
}

func (s *Service) ExchangeGoogleCode(ctx context.Context, code string) (*oauth2.Token, error) {
	return s.oauthCfg.Exchange(ctx, code)
}

// ExchangeNativeCode exchanges a serverAuthCode obtained from Android
// native Google sign-in (no web redirect URL, no state cookie).
func (s *Service) ExchangeNativeCode(ctx context.Context, code string) (*oauth2.Token, error) {
	return s.oauthNative.Exchange(ctx, code)
}

// refreshTTLForClient returns the sliding TTL for a refresh token chain.
func (s *Service) refreshTTLForClient(client string) time.Duration {
	if client == "mobile" {
		hours := s.cfg.MobileRefreshTokenTTLHour
		if hours <= 0 {
			hours = 720
		}
		return time.Duration(hours) * time.Hour
	}
	hours := s.cfg.RefreshTokenTTLHour
	if hours <= 0 {
		hours = 72
	}
	return time.Duration(hours) * time.Hour
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

func (s *Service) ParseAccessToken(raw string) (*middleware.AccessClaims, error) {
	return s.tokens.ParseAccessToken(raw)
}

func (s *Service) CreateRefreshToken(ctx context.Context, userID string, userAgent string, ipAddress string) (string, error) {
	return s.CreateRefreshTokenForClient(ctx, userID, userAgent, ipAddress, "web")
}

func (s *Service) CreateRefreshTokenForClient(ctx context.Context, userID string, userAgent string, ipAddress string, client string) (string, error) {
	if client != "mobile" {
		client = "web"
	}
	raw, err := generateSecureToken(48)
	if err != nil {
		return "", err
	}
	expiresAt := time.Now().UTC().Add(s.refreshTTLForClient(client))
	record := models.RefreshToken{
		UserID:    userID,
		TokenHash: hashToken(raw),
		ExpiresAt: expiresAt,
		Client:    client,
		UserAgent: userAgent,
		IPAddress: ipAddress,
	}
	if err := s.db.WithContext(ctx).Create(&record).Error; err != nil {
		return "", err
	}
	return raw, nil
}

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
		if now.Sub(*existing.RevokedAt) < reuseGraceWindow {
			var user models.User
			if err := s.db.WithContext(ctx).Where("id = ?", existing.UserID).First(&user).Error; err == nil {
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
	// Absolute max lifetime: even with sliding rotation, force re-login.
	if maxDays := s.cfg.RefreshTokenAbsoluteMaxDays; maxDays > 0 {
		if now.Sub(existing.CreatedAt) > time.Duration(maxDays)*24*time.Hour {
			_ = s.db.WithContext(ctx).
				Model(&models.RefreshToken{}).
				Where("id = ? AND revoked_at IS NULL", existing.ID).
				Update("revoked_at", &now).Error
			return nil, "", ErrExpiredRefreshToken
		}
	}
	var user models.User
	if err := s.db.WithContext(ctx).Where("id = ?", existing.UserID).First(&user).Error; err != nil {
		return nil, "", err
	}
	newRaw, err := generateSecureToken(48)
	if err != nil {
		return nil, "", err
	}
	client := existing.Client
	if client != "mobile" {
		client = "web"
	}
	newRecord := models.RefreshToken{
		UserID:    user.ID,
		TokenHash: hashToken(newRaw),
		ExpiresAt: now.Add(s.refreshTTLForClient(client)),
		Client:    client,
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
			// Kalah race rotasi concurrent (dua request baca token yang sama
			// sebagai valid, satu menang commit). Perlakukan sebagai benign:
			// request tetap sukses, cookie browser akan diperbarui oleh
			// response pemenang yang membawa token baru. RevokeAll HANYA
			// untuk pemakaian ulang di luar grace window (indikasi pencurian).
			var current models.RefreshToken
			if rerr := s.db.WithContext(ctx).Where("token_hash = ?", hashed).First(&current).Error; rerr == nil &&
				current.RevokedAt != nil && now.Sub(*current.RevokedAt) < reuseGraceWindow {
				var user models.User
				if uerr := s.db.WithContext(ctx).Where("id = ?", current.UserID).First(&user).Error; uerr == nil {
					return &user, "", nil
				}
			}
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
