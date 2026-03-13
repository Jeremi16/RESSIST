package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jeremi16/resisst-api/internal/config"
	"github.com/jeremi16/resisst-api/internal/http/middleware"
	"github.com/jeremi16/resisst-api/internal/models"
	"gorm.io/gorm"
)

const (
	upcomingWindowDays = 60
	syncCooldown       = time.Hour
)

type CalendarHandler struct {
	db  *gorm.DB
	cfg *config.Config
}

type calendarEventPreview struct {
	Title         string    `json:"title"`
	Course        string    `json:"course"`
	Deadline      string    `json:"deadline"`
	TimeRemaining string    `json:"timeRemaining"`
	DeadlineDate  time.Time `json:"deadlineDate"`
	Source        string    `json:"source"`
}

type calendarSourceInfo struct {
	Provider string `json:"provider"`
	Count    int    `json:"count"`
	Success  bool   `json:"success"`
}

type calendarTestRequest struct {
	MoodleCalendarURL string `json:"moodle_calendar_url"`
	TestMoodle        bool   `json:"test_moodle"`
	TestGoogle        bool   `json:"test_google"`
}

func NewCalendarHandler(db *gorm.DB, cfg *config.Config) *CalendarHandler {
	return &CalendarHandler{db: db, cfg: cfg}
}

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

	providers := enabledProvidersFromUser(user)
	forceRefresh := strings.EqualFold(strings.TrimSpace(c.Query("force")), "true")
	if forceRefresh {
		response, err := h.syncAndBuildCalendarResponse(c, user, providers)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to refresh calendar preview"})
			return
		}
		c.JSON(http.StatusOK, response)
		return
	}

	response, err := h.buildCalendarResponse(c, user, providers, nil, true)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch calendar preview"})
		return
	}
	c.JSON(http.StatusOK, response)
}

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

	var providers []string
	if req.TestMoodle {
		if strings.TrimSpace(req.MoodleCalendarURL) != "" && !isLikelyMoodleCalendarURL(req.MoodleCalendarURL) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Moodle calendar URL"})
			return
		}
		if user.MoodleEnabled && user.MoodleCalendarURL != nil {
			providers = append(providers, "moodle")
		}
	}
	if req.TestGoogle {
		if user.GoogleAccessToken == nil || strings.TrimSpace(*user.GoogleAccessToken) == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Google Classroom belum terhubung"})
			return
		}
		if user.GoogleClassroomEnabled {
			providers = append(providers, "google_classroom")
		}
	}

	if len(providers) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No LMS source configured for testing"})
		return
	}

	response, err := h.syncAndBuildCalendarResponse(c, user, providers)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to test calendar"})
		return
	}
	c.JSON(http.StatusOK, response)
}

func (h *CalendarHandler) buildCalendarResponse(
	c *gin.Context,
	user *models.User,
	providers []string,
	sourceInfoOverride []calendarSourceInfo,
	fromCache bool,
) (gin.H, error) {
	events, err := h.loadCachedEvents(c, user.ID, providers)
	if err != nil {
		return nil, err
	}

	previews := make([]calendarEventPreview, 0, len(events))
	for _, event := range events {
		course := "Unknown Course"
		if event.Course != nil && strings.TrimSpace(*event.Course) != "" {
			course = *event.Course
		}

		previews = append(previews, calendarEventPreview{
			Title:         event.Title,
			Course:        course,
			Deadline:      event.Deadline.UTC().Format(time.RFC3339),
			TimeRemaining: formatTimeRemaining(event.Deadline),
			DeadlineDate:  event.Deadline,
			Source:        event.Source,
		})
	}

	sourceInfo := sourceInfoOverride
	if sourceInfo == nil {
		sourceInfo = make([]calendarSourceInfo, 0, len(providers))
		for _, provider := range providers {
			count := 0
			for _, event := range events {
				if event.Source == provider {
					count++
				}
			}
			sourceInfo = append(sourceInfo, calendarSourceInfo{
				Provider: provider,
				Count:    count,
				Success:  true,
			})
		}
	}

	var nextRefreshAt *time.Time
	if user.LMSLastSyncedAt != nil {
		next := user.LMSLastSyncedAt.Add(syncCooldown)
		nextRefreshAt = &next
	}

	return gin.H{
		"events":            previews,
		"sources":           sourceInfo,
		"total":             len(previews),
		"successfulSources": len(sourceInfo),
		"failedSources":     0,
		"fromCache":         fromCache,
		"lastSyncedAt":      user.LMSLastSyncedAt,
		"nextRefreshAt":     nextRefreshAt,
	}, nil
}

func (h *CalendarHandler) loadCachedEvents(c *gin.Context, userID string, providers []string) ([]models.Event, error) {
	if len(providers) == 0 {
		return []models.Event{}, nil
	}

	now := time.Now()
	cutoff := now.Add(time.Hour * 24 * upcomingWindowDays)

	var events []models.Event
	err := h.db.WithContext(c.Request.Context()).
		Where("user_id = ? AND source IN ? AND deadline > ? AND deadline <= ?", userID, providers, now, cutoff).
		Order("deadline asc").
		Find(&events).Error
	if err != nil {
		return nil, err
	}
	return events, nil
}

func (h *CalendarHandler) findUser(c *gin.Context, userID string) (*models.User, error) {
	var user models.User
	err := h.db.WithContext(c.Request.Context()).Where("id = ?", userID).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (h *CalendarHandler) respondUserLookupError(c *gin.Context, err error) {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch user"})
}

func authenticatedUserID(c *gin.Context) (string, bool) {
	claims, ok := middleware.GetAccessClaims(c)
	if !ok || strings.TrimSpace(claims.Subject) == "" {
		return "", false
	}
	return claims.Subject, true
}

func enabledProvidersFromUser(user *models.User) []string {
	providers := make([]string, 0, 2)
	if user.MoodleEnabled && user.MoodleCalendarURL != nil && strings.TrimSpace(*user.MoodleCalendarURL) != "" {
		providers = append(providers, "moodle")
	}
	if user.GoogleClassroomEnabled && user.GoogleAccessToken != nil && strings.TrimSpace(*user.GoogleAccessToken) != "" {
		providers = append(providers, "google_classroom")
	}
	return providers
}

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
			return strings.TrimSpace(
				strings.Join([]string{
					intToString(days) + " hari",
					intToString(hours) + " jam",
				}, " "),
			)
		}
		return intToString(days) + " hari"
	}
	if hours > 0 {
		if minutes > 0 {
			return strings.TrimSpace(
				strings.Join([]string{
					intToString(hours) + " jam",
					intToString(minutes) + " menit",
				}, " "),
			)
		}
		return intToString(hours) + " jam"
	}
	if minutes > 0 {
		return intToString(minutes) + " menit"
	}
	return "kurang dari 1 menit"
}

func intToString(value int) string {
	return strconv.Itoa(value)
}
