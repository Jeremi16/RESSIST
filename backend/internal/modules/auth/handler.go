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
	"github.com/jeremi16/resisst-api/internal/config"
	"github.com/jeremi16/resisst-api/internal/models"
	"github.com/jeremi16/resisst-api/internal/modules/calendar/sync"
	"github.com/jeremi16/resisst-api/internal/pkg/coursealias"
	"github.com/jeremi16/resisst-api/internal/pkg/text"
	"github.com/jeremi16/resisst-api/internal/pkg/urlutil"
	"github.com/jeremi16/resisst-api/internal/shared/middleware"
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
	h.syncSvc = newSyncService(db)
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

// Refresh handles token refresh.
func (h *Handler) Refresh(c *gin.Context) {
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

// Logout handles user logout.
func (h *Handler) Logout(c *gin.Context) {
	rawRefreshToken, _ := c.Cookie(refreshTokenCookieName)
	if rawRefreshToken != "" {
		_ = h.auth.RevokeRefreshToken(c.Request.Context(), rawRefreshToken)
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

// syncUserLMS syncs assignments from all enabled LMS providers.
func (h *Handler) syncUserLMS(ctx context.Context, user *models.User, providers []string) (*loginSyncResult, error) {
	result := &loginSyncResult{
		NewAssignments: make([]loginNewAssignment, 0),
	}

	for _, provider := range providers {
		assignments, err := h.calendar.FetchProviderAssignments(ctx, provider, user)
		if err != nil {
			continue
		}

		if h.syncSvc == nil {
			result.TotalEvents += len(assignments)
			continue
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

	h.setCookie(c, refreshTokenCookieName, rawRefreshToken, h.cfg.RefreshTokenTTLHour*3600)
	return nil
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

// ---------------------------------------------------------------------------
// syncService is the default CalendarSyncService implementation.
// It is intentionally kept inside the auth package to avoid import cycles.
// ---------------------------------------------------------------------------

type syncService struct {
	db *gorm.DB
}

func newSyncService(db *gorm.DB) CalendarSyncService {
	return &syncService{db: db}
}

func (s *syncService) PersistAssignments(ctx context.Context, userID string, provider string, assignments []AssignmentRecord, courseAliasesJSON string) ([]NewAssignmentInfo, error) {
	now := time.Now().UTC()
	assignmentsByKey := buildAssignmentsByKey(assignments, provider)
	keys := getAssignmentKeys(assignmentsByKey)
	aliases := coursealias.Parse(courseAliasesJSON)
	newAssignments := make([]NewAssignmentInfo, 0)

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, key := range keys {
			assignment := assignmentsByKey[key]
			originalCourse := assignment.Course
			if strings.TrimSpace(originalCourse) == "" {
				originalCourse = "Unknown Course"
			}

			var course models.Course
			if err := tx.Where("name = ?", originalCourse).FirstOrCreate(&course, models.Course{Name: originalCourse}).Error; err != nil {
				return err
			}
			courseIDValue := text.NullableStringPointer(course.ID)
			courseValue := text.NullableStringPointer(coursealias.Apply(assignment.Course, aliases))
			sourceIDValue := text.NullableStringPointer(assignment.ExternalID)

			var existing models.Event
			err := tx.Where("user_id = ? AND sync_key = ?", userID, key).First(&existing).Error
			if err != nil {
				if !errors.Is(err, gorm.ErrRecordNotFound) {
					return err
				}
				if err := s.createAssignment(tx, assignment, userID, provider, key, courseValue, sourceIDValue, courseIDValue); err != nil {
					return err
				}
				newAssignments = append(newAssignments, NewAssignmentInfo{
					Title:    assignment.Title,
					Course:   text.Dereference(courseValue, "Unknown Course"),
					Deadline: assignment.Deadline.UTC(),
					Source:   provider,
				})
				continue
			}

			if s.needsUpdate(&existing, assignment, courseValue, sourceIDValue, courseIDValue) {
				if err := s.updateAssignment(tx, existing.ID, assignment, provider, courseValue, sourceIDValue, courseIDValue); err != nil {
					return err
				}
			}
		}

		return s.markStaleAsCompleted(tx, userID, provider, keys, now)
	})

	if err != nil {
		return nil, err
	}
	return newAssignments, nil
}

func buildAssignmentsByKey(assignments []AssignmentRecord, provider string) map[string]AssignmentRecord {
	result := make(map[string]AssignmentRecord, len(assignments))
	for _, assignment := range assignments {
		key := buildAssignmentSyncKey(provider, assignment.ExternalID, assignment.Course, assignment.Title)
		result[key] = assignment
	}
	return result
}

func getAssignmentKeys(assignments map[string]AssignmentRecord) []string {
	keys := make([]string, 0, len(assignments))
	for key := range assignments {
		keys = append(keys, key)
	}
	return keys
}

func (s *syncService) createAssignment(tx *gorm.DB, assignment AssignmentRecord, userID, provider, key string, courseValue, sourceIDValue, courseIDValue *string) error {
	event := models.Event{
		ID:              uuid.NewString(),
		UserID:          userID,
		Title:           assignment.Title,
		Course:          courseValue,
		CourseID:        courseIDValue,
		ClassCode:       assignment.ClassCode,
		Description:     assignment.Description,
		URL:             assignment.URL,
		Deadline:        assignment.Deadline.UTC(),
		Source:          provider,
		SourceID:        sourceIDValue,
		SyncKey:         key,
		Reminder24HSent: false,
		RemindersSent:   "[]",
	}
	return tx.Create(&event).Error
}

func (s *syncService) updateAssignment(tx *gorm.DB, eventID string, assignment AssignmentRecord, provider string, courseValue, sourceIDValue, courseIDValue *string) error {
	updateData := map[string]interface{}{
		"title":       assignment.Title,
		"course":      courseValue,
		"course_id":   courseIDValue,
		"class_code":  assignment.ClassCode,
		"description": assignment.Description,
		"url":         assignment.URL,
		"deadline":    assignment.Deadline.UTC(),
		"source":      provider,
		"source_id":   sourceIDValue,
	}
	return tx.Model(&models.Event{}).Where("id = ?", eventID).Updates(updateData).Error
}

func (s *syncService) needsUpdate(existing *models.Event, assignment AssignmentRecord, courseValue, sourceIDValue, courseIDValue *string) bool {
	if existing.Title != assignment.Title {
		return true
	}
	if !stringsEqual(existing.Course, courseValue) {
		return true
	}
	if !stringsEqual(existing.CourseID, courseIDValue) {
		return true
	}
	if !stringsEqual(existing.ClassCode, assignment.ClassCode) {
		return true
	}
	if !stringsEqual(existing.Description, assignment.Description) {
		return true
	}
	if !stringsEqual(existing.URL, assignment.URL) {
		return true
	}
	if !existing.Deadline.Truncate(time.Second).Equal(assignment.Deadline.UTC().Truncate(time.Second)) {
		return true
	}
	if !stringsEqual(existing.SourceID, sourceIDValue) {
		return true
	}
	return false
}

func (s *syncService) markStaleAsCompleted(tx *gorm.DB, userID, provider string, keys []string, now time.Time) error {
	query := tx.Model(&models.Event{}).
		Where("user_id = ? AND source = ? AND deadline > ? AND (completed IS NULL OR completed = ?)", userID, provider, now, false)
	if len(keys) > 0 {
		query = query.Where("sync_key NOT IN ?", keys)
	}
	return query.Updates(map[string]interface{}{
		"completed":    true,
		"completed_at": now,
		"updated_at":   now,
	}).Error
}

func (s *syncService) deleteStaleAssignments(tx *gorm.DB, userID, provider string, keys []string, now time.Time) error {
	return s.markStaleAsCompleted(tx, userID, provider, keys, now)
}

func stringsEqual(a, b *string) bool {
	aval := ""
	bval := ""
	if a != nil {
		aval = *a
	}
	if b != nil {
		bval = *b
	}
	return aval == bval
}

func buildAssignmentSyncKey(provider, externalID, course, title string) string {
	if strings.TrimSpace(externalID) != "" {
		return provider + ":" + strings.TrimSpace(externalID)
	}
	return provider + ":" + text.Normalize(course) + ":" + text.Normalize(title)
}
