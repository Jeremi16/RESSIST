package auth

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
	"github.com/jeremi16/ressist-api/internal/config"
	"github.com/jeremi16/ressist-api/internal/models"
	"github.com/jeremi16/ressist-api/internal/modules/calendar/sync"
	"github.com/jeremi16/ressist-api/internal/pkg/urlutil"
	"github.com/jeremi16/ressist-api/internal/shared/middleware"
	"gorm.io/gorm"
)

const (
	oauthStateCookieName   = "oauth_state"
	refreshTokenCookieName = "refresh_token"
)

// Re-export sync types to keep handler API compatible without duplication.
type AssignmentRecord = sync.AssignmentRecord
type NewAssignmentInfo = sync.NewAssignmentInfo

// CalendarSyncService persists assignments and returns newly created ones.
type CalendarSyncService interface {
	PersistAssignments(ctx context.Context, userID string, provider string, assignments []AssignmentRecord, courseAliasesJSON string) ([]NewAssignmentInfo, error)
	PersistAssignmentsWithoutStale(ctx context.Context, userID string, provider string, assignments []AssignmentRecord, courseAliasesJSON string) ([]NewAssignmentInfo, error)
}

// CalendarProvider abstracts LMS provider discovery and assignment fetching.
type CalendarProvider interface {
	GetEnabledProviders(user *models.User) []string
	FetchProviderAssignments(ctx context.Context, provider string, user *models.User) ([]AssignmentRecord, error)
}

// Handler handles authentication HTTP requests.
type Handler struct {
	cfg      *config.Config
	auth     *Service
	db       *gorm.DB
	syncSvc  CalendarSyncService
	calendar CalendarProvider
}

// NewHandler creates a new auth Handler. calendar may be nil and injected later via SetCalendarProvider.
func NewHandler(cfg *config.Config, authSvc *Service, db *gorm.DB, cal CalendarProvider) *Handler {
	h := &Handler{
		cfg:      cfg,
		auth:     authSvc,
		db:       db,
		calendar: cal,
	}
	h.syncSvc = sync.NewSyncService(db)
	return h
}

// SetCalendarProvider injects or replaces the calendar provider.
func (h *Handler) SetCalendarProvider(p CalendarProvider) {
	h.calendar = p
}

// SetSyncService injects or replaces the sync service.
func (h *Handler) SetSyncService(s CalendarSyncService) {
	h.syncSvc = s
}

// GoogleLogin initiates OAuth login flow.
func (h *Handler) GoogleLogin(c *gin.Context) {
	state := uuid.NewString()
	h.setCookie(c, oauthStateCookieName, state, 600)
	c.Redirect(http.StatusTemporaryRedirect, h.auth.BuildGoogleLoginURL(state, false))
}

// GoogleCallback handles OAuth callback.
func (h *Handler) GoogleCallback(c *gin.Context) {
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

	c.Redirect(http.StatusTemporaryRedirect, urlutil.Join(h.cfg.FrontendURL, h.cfg.FrontendSuccessPath))
}

// GoogleNative handles Android native sign-in (mobile-kmp).
// Body: {"server_auth_code": "..."} from GoogleSignInClient.
// No state cookie — the code itself is single-use and bound to the
// Android OAuth client. Returns Ressist tokens as JSON (no httpOnly cookie)
// because the native app can't use SameSite cookies reliably.
func (h *Handler) GoogleNative(c *gin.Context) {
	var body struct {
		ServerAuthCode string `json:"server_auth_code"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || strings.TrimSpace(body.ServerAuthCode) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "server_auth_code is required"})
		return
	}

	token, err := h.auth.ExchangeNativeCode(c.Request.Context(), strings.TrimSpace(body.ServerAuthCode))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "exchange_failed"})
		return
	}

	info, err := h.auth.FetchGoogleUser(c.Request.Context(), token.AccessToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "userinfo_failed"})
		return
	}

	user, err := h.auth.UpsertGoogleUser(c.Request.Context(), info)
	if err != nil {
		switch {
		case errors.Is(err, ErrEmailDomainNotAllowed):
			c.JSON(http.StatusForbidden, gin.H{"error": "email_domain_not_allowed"})
		case errors.Is(err, ErrInvalidGoogleUserInfo):
			c.JSON(http.StatusBadRequest, gin.H{"error": "google_userinfo_invalid"})
		case errors.Is(err, ErrUserIdentityConflict):
			c.JSON(http.StatusConflict, gin.H{"error": "user_identity_conflict"})
		default:
			log.Printf("oauth native upsert user failed: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "user_upsert_failed"})
		}
		return
	}

	if err := h.auth.UpsertGoogleTokens(c.Request.Context(), user.ID, token); err != nil {
		log.Printf("oauth native upsert token failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "token_upsert_failed"})
		return
	}

	rawRefresh, err := h.auth.CreateRefreshTokenForClient(
		c.Request.Context(), user.ID, c.GetHeader("User-Agent"), c.ClientIP(), "mobile",
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "refresh_create_failed"})
		return
	}

	accessToken, expiresAt, err := h.auth.GenerateAccessToken(*user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to issue access token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"access_token":  accessToken,
		"token_type":    "Bearer",
		"expires_at":    expiresAt.UTC().Format(time.RFC3339),
		"refresh_token": rawRefresh,
		"is_new_user":   time.Since(user.CreatedAt) < 30*time.Second,
		"user":          gin.H{"id": user.ID, "email": user.Email, "name": user.Name},
	})
}

// Refresh handles token refresh.
// Web sends the httpOnly cookie; mobile (KMP) sends X-Refresh-Token
// header or {"refresh_token": "..."} body since cookies are unreliable
// outside the browser.
func (h *Handler) Refresh(c *gin.Context) {
	rawRefreshToken, err := c.Cookie(refreshTokenCookieName)
	if err != nil || rawRefreshToken == "" {
		rawRefreshToken = strings.TrimSpace(c.GetHeader("X-Refresh-Token"))
	}
	if rawRefreshToken == "" {
		var body struct {
			RefreshToken string `json:"refresh_token"`
		}
		_ = c.ShouldBindJSON(&body)
		rawRefreshToken = strings.TrimSpace(body.RefreshToken)
	}
	if rawRefreshToken == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing refresh token"})
		return
	}

	result, err := h.auth.RotateRefreshTokenEx(
		c.Request.Context(),
		rawRefreshToken,
		c.GetHeader("User-Agent"),
		c.ClientIP(),
	)
	if err != nil {
		if !isRefreshAuthError(err) {
			// Gangguan server (DB, dll): 503 agar klien tidak menghapus sesi.
			log.Printf("[auth] refresh server error: %v", err)
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "refresh temporarily unavailable"})
			return
		}
		log.Printf("[auth] refresh failed err=%s", h.mapRefreshError(err))
		c.JSON(http.StatusUnauthorized, gin.H{"error": h.mapRefreshError(err)})
		return
	}
	user := result.User
	newRefresh := result.NewRefresh
	if !result.Rotated {
		log.Printf("[auth] refresh grace-hit user=%s client=%s", user.ID, result.Client)
	}
	// Client diambil dari record DB — tidak ditebak dari ada/tidaknya cookie.
	isMobile := result.Client == "mobile"

	accessToken, expiresAt, err := h.auth.GenerateAccessToken(*user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to issue access token"})
		return
	}

	if newRefresh != "" {
		maxAge := int(h.auth.RefreshTTLForClient(result.Client).Seconds())
		if maxAge <= 0 {
			maxAge = 72 * 3600
		}
		h.setCookie(c, refreshTokenCookieName, newRefresh, maxAge)
	}
	if result.Rotated {
		c.Header("X-Refresh-Rotated", "true")
	} else {
		c.Header("X-Refresh-Rotated", "false")
	}
	resp := gin.H{
		"access_token": accessToken,
		"token_type":   "Bearer",
		"expires_at":   expiresAt.UTC().Format(time.RFC3339),
		"user":         gin.H{"id": user.ID, "email": user.Email, "name": user.Name},
	}
	if isMobile && newRefresh != "" {
		// Mobile can't read httpOnly cookies reliably — return rotated token in body.
		resp["refresh_token"] = newRefresh
	}
	c.JSON(http.StatusOK, resp)
}

// Logout handles user logout. Accepts cookie (web) or X-Refresh-Token/body (mobile).
func (h *Handler) Logout(c *gin.Context) {
	rawRefreshToken, _ := c.Cookie(refreshTokenCookieName)
	if rawRefreshToken == "" {
		rawRefreshToken = strings.TrimSpace(c.GetHeader("X-Refresh-Token"))
	}
	if rawRefreshToken == "" {
		var body struct {
			RefreshToken string `json:"refresh_token"`
		}
		_ = c.ShouldBindJSON(&body)
		rawRefreshToken = strings.TrimSpace(body.RefreshToken)
	}
	if rawRefreshToken != "" {
		if err := h.auth.RevokeRefreshToken(c.Request.Context(), rawRefreshToken); err != nil {
			log.Printf("[auth] logout revoke failed: %v", err)
		}
	}
	h.clearCookie(c, refreshTokenCookieName)
	c.Status(http.StatusNoContent)
}

// Me returns current user info.
func (h *Handler) Me(c *gin.Context) {
	claims, ok := middleware.GetAccessClaims(c)
	if !ok || claims.Subject == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing claims"})
		return
	}

	user, err := h.auth.GetUserByID(c.Request.Context(), claims.Subject)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
			return
		}
		log.Printf("[auth] me lookup failed: %v", err)
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "temporarily unavailable"})
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

// SyncAfterLogin performs mandatory LMS sync after login.
func (h *Handler) SyncAfterLogin(c *gin.Context) {
	userID, ok := middleware.AuthenticatedUserID(c)
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

	if h.calendar == nil {
		c.JSON(http.StatusOK, gin.H{
			"synced":  false,
			"message": "no_lms_configured",
			"reason":  "Silakan hubungkan Moodle atau Google Classroom di pengaturan",
		})
		return
	}

	providers := h.calendar.GetEnabledProviders(&user)
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

	// Per-provider timestamps updated inside syncUserLMS; keep global for compat only if at least one succeeded
	if result.TotalEvents > 0 || len(result.NewAssignments) > 0 {
		now := time.Now().UTC()
		h.db.WithContext(ctx).Model(&models.User{}).Where("id = ?", user.ID).Update("lms_last_synced_at", now)
	}

	c.JSON(http.StatusOK, gin.H{
		"synced":              true,
		"providers":           providers,
		"totalEvents":         result.TotalEvents,
		"newAssignments":      result.NewAssignments,
		"newAssignmentsCount": len(result.NewAssignments),
		"message":             fmt.Sprintf("Berhasil sinkronisasi %d tugas", result.TotalEvents),
	})
}

// syncUserLMS syncs assignments from all enabled LMS providers.
func (h *Handler) syncUserLMS(ctx context.Context, user *models.User, providers []string) (*loginSyncResult, error) {
	result := &loginSyncResult{
		NewAssignments: make([]loginNewAssignment, 0),
	}
	successPerProvider := make(map[string]bool)
	for _, provider := range providers {
		assignments, err := h.calendar.FetchProviderAssignments(ctx, provider, user)
		var partial *sync.PartialFetchError
		isPartial := errors.As(err, &partial)
		if err != nil && !isPartial {
			log.Printf("[auth] FetchProviderAssignments failed provider=%s user=%s err=%v", provider, user.ID, err)
			continue
		}
		if isPartial && partial != nil {
			assignments = partial.Assignments
			log.Printf("[auth] partial fetch provider=%s user=%s kept=%d failedCourses=%v",
				provider, user.ID, len(assignments), partial.FailedCourses)
		}

		if h.syncSvc == nil {
			result.TotalEvents += len(assignments)
			successPerProvider[provider] = true
			continue
		}

		var newAssignments []sync.NewAssignmentInfo
		if isPartial {
			newAssignments, err = h.syncSvc.PersistAssignmentsWithoutStale(ctx, user.ID, provider, assignments, user.CourseAliases)
		} else {
			newAssignments, err = h.syncSvc.PersistAssignments(ctx, user.ID, provider, assignments, user.CourseAliases)
		}
		if err != nil {
			log.Printf("[auth] PersistAssignments failed provider=%s user=%s err=%v", provider, user.ID, err)
			continue
		}

		result.TotalEvents += len(assignments)
		result.NewAssignments = append(result.NewAssignments, convertToLoginAssignments(newAssignments)...)
		successPerProvider[provider] = true
	}

	// Update per-provider timestamps
	if len(successPerProvider) > 0 {
		now := time.Now().UTC()
		updates := make(map[string]interface{})
		if successPerProvider["moodle"] {
			updates["moodle_last_synced_at"] = now
		}
		if successPerProvider["google_classroom"] {
			updates["google_classroom_last_synced_at"] = now
		}
		if len(updates) > 0 {
			updates["lms_last_synced_at"] = now
			if err := h.db.WithContext(ctx).Model(&models.User{}).Where("id = ?", user.ID).Updates(updates).Error; err != nil {
				log.Printf("[auth] failed to update per-provider timestamps user=%s err=%v", user.ID, err)
			}
		}
	}

	return result, nil
}

// Helper methods

func (h *Handler) validateState(c *gin.Context, state string) bool {
	cookieState, err := c.Cookie(oauthStateCookieName)
	if err != nil || cookieState == "" || cookieState != state {
		return false
	}
	h.clearCookie(c, oauthStateCookieName)
	return true
}

func (h *Handler) processGoogleAuth(ctx context.Context, code string) (*models.User, error) {
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
		case errors.Is(err, ErrEmailDomainNotAllowed):
			return nil, fmt.Errorf("email_domain_not_allowed")
		case errors.Is(err, ErrInvalidGoogleUserInfo):
			return nil, fmt.Errorf("google_userinfo_invalid")
		case errors.Is(err, ErrUserIdentityConflict):
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

func (h *Handler) createAndSetRefreshToken(c *gin.Context, userID string) error {
	rawRefreshToken, err := h.auth.CreateRefreshToken(
		c.Request.Context(),
		userID,
		c.GetHeader("User-Agent"),
		c.ClientIP(),
	)
	if err != nil {
		return fmt.Errorf("refresh_create_failed")
	}

	h.setCookie(c, refreshTokenCookieName, rawRefreshToken, h.webRefreshMaxAge())
	return nil
}

// webRefreshMaxAge returns the web cookie maxAge derived from the same TTL
// the service uses for DB expiry, so cookie and record expire together.
func (h *Handler) webRefreshMaxAge() int {
	maxAge := int(h.auth.RefreshTTLForClient("web").Seconds())
	if maxAge <= 0 {
		maxAge = 72 * 3600
	}
	return maxAge
}

// isRefreshAuthError: hanya error ini yang berarti sesi benar-benar mati (401).
func isRefreshAuthError(err error) bool {
	return errors.Is(err, ErrInvalidRefreshToken) ||
		errors.Is(err, ErrExpiredRefreshToken) ||
		errors.Is(err, ErrRefreshTokenReuse)
}

func (h *Handler) mapRefreshError(err error) string {
	switch {
	case errors.Is(err, ErrExpiredRefreshToken):
		return "refresh token expired"
	case errors.Is(err, ErrRefreshTokenReuse):
		return "refresh token reuse detected"
	default:
		return "invalid refresh token"
	}
}

func (h *Handler) setCookie(c *gin.Context, name, value string, maxAgeSeconds int) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(name, value, maxAgeSeconds, "/", h.cfg.CookieDomain, h.cfg.CookieSecure, true)
}

func (h *Handler) clearCookie(c *gin.Context, name string) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(name, "", -1, "/", h.cfg.CookieDomain, h.cfg.CookieSecure, true)
}

func (h *Handler) redirectError(c *gin.Context, reason string) {
	base := urlutil.Join(h.cfg.FrontendURL, h.cfg.FrontendErrorPath)
	sep := "?"
	if strings.Contains(base, "?") {
		sep = "&"
	}
	c.Redirect(http.StatusTemporaryRedirect, base+sep+"reason="+url.QueryEscape(reason))
}

func convertToLoginAssignments(assignments []NewAssignmentInfo) []loginNewAssignment {
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

// loginSyncResult and loginNewAssignment are local DTOs mirroring handlers/types.go.

type loginSyncResult struct {
	TotalEvents    int                  `json:"total_events"`
	NewAssignments []loginNewAssignment `json:"new_assignments"`
}

type loginNewAssignment struct {
	Title    string    `json:"title"`
	Course   string    `json:"course"`
	Deadline time.Time `json:"deadline"`
	Source   string    `json:"source"`
}


