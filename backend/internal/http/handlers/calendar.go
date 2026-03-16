package handlers

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jeremi16/resisst-api/internal/config"
	"github.com/jeremi16/resisst-api/internal/models"
	"gorm.io/gorm"
)

const (
	upcomingWindowDays = 60
	syncCooldown       = time.Hour
)

type CalendarHandler struct {
	db      *gorm.DB
	cfg     *config.Config
	syncSvc *SyncService
}

func NewCalendarHandler(db *gorm.DB, cfg *config.Config) *CalendarHandler {
	return &CalendarHandler{
		db:      db,
		cfg:     cfg,
		syncSvc: NewSyncService(db),
	}
}

// GetPreview returns calendar preview (cached or fresh)
func (h *CalendarHandler) GetPreview(c *gin.Context) {
	userID, ok := authenticatedUserID(c)
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
	sortBy := parseSortOption(c.Query("sort"))

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

// TestPreview tests LMS sources without caching
func (h *CalendarHandler) TestPreview(c *gin.Context) {
	userID, ok := authenticatedUserID(c)
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

	sortBy := parseSortOption(c.Query("sort"))
	response, err := h.syncAndBuildResponse(c, user, providers, sortBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to test calendar"})
		return
	}
	c.JSON(http.StatusOK, response)
}

// syncAndBuildResponse syncs data and builds response
func (h *CalendarHandler) syncAndBuildResponse(c *gin.Context, user *models.User, providers []string, sortBy string) (gin.H, error) {
	if len(providers) == 0 {
		return h.buildResponse(c, user, providers, nil, true, sortBy)
	}

	sourceInfo, newAssignments, successfulSources, failedSources := h.syncProviders(c.Request.Context(), user, providers)
	fromCache := successfulSources == 0

	if successfulSources > 0 {
		now := time.Now().UTC()
		h.db.WithContext(c.Request.Context()).Model(&models.User{}).Where("id = ?", user.ID).Update("lms_last_synced_at", now)
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

// syncProviders syncs data from all providers
func (h *CalendarHandler) syncProviders(ctx context.Context, user *models.User, providers []string) ([]calendarSourceInfo, []newAssignmentInfo, int, int) {
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

		// Collect class codes from assignments
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

		newAssignments = append(newAssignments, newForProvider...)
		sourceInfo = append(sourceInfo, calendarSourceInfo{Provider: provider, Count: len(assignments), Success: true})
		successfulSources++
	}

	// Update user's available class codes if there are new ones
	if successfulSources > 0 && len(allClassCodes) > 0 {
		h.updateUserAvailableClassCodes(ctx, user.ID, allClassCodes)
	}

	return sourceInfo, newAssignments, successfulSources, failedSources
}

// updateUserAvailableClassCodes updates the user's available class codes
func (h *CalendarHandler) updateUserAvailableClassCodes(ctx context.Context, userID string, newClassCodes map[string]bool) {
	// Get current user's available class codes
	var user models.User
	if err := h.db.WithContext(ctx).Where("id = ?", userID).First(&user).Error; err != nil {
		return
	}

	// Parse existing class codes
	existingCodes := make(map[string]bool)
	if user.AvailableClassCodes != "" && user.AvailableClassCodes != "[]" {
		codes := parseAvailableClassCodes(user.AvailableClassCodes)
		for _, code := range codes {
			existingCodes[code] = true
		}
	}

	// Merge new class codes with existing
	merged := false
	for code := range newClassCodes {
		if !existingCodes[code] {
			existingCodes[code] = true
			merged = true
		}
	}

	// Only update if there are new class codes
	if merged {
		codes := make([]string, 0, len(existingCodes))
		for code := range existingCodes {
			codes = append(codes, code)
		}
		jsonCodes := availableClassCodesToJSON(codes)
		h.db.WithContext(ctx).Model(&models.User{}).Where("id = ?", userID).Update("available_class_codes", jsonCodes)
	}
}

// buildResponse builds the calendar response
func (h *CalendarHandler) buildResponse(c *gin.Context, user *models.User, providers []string, sourceInfoOverride []calendarSourceInfo, fromCache bool, sortBy string) (gin.H, error) {
	events, err := h.loadCachedEvents(c, user.ID, providers, sortBy)
	if err != nil {
		return nil, err
	}

	// Parse course aliases and apply them to previews
	aliases := parseCourseAliases(user.CourseAliases)
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

// convertEventsToPreviews converts Event models to preview structs
func (h *CalendarHandler) convertEventsToPreviews(events []models.Event, aliases map[string]string) []calendarEventPreview {
	previews := make([]calendarEventPreview, 0, len(events))
	for _, event := range events {
		originalCourse := dereferenceString(event.Course, "Unknown Course")
		// Apply alias if exists (real-time alias application)
		course := applyCourseAlias(originalCourse, aliases)
		previews = append(previews, calendarEventPreview{
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
		})
	}
	return previews
}

// buildSourceInfo builds source info list
func (h *CalendarHandler) buildSourceInfo(providers []string, events []models.Event, override []calendarSourceInfo) []calendarSourceInfo {
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

// calculateNextRefreshAt calculates when next refresh is allowed
func (h *CalendarHandler) calculateNextRefreshAt(user *models.User) *time.Time {
	if user.LMSLastSyncedAt == nil {
		return nil
	}
	next := user.LMSLastSyncedAt.Add(syncCooldown)
	return &next
}

// loadCachedEvents loads events from database
func (h *CalendarHandler) loadCachedEvents(c *gin.Context, userID string, providers []string, sortBy string) ([]models.Event, error) {
	if len(providers) == 0 {
		return []models.Event{}, nil
	}

	now := time.Now()
	cutoff := now.Add(time.Hour * 24 * upcomingWindowDays)

	var events []models.Event
	err := h.db.WithContext(c.Request.Context()).
		Where("user_id = ? AND source IN ? AND deadline > ? AND deadline <= ?", userID, providers, now, cutoff).
		Order(getOrderClause(sortBy)).
		Find(&events).Error
	if err != nil {
		return nil, err
	}
	return events, nil
}

// getEnabledProviders returns enabled LMS providers for a user
func (h *CalendarHandler) getEnabledProviders(user *models.User) []string {
	providers := make([]string, 0, 2)
	if user.MoodleEnabled && user.MoodleCalendarURL != nil && dereferenceString(user.MoodleCalendarURL, "") != "" {
		providers = append(providers, "moodle")
	}
	if user.GoogleClassroomEnabled && user.GoogleAccessToken != nil && dereferenceString(user.GoogleAccessToken, "") != "" {
		providers = append(providers, "google_classroom")
	}
	return providers
}

// getTestProviders returns providers for testing based on request
func (h *CalendarHandler) getTestProviders(user *models.User, req calendarTestRequest) []string {
	var providers []string
	if req.TestMoodle && user.MoodleEnabled && user.MoodleCalendarURL != nil {
		providers = append(providers, "moodle")
	}
	if req.TestGoogle && user.GoogleClassroomEnabled {
		providers = append(providers, "google_classroom")
	}
	return providers
}

// findUser finds a user by ID
func (h *CalendarHandler) findUser(c *gin.Context, userID string) (*models.User, error) {
	var user models.User
	err := h.db.WithContext(c.Request.Context()).Where("id = ?", userID).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// respondUserLookupError responds with appropriate error for user lookup failure
func (h *CalendarHandler) respondUserLookupError(c *gin.Context, err error) {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch user"})
}
