package calendar

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jeremi16/ressist-api/internal/config"
	"github.com/jeremi16/ressist-api/internal/models"
	"github.com/jeremi16/ressist-api/internal/modules/calendar/google"
	"github.com/jeremi16/ressist-api/internal/modules/calendar/ics"
	"github.com/jeremi16/ressist-api/internal/modules/calendar/moodle"
	"github.com/jeremi16/ressist-api/internal/modules/calendar/sync"
	"github.com/jeremi16/ressist-api/internal/pkg/classcode"
	"github.com/jeremi16/ressist-api/internal/pkg/coursealias"
	"github.com/jeremi16/ressist-api/internal/pkg/sortutil"
	"github.com/jeremi16/ressist-api/internal/pkg/text"
	"github.com/jeremi16/ressist-api/internal/shared/middleware"
	"gorm.io/gorm"
)

const (
	upcomingWindowDays = 60
	syncCooldown       = time.Hour
)

// Handler handles calendar HTTP requests. Renamed from CalendarHandler.
type Handler struct {
	db           *gorm.DB
	cfg          *config.Config
	syncSvc      *sync.SyncService
	googleClient *google.Client
	moodleClient *moodle.Client
	svc          *Service
}

// NewHandler creates a new Handler.
func NewHandler(db *gorm.DB, cfg *config.Config) *Handler {
	return &Handler{
		db:           db,
		cfg:          cfg,
		syncSvc:      sync.NewSyncService(db),
		googleClient: google.New(db, cfg),
		moodleClient: moodle.New(),
		svc:          NewService(db, cfg),
	}
}

// NewHandlerWithService creates a Handler with injected Service (for testing).
func NewHandlerWithService(db *gorm.DB, cfg *config.Config, svc *Service) *Handler {
	return &Handler{
		db:           db,
		cfg:          cfg,
		syncSvc:      svc.SyncService(),
		googleClient: svc.GoogleClient(),
		moodleClient: svc.MoodleClient(),
		svc:          svc,
	}
}

// GetRaw returns raw Moodle ICS for debugging parser (Opsi A).
func (h *Handler) GetRaw(c *gin.Context) {
	userID, ok := middleware.AuthenticatedUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	user, err := h.findUser(c, userID)
	if err != nil {
		h.respondUserLookupError(c, err)
		return
	}
	if user.MoodleCalendarURL == nil || text.Dereference(user.MoodleCalendarURL, "") == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "moodle calendar URL not configured"})
		return
	}
	raw, err := h.moodleClient.FetchMoodleCalendar(c.Request.Context(), *user.MoodleCalendarURL)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to fetch moodle calendar", "details": err.Error()})
		return
	}
	// Also parse to count, for quick sanity
	parsed := ics.ParseMoodleICS(raw)
	c.Header("X-Event-Count", strconv.Itoa(len(parsed)))
	c.Data(http.StatusOK, "text/calendar; charset=utf-8", []byte(raw))
}

// GetPreview returns calendar preview (cached or fresh).
func (h *Handler) GetPreview(c *gin.Context) {
	userID, ok := middleware.AuthenticatedUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	user, err := h.findUser(c, userID)
	if err != nil {
		h.respondUserLookupError(c, err)
		return
	}

	providers := h.getEnabledProviders(user)
	forceRefresh := c.Query("force") == "true"
	sortBy := sortutil.Parse(c.Query("sort"))

	if forceRefresh {
		response, err := h.syncAndBuildResponse(c, user, providers, sortBy)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to refresh calendar preview"})
			return
		}
		c.JSON(http.StatusOK, response)
		return
	}

	response, err := h.buildResponse(c, user, providers, nil, true, sortBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch calendar preview"})
		return
	}
	c.JSON(http.StatusOK, response)
}

// TestPreview tests LMS sources without caching.
func (h *Handler) TestPreview(c *gin.Context) {
	userID, ok := middleware.AuthenticatedUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req calendarTestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	user, err := h.findUser(c, userID)
	if err != nil {
		h.respondUserLookupError(c, err)
		return
	}

	providers := h.getTestProviders(user, req)
	if len(providers) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No LMS source configured for testing"})
		return
	}

	sortBy := sortutil.Parse(c.Query("sort"))
	response, err := h.syncAndBuildResponse(c, user, providers, sortBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to test calendar"})
		return
	}
	c.JSON(http.StatusOK, response)
}

// syncAndBuildResponse syncs data and builds response.
func (h *Handler) syncAndBuildResponse(c *gin.Context, user *models.User, providers []string, sortBy string) (gin.H, error) {
	if len(providers) == 0 {
		return h.buildResponse(c, user, providers, nil, true, sortBy)
	}

	sourceInfo, newAssignments, successfulSources, failedSources := h.syncProviders(c.Request.Context(), user, providers)
	fromCache := successfulSources == 0

	// Per-provider timestamps are now updated inside Service.SyncProviders.
	// Keep in-memory user timestamps in sync for response.
	if successfulSources > 0 {
		now := time.Now().UTC()
		// Refresh user timestamps from DB or set locally
		if h.svc == nil {
			// Fallback path: update per-provider here
			updates := make(map[string]interface{})
			// Determine which providers succeeded from sourceInfo
			for _, si := range sourceInfo {
				if si.Success {
					if si.Provider == "moodle" {
						updates["moodle_last_synced_at"] = now
					}
					if si.Provider == "google_classroom" {
						updates["google_classroom_last_synced_at"] = now
					}
				}
			}
			if len(updates) > 0 {
				updates["lms_last_synced_at"] = now
				h.db.WithContext(c.Request.Context()).Model(&models.User{}).Where("id = ?", user.ID).Updates(updates)
			}
		}
		user.LMSLastSyncedAt = &now
	}

	response, err := h.buildResponse(c, user, providers, sourceInfo, fromCache, sortBy)
	if err != nil {
		return nil, err
	}

	response["successfulSources"] = successfulSources
	response["failedSources"] = failedSources
	response["newAssignments"] = newAssignments
	response["newAssignmentsCount"] = len(newAssignments)
	return response, nil
}

// syncProviders syncs data from all providers. Delegates to Service if available.
func (h *Handler) syncProviders(ctx context.Context, user *models.User, providers []string) ([]calendarSourceInfo, []newAssignmentInfo, int, int) {
	if h.svc != nil {
		return h.svc.SyncProviders(ctx, user, providers)
	}
	// Fallback: manual sync using clients and syncSvc
	sourceInfo := make([]calendarSourceInfo, 0, len(providers))
	newAssignments := make([]newAssignmentInfo, 0)
	successfulSources := 0
	failedSources := 0
	allClassCodes := make(map[string]bool)

	for _, provider := range providers {
		assignments, err := h.fetchProviderAssignments(ctx, provider, user)
		if err != nil {
			sourceInfo = append(sourceInfo, calendarSourceInfo{Provider: provider, Count: 0, Success: false})
			failedSources++
			continue
		}

		for _, assignment := range assignments {
			if assignment.ClassCode != nil && *assignment.ClassCode != "" {
				allClassCodes[*assignment.ClassCode] = true
			}
		}

		newForProvider, err := h.syncSvc.PersistAssignments(ctx, user.ID, provider, assignments, user.CourseAliases)
		if err != nil {
			sourceInfo = append(sourceInfo, calendarSourceInfo{Provider: provider, Count: 0, Success: false})
			failedSources++
			continue
		}

		for _, n := range newForProvider {
			newAssignments = append(newAssignments, newAssignmentInfo{
				Title:    n.Title,
				Course:   n.Course,
				Deadline: n.Deadline,
				Source:   n.Source,
			})
		}
		sourceInfo = append(sourceInfo, calendarSourceInfo{Provider: provider, Count: len(assignments), Success: true})
		successfulSources++
	}

	if successfulSources > 0 && len(allClassCodes) > 0 {
		h.updateUserAvailableClassCodes(ctx, user.ID, allClassCodes)
	}

	return sourceInfo, newAssignments, successfulSources, failedSources
}

// fetchProviderAssignments fetches assignments from the specified provider using modular clients.
func (h *Handler) fetchProviderAssignments(ctx context.Context, provider string, user *models.User) ([]sync.AssignmentRecord, error) {
	switch provider {
	case "moodle":
		records, err := h.moodleClient.FetchMoodleAssignments(ctx, user)
		if err != nil {
			return nil, err
		}
		out := make([]sync.AssignmentRecord, len(records))
		for i, r := range records {
			out[i] = sync.AssignmentRecord{
				Title:       r.Title,
				Course:      r.Course,
				ClassCode:   r.ClassCode,
				Description: r.Description,
				URL:         r.URL,
				Deadline:    r.Deadline,
				ExternalID:  r.ExternalID,
				Source:      r.Source,
			}
		}
		return out, nil
	case "google_classroom":
		records, err := h.googleClient.FetchGoogleClassroomAssignments(ctx, user)
		if err != nil {
			return nil, err
		}
		out := make([]sync.AssignmentRecord, len(records))
		for i, r := range records {
			out[i] = sync.AssignmentRecord{
				Title:       r.Title,
				Course:      r.Course,
				ClassCode:   r.ClassCode,
				Description: r.Description,
				URL:         r.URL,
				Deadline:    r.Deadline,
				ExternalID:  r.ExternalID,
				Source:      r.Source,
			}
		}
		return out, nil
	default:
		return nil, errors.New("unsupported provider: " + provider)
	}
}

// updateUserAvailableClassCodes updates the user's available class codes.
func (h *Handler) updateUserAvailableClassCodes(ctx context.Context, userID string, newClassCodes map[string]bool) {
	var user models.User
	if err := h.db.WithContext(ctx).Where("id = ?", userID).First(&user).Error; err != nil {
		return
	}

	existingCodes := make(map[string]bool)
	if user.AvailableClassCodes != "" && user.AvailableClassCodes != "[]" {
		codes := classcode.ParseArray(user.AvailableClassCodes)
		for _, code := range codes {
			existingCodes[code] = true
		}
	}

	merged := false
	for code := range newClassCodes {
		if !existingCodes[code] {
			existingCodes[code] = true
			merged = true
		}
	}

	if merged {
		codes := make([]string, 0, len(existingCodes))
		for code := range existingCodes {
			codes = append(codes, code)
		}
		jsonCodes := classcode.ToJSON(codes)
		h.db.WithContext(ctx).Model(&models.User{}).Where("id = ?", userID).Update("available_class_codes", jsonCodes)
	}
}

// buildResponse builds the calendar response.
func (h *Handler) buildResponse(c *gin.Context, user *models.User, providers []string, sourceInfoOverride []calendarSourceInfo, fromCache bool, sortBy string) (gin.H, error) {
	events, err := h.loadCachedEvents(c, user.ID, providers, sortBy)
	if err != nil {
		return nil, err
	}

	// Filter tasks
	events = classcode.Filter(events, user.MutedCourses, user.ClassCode, user.CourseKeywordFilters)

	// Parse course aliases and apply them to previews
	aliases := coursealias.Parse(user.CourseAliases)
	previews := h.convertEventsToPreviews(events, aliases)
	sourceInfo := h.buildSourceInfo(providers, events, sourceInfoOverride)
	nextRefreshAt := h.calculateNextRefreshAt(user)

	return gin.H{
		"events":            previews,
		"sources":           sourceInfo,
		"total":             len(previews),
		"successfulSources": len(sourceInfo),
		"failedSources":     0,
		"fromCache":         fromCache,
		"sortBy":            sortBy,
		"lastSyncedAt":      user.LMSLastSyncedAt,
		"nextRefreshAt":     nextRefreshAt,
	}, nil
}

// convertEventsToPreviews converts Event models to preview structs.
func (h *Handler) convertEventsToPreviews(events []models.Event, aliases map[string]string) []calendarEventPreview {
	previews := make([]calendarEventPreview, 0, len(events))
	for _, event := range events {
		originalCourse := text.Dereference(event.Course, "Unknown Course")
		course := coursealias.Apply(originalCourse, aliases)
		previews = append(previews, calendarEventPreview{
			ID:             event.ID,
			Title:          event.Title,
			FullTitle:      event.Title,
			Course:         course,
			OriginalCourse: originalCourse,
			CourseID:       event.CourseID,
			ClassCode:      event.ClassCode,
			Description:    event.Description,
			URL:            event.URL,
			Deadline:       event.Deadline.UTC().Format(time.RFC3339),
			TimeRemaining:  formatTimeRemaining(event.Deadline),
			DeadlineDate:   event.Deadline,
			Source:         event.Source,
			Completed:      event.Completed,
			CompletedAt:    event.CompletedAt,
		})
	}
	return previews
}

// buildSourceInfo builds source info list.
func (h *Handler) buildSourceInfo(providers []string, events []models.Event, override []calendarSourceInfo) []calendarSourceInfo {
	if override != nil {
		return override
	}

	sourceInfo := make([]calendarSourceInfo, 0, len(providers))
	for _, provider := range providers {
		count := 0
		for _, event := range events {
			if event.Source == provider {
				count++
			}
		}
		sourceInfo = append(sourceInfo, calendarSourceInfo{Provider: provider, Count: count, Success: true})
	}
	return sourceInfo
}

// calculateNextRefreshAt calculates when next refresh is allowed.
func (h *Handler) calculateNextRefreshAt(user *models.User) *time.Time {
	if user.LMSLastSyncedAt == nil {
		return nil
	}
	next := user.LMSLastSyncedAt.Add(syncCooldown)
	return &next
}

// loadCachedEvents loads events from database. Excludes completed tasks so calendar mirrors Moodle (done tasks disappear).
func (h *Handler) loadCachedEvents(c *gin.Context, userID string, providers []string, sortBy string) ([]models.Event, error) {
	if len(providers) == 0 {
		return []models.Event{}, nil
	}

	now := time.Now()
	cutoff := now.Add(time.Hour * 24 * upcomingWindowDays)

	var events []models.Event
	err := h.db.WithContext(c.Request.Context()).
		Where("user_id = ? AND source IN ? AND deadline > ? AND deadline <= ? AND (completed IS NULL OR completed = ?)", userID, providers, now, cutoff, false).
		Order(sortutil.OrderClause(sortBy)).
		Find(&events).Error
	if err != nil {
		return nil, err
	}
	return events, nil
}

// getEnabledProviders returns enabled LMS providers for a user.
func (h *Handler) getEnabledProviders(user *models.User) []string {
	if h.svc != nil {
		return h.svc.GetEnabledProviders(user)
	}
	providers := make([]string, 0, 2)
	if user.MoodleEnabled && user.MoodleCalendarURL != nil && text.Dereference(user.MoodleCalendarURL, "") != "" {
		providers = append(providers, "moodle")
	}
	if user.GoogleClassroomEnabled && user.GoogleAccessToken != nil && text.Dereference(user.GoogleAccessToken, "") != "" {
		providers = append(providers, "google_classroom")
	}
	return providers
}

// getTestProviders returns providers for testing based on request.
func (h *Handler) getTestProviders(user *models.User, req calendarTestRequest) []string {
	var providers []string
	if req.TestMoodle && user.MoodleEnabled && user.MoodleCalendarURL != nil {
		providers = append(providers, "moodle")
	}
	if req.TestGoogle && user.GoogleClassroomEnabled {
		providers = append(providers, "google_classroom")
	}
	return providers
}

// findUser finds a user by ID.
func (h *Handler) findUser(c *gin.Context, userID string) (*models.User, error) {
	var user models.User
	err := h.db.WithContext(c.Request.Context()).Where("id = ?", userID).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// respondUserLookupError responds with appropriate error for user lookup failure.
func (h *Handler) respondUserLookupError(c *gin.Context, err error) {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch user"})
}

// formatTimeRemaining formats the remaining time until deadline.
func formatTimeRemaining(deadline time.Time) string {
	now := time.Now()
	if !deadline.After(now) {
		return "deadline lewat"
	}

	diff := deadline.Sub(now)
	days := int(diff.Hours()) / 24
	hours := int(diff.Hours()) % 24
	minutes := int(diff.Minutes()) % 60

	if days > 0 {
		if hours > 0 {
			return strings.TrimSpace(daysToString(days) + " " + hoursToString(hours))
		}
		return daysToString(days)
	}
	if hours > 0 {
		if minutes > 0 {
			return strings.TrimSpace(hoursToString(hours) + " " + minutesToString(minutes))
		}
		return hoursToString(hours)
	}
	if minutes > 0 {
		return minutesToString(minutes)
	}
	return "kurang dari 1 menit"
}

func daysToString(days int) string {
	return strconv.Itoa(days) + " hari"
}

func hoursToString(hours int) string {
	return strconv.Itoa(hours) + " jam"
}

func minutesToString(minutes int) string {
	return strconv.Itoa(minutes) + " menit"
}

// GetEnabledProviders exposes provider logic for Service interface compliance.
func (h *Handler) GetEnabledProviders(user *models.User) []string {
	return h.getEnabledProviders(user)
}

// FetchProviderAssignments exposes fetch logic for Service interface compliance.
func (h *Handler) FetchProviderAssignments(ctx context.Context, provider string, user *models.User) ([]sync.AssignmentRecord, error) {
	return h.fetchProviderAssignments(ctx, provider, user)
}
