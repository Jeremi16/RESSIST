package handlers

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jeremi16/resisst-api/internal/auth"
	"github.com/jeremi16/resisst-api/internal/config"
	"github.com/jeremi16/resisst-api/internal/http/middleware"
	"github.com/jeremi16/resisst-api/internal/models"
	"gorm.io/gorm"
)

const (
	oauthStateCookieName   = "oauth_state"
	refreshTokenCookieName = "refresh_token"
)

type AuthHandler struct {
	cfg       *config.Config
	auth      *auth.Service
	db        *gorm.DB
	syncSvc   *SyncService
	calendarH *CalendarHandler
}

func NewAuthHandler(cfg *config.Config, authSvc *auth.Service, db *gorm.DB, calendarH *CalendarHandler) *AuthHandler {
	return &AuthHandler{
		cfg:       cfg,
		auth:      authSvc,
		db:        db,
		syncSvc:   NewSyncService(db),
		calendarH: calendarH,
	}
}

// GoogleLogin initiates OAuth login flow
func (h *AuthHandler) GoogleLogin(c *gin.Context) {
	state := uuid.NewString()
	h.setCookie(c, oauthStateCookieName, state, 600)

	// Check if user already has a valid refresh token (indicating previous login)
	hasExistingSession := h.hasValidRefreshToken(c)

	c.Redirect(http.StatusTemporaryRedirect, h.auth.BuildGoogleLoginURL(state, hasExistingSession))
}

// GoogleCallback handles OAuth callback
func (h *AuthHandler) GoogleCallback(c *gin.Context) {
	// Check for OAuth errors from Google
	if oauthError := c.Query("error"); oauthError != "" {
		errorDesc := c.Query("error_description")
		if errorDesc != "" {
			h.redirectError(c, fmt.Sprintf("oauth_error: %s - %s", oauthError, errorDesc))
		} else {
			h.redirectError(c, fmt.Sprintf("oauth_error: %s", oauthError))
		}
		return
	}

	code := strings.TrimSpace(c.Query("code"))
	state := strings.TrimSpace(c.Query("state"))
	if code == "" || state == "" {
		h.redirectError(c, "missing_code_or_state")
		return
	}

	if !h.validateState(c, state) {
		h.redirectError(c, "state_mismatch")
		return
	}

	user, err := h.processGoogleAuth(c.Request.Context(), code)
	if err != nil {
		h.redirectError(c, err.Error())
		return
	}

	if err := h.createAndSetRefreshToken(c, user.ID); err != nil {
		h.redirectError(c, err.Error())
		return
	}

	c.Redirect(http.StatusTemporaryRedirect, joinURL(h.cfg.FrontendURL, h.cfg.FrontendSuccessPath))
}

// Refresh handles token refresh
func (h *AuthHandler) Refresh(c *gin.Context) {
	rawRefreshToken, err := c.Cookie(refreshTokenCookieName)
	if err != nil || rawRefreshToken == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing refresh token"})
		return
	}

	user, newRefresh, err := h.auth.RotateRefreshToken(
		c.Request.Context(),
		rawRefreshToken,
		c.GetHeader("User-Agent"),
		c.ClientIP(),
	)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": h.mapRefreshError(err)})
		return
	}

	accessToken, expiresAt, err := h.auth.GenerateAccessToken(*user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to issue access token"})
		return
	}

	if newRefresh != "" {
		h.setCookie(c, refreshTokenCookieName, newRefresh, h.cfg.RefreshTokenTTLHour*3600)
	}
	c.JSON(http.StatusOK, gin.H{
		"access_token": accessToken,
		"token_type":   "Bearer",
		"expires_at":   expiresAt.UTC().Format(time.RFC3339),
		"user":         gin.H{"id": user.ID, "email": user.Email, "name": user.Name},
	})
}

// Logout handles user logout
func (h *AuthHandler) Logout(c *gin.Context) {
	rawRefreshToken, _ := c.Cookie(refreshTokenCookieName)
	if rawRefreshToken != "" {
		_ = h.auth.RevokeRefreshToken(c.Request.Context(), rawRefreshToken)
	}
	h.clearCookie(c, refreshTokenCookieName)
	c.Status(http.StatusNoContent)
}

// Me returns current user info
func (h *AuthHandler) Me(c *gin.Context) {
	claims, ok := middleware.GetAccessClaims(c)
	if !ok || claims.Subject == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing claims"})
		return
	}

	user, err := h.auth.GetUserByID(c.Request.Context(), claims.Subject)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":             user.ID,
		"email":          user.Email,
		"name":           user.Name,
		"avatar_url":     user.AvatarURL,
		"email_verified": user.EmailVerified,
	})
}

// SyncAfterLogin performs mandatory LMS sync after login
func (h *AuthHandler) SyncAfterLogin(c *gin.Context) {
	userID, ok := authenticatedUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	ctx := c.Request.Context()

	var user models.User
	if err := h.db.WithContext(ctx).Where("id = ?", userID).First(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch user"})
		return
	}

	providers := h.calendarH.getEnabledProviders(&user)
	if len(providers) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"synced":  false,
			"message": "no_lms_configured",
			"reason":  "Silakan hubungkan Moodle atau Google Classroom di pengaturan",
		})
		return
	}

	result, err := h.syncUserLMS(ctx, &user, providers)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"synced": false,
			"error":  "sync_failed",
			"reason": err.Error(),
		})
		return
	}

	// Update last synced time
	now := time.Now().UTC()
	h.db.WithContext(ctx).Model(&models.User{}).Where("id = ?", user.ID).Update("lms_last_synced_at", now)

	c.JSON(http.StatusOK, gin.H{
		"synced":              true,
		"providers":           providers,
		"totalEvents":         result.TotalEvents,
		"newAssignments":      result.NewAssignments,
		"newAssignmentsCount": len(result.NewAssignments),
		"message":             fmt.Sprintf("Berhasil sinkronisasi %d tugas", result.TotalEvents),
	})
}

// syncUserLMS syncs assignments from all enabled LMS providers
func (h *AuthHandler) syncUserLMS(ctx context.Context, user *models.User, providers []string) (*loginSyncResult, error) {
	result := &loginSyncResult{
		NewAssignments: make([]loginNewAssignment, 0),
	}

	for _, provider := range providers {
		assignments, err := h.calendarH.fetchProviderAssignments(ctx, provider, user)
		if err != nil {
			continue // Skip failed providers
		}

		newAssignments, err := h.syncSvc.PersistAssignments(ctx, user.ID, provider, assignments, user.CourseAliases)
		if err != nil {
			continue
		}

		result.TotalEvents += len(assignments)
		result.NewAssignments = append(result.NewAssignments, convertToLoginAssignments(newAssignments)...)
	}

	return result, nil
}

// Helper methods

func (h *AuthHandler) validateState(c *gin.Context, state string) bool {
	cookieState, err := c.Cookie(oauthStateCookieName)
	if err != nil || cookieState == "" || cookieState != state {
		return false
	}
	h.clearCookie(c, oauthStateCookieName)
	return true
}

// hasValidRefreshToken checks if the user has a valid existing session (refresh token)
func (h *AuthHandler) hasValidRefreshToken(c *gin.Context) bool {
	rawRefreshToken, err := c.Cookie(refreshTokenCookieName)
	if err != nil || rawRefreshToken == "" {
		return false
	}

	// Check if this refresh token exists and is not revoked/expired
	return h.auth.ValidateRefreshToken(c.Request.Context(), rawRefreshToken)
}

func (h *AuthHandler) processGoogleAuth(ctx context.Context, code string) (*models.User, error) {
	token, err := h.auth.ExchangeGoogleCode(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("exchange_failed")
	}

	info, err := h.auth.FetchGoogleUser(ctx, token.AccessToken)
	if err != nil {
		return nil, fmt.Errorf("userinfo_failed")
	}

	user, err := h.auth.UpsertGoogleUser(ctx, info)
	if err != nil {
		switch {
		case errors.Is(err, auth.ErrEmailDomainNotAllowed):
			return nil, fmt.Errorf("email_domain_not_allowed")
		case errors.Is(err, auth.ErrInvalidGoogleUserInfo):
			return nil, fmt.Errorf("google_userinfo_invalid")
		case errors.Is(err, auth.ErrUserIdentityConflict):
			return nil, fmt.Errorf("user_identity_conflict")
		}
		log.Printf("oauth upsert user failed: %v", err)
		return nil, fmt.Errorf("user_upsert_failed")
	}

	if err := h.auth.UpsertGoogleTokens(ctx, user.ID, token); err != nil {
		log.Printf("oauth upsert token failed: %v", err)
		return nil, fmt.Errorf("token_upsert_failed")
	}

	return user, nil
}

func (h *AuthHandler) createAndSetRefreshToken(c *gin.Context, userID string) error {
	rawRefreshToken, err := h.auth.CreateRefreshToken(
		c.Request.Context(),
		userID,
		c.GetHeader("User-Agent"),
		c.ClientIP(),
	)
	if err != nil {
		return fmt.Errorf("refresh_create_failed")
	}

	h.setCookie(c, refreshTokenCookieName, rawRefreshToken, h.cfg.RefreshTokenTTLHour*3600)
	return nil
}

func (h *AuthHandler) mapRefreshError(err error) string {
	switch {
	case errors.Is(err, auth.ErrExpiredRefreshToken):
		return "refresh token expired"
	case errors.Is(err, auth.ErrRefreshTokenReuse):
		return "refresh token reuse detected"
	default:
		return "invalid refresh token"
	}
}

func (h *AuthHandler) setCookie(c *gin.Context, name, value string, maxAgeSeconds int) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(name, value, maxAgeSeconds, "/", h.cfg.CookieDomain, h.cfg.CookieSecure, true)
}

func (h *AuthHandler) clearCookie(c *gin.Context, name string) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(name, "", -1, "/", h.cfg.CookieDomain, h.cfg.CookieSecure, true)
}

func (h *AuthHandler) redirectError(c *gin.Context, reason string) {
	base := joinURL(h.cfg.FrontendURL, h.cfg.FrontendErrorPath)
	sep := "?"
	if strings.Contains(base, "?") {
		sep = "&"
	}
	c.Redirect(http.StatusTemporaryRedirect, base+sep+"reason="+url.QueryEscape(reason))
}

func convertToLoginAssignments(assignments []newAssignmentInfo) []loginNewAssignment {
	result := make([]loginNewAssignment, len(assignments))
	for i, a := range assignments {
		result[i] = loginNewAssignment{
			Title:    a.Title,
			Course:   a.Course,
			Deadline: a.Deadline,
			Source:   a.Source,
		}
	}
	return result
}
