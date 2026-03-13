package handlers

import (
	"errors"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jeremi16/resisst-api/internal/auth"
	"github.com/jeremi16/resisst-api/internal/config"
	"github.com/jeremi16/resisst-api/internal/http/middleware"
)

const (
	oauthStateCookieName   = "oauth_state"
	refreshTokenCookieName = "refresh_token"
)

type AuthHandler struct {
	cfg  *config.Config
	auth *auth.Service
}

func NewAuthHandler(cfg *config.Config, authSvc *auth.Service) *AuthHandler {
	return &AuthHandler{cfg: cfg, auth: authSvc}
}

func (h *AuthHandler) GoogleLogin(c *gin.Context) {
	state := uuid.NewString()
	h.setCookie(c, oauthStateCookieName, state, 600)
	c.Redirect(http.StatusTemporaryRedirect, h.auth.BuildGoogleLoginURL(state))
}

func (h *AuthHandler) GoogleCallback(c *gin.Context) {
	if c.Query("error") != "" {
		h.redirectError(c, "oauth_denied")
		return
	}

	code := strings.TrimSpace(c.Query("code"))
	state := strings.TrimSpace(c.Query("state"))
	if code == "" || state == "" {
		h.redirectError(c, "missing_code_or_state")
		return
	}

	cookieState, err := c.Cookie(oauthStateCookieName)
	if err != nil || cookieState == "" || cookieState != state {
		h.redirectError(c, "state_mismatch")
		return
	}
	h.clearCookie(c, oauthStateCookieName)

	token, err := h.auth.ExchangeGoogleCode(c.Request.Context(), code)
	if err != nil {
		h.redirectError(c, "exchange_failed")
		return
	}

	info, err := h.auth.FetchGoogleUser(c.Request.Context(), token.AccessToken)
	if err != nil {
		h.redirectError(c, "userinfo_failed")
		return
	}

	user, err := h.auth.UpsertGoogleUser(c.Request.Context(), info)
	if err != nil {
		h.redirectError(c, "user_upsert_failed")
		return
	}
	if err := h.auth.UpsertGoogleTokens(c.Request.Context(), user.ID, token); err != nil {
		h.redirectError(c, "token_upsert_failed")
		return
	}

	rawRefreshToken, err := h.auth.CreateRefreshToken(
		c.Request.Context(),
		user.ID,
		c.GetHeader("User-Agent"),
		c.ClientIP(),
	)
	if err != nil {
		h.redirectError(c, "refresh_create_failed")
		return
	}

	h.setCookie(c, refreshTokenCookieName, rawRefreshToken, h.cfg.RefreshTokenTTLHour*3600)
	c.Redirect(http.StatusTemporaryRedirect, joinURL(h.cfg.FrontendURL, h.cfg.FrontendSuccessPath))
}

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
		message := "invalid refresh token"
		if errors.Is(err, auth.ErrExpiredRefreshToken) {
			message = "refresh token expired"
		} else if errors.Is(err, auth.ErrRefreshTokenReuse) {
			message = "refresh token reuse detected"
		}
		c.JSON(http.StatusUnauthorized, gin.H{"error": message})
		return
	}

	accessToken, expiresAt, err := h.auth.GenerateAccessToken(*user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to issue access token"})
		return
	}

	h.setCookie(c, refreshTokenCookieName, newRefresh, h.cfg.RefreshTokenTTLHour*3600)
	c.JSON(http.StatusOK, gin.H{
		"access_token": accessToken,
		"token_type":   "Bearer",
		"expires_at":   expiresAt.UTC().Format(time.RFC3339),
		"user": gin.H{
			"id":    user.ID,
			"email": user.Email,
			"name":  user.Name,
		},
	})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	rawRefreshToken, _ := c.Cookie(refreshTokenCookieName)
	if rawRefreshToken != "" {
		_ = h.auth.RevokeRefreshToken(c.Request.Context(), rawRefreshToken)
	}

	h.clearCookie(c, refreshTokenCookieName)
	c.Status(http.StatusNoContent)
}

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

func (h *AuthHandler) setCookie(c *gin.Context, name string, value string, maxAgeSeconds int) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(
		name,
		value,
		maxAgeSeconds,
		"/",
		h.cfg.CookieDomain,
		h.cfg.CookieSecure,
		true,
	)
}

func (h *AuthHandler) clearCookie(c *gin.Context, name string) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(
		name,
		"",
		-1,
		"/",
		h.cfg.CookieDomain,
		h.cfg.CookieSecure,
		true,
	)
}

func (h *AuthHandler) redirectError(c *gin.Context, reason string) {
	base := joinURL(h.cfg.FrontendURL, h.cfg.FrontendErrorPath)
	target := base
	if strings.Contains(base, "?") {
		target = base + "&reason=" + url.QueryEscape(reason)
	} else {
		target = base + "?reason=" + url.QueryEscape(reason)
	}
	c.Redirect(http.StatusTemporaryRedirect, target)
}

func joinURL(base string, path string) string {
	trimmedBase := strings.TrimRight(strings.TrimSpace(base), "/")
	trimmedPath := strings.TrimSpace(path)
	if trimmedPath == "" {
		return trimmedBase
	}
	if !strings.HasPrefix(trimmedPath, "/") {
		trimmedPath = "/" + trimmedPath
	}
	return trimmedBase + trimmedPath
}
