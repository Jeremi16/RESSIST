package handlers

import (
	"errors"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jeremi16/resisst-api/internal/http/middleware"
	"github.com/jeremi16/resisst-api/internal/models"
	"gorm.io/gorm"
)

type UserHandler struct {
	db *gorm.DB
}

func NewUserHandler(db *gorm.DB) *UserHandler {
	return &UserHandler{db: db}
}

type userUpdateRequest struct {
	WhatsAppNumber         *string `json:"whatsapp_number"`
	WhatsAppEnabled        *bool   `json:"whatsapp_enabled"`
	TelegramChatID         *string `json:"telegram_chat_id"`
	TelegramEnabled        *bool   `json:"telegram_enabled"`
	MoodleEnabled          *bool   `json:"moodle_enabled"`
	MoodleCalendarURL      *string `json:"moodle_calendar_url"`
	GoogleClassroomEnabled *bool   `json:"google_classroom_enabled"`
	ReminderHours          *string `json:"reminder_hours"`
	MorningBriefing        *bool   `json:"morning_briefing"`
	MutedCourses           *string `json:"muted_courses"`
}

type userResponse struct {
	ID                     string  `json:"id"`
	Email                  string  `json:"email"`
	Name                   string  `json:"name"`
	AvatarURL              string  `json:"avatar_url"`
	WhatsAppNumber         *string `json:"whatsapp_number"`
	WhatsAppEnabled        bool    `json:"whatsapp_enabled"`
	TelegramChatID         *string `json:"telegram_chat_id"`
	TelegramEnabled        bool    `json:"telegram_enabled"`
	MoodleEnabled          bool    `json:"moodle_enabled"`
	MoodleCalendarURL      *string `json:"moodle_calendar_url"`
	GoogleClassroomEnabled bool    `json:"google_classroom_enabled"`
	GoogleConnected        bool    `json:"google_connected"`
	TelegramBotUsername    string  `json:"telegram_bot_username"`
	ReminderHours          string  `json:"reminder_hours"`
	MorningBriefing        bool    `json:"morning_briefing"`
	MutedCourses           string  `json:"muted_courses"`
	CreatedAt              string  `json:"created_at"`
}

func (h *UserHandler) GetCurrentUser(c *gin.Context) {
	userID, ok := h.authenticatedUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	user, err := h.findUserByID(c, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch user"})
		return
	}

	c.JSON(http.StatusOK, buildUserResponse(user))
}

func (h *UserHandler) UpdateCurrentUser(c *gin.Context) {
	userID, ok := h.authenticatedUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req userUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	user, err := h.findUserByID(c, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch user"})
		return
	}

	if req.MoodleCalendarURL != nil && (req.MoodleEnabled == nil || *req.MoodleEnabled != false) {
		calendarURL := strings.TrimSpace(*req.MoodleCalendarURL)
		if calendarURL != "" && !isLikelyMoodleCalendarURL(calendarURL) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid moodle calendar url"})
			return
		}
	}

	if req.GoogleClassroomEnabled != nil && *req.GoogleClassroomEnabled {
		if user.GoogleAccessToken == nil || strings.TrimSpace(*user.GoogleAccessToken) == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "please connect google classroom first before enabling it"})
			return
		}
	}

	updateData := make(map[string]interface{})

	nullableString := func(value *string) interface{} {
		if value == nil {
			return nil
		}
		trimmed := strings.TrimSpace(*value)
		if trimmed == "" {
			return nil
		}
		return trimmed
	}

	if req.WhatsAppNumber != nil {
		trimmed := strings.TrimSpace(*req.WhatsAppNumber)
		if trimmed != "" {
			digits := onlyDigits(trimmed)
			if len(digits) < 10 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid whatsapp number"})
				return
			}
		}
		updateData["whatsapp_number"] = nullableString(req.WhatsAppNumber)
	}
	if req.WhatsAppEnabled != nil {
		updateData["whatsapp_enabled"] = *req.WhatsAppEnabled
	}
	if req.TelegramChatID != nil {
		updateData["telegram_chat_id"] = nullableString(req.TelegramChatID)
	}
	if req.TelegramEnabled != nil {
		updateData["telegram_enabled"] = *req.TelegramEnabled
	}
	if req.MoodleEnabled != nil {
		updateData["moodle_enabled"] = *req.MoodleEnabled
	}
	if req.MoodleCalendarURL != nil {
		updateData["moodle_calendar_url"] = nullableString(req.MoodleCalendarURL)
	}
	if req.GoogleClassroomEnabled != nil {
		updateData["google_classroom_enabled"] = *req.GoogleClassroomEnabled
	}
	if req.ReminderHours != nil {
		updateData["reminder_hours"] = strings.TrimSpace(*req.ReminderHours)
	}
	if req.MorningBriefing != nil {
		updateData["morning_briefing"] = *req.MorningBriefing
	}
	if req.MutedCourses != nil {
		updateData["muted_courses"] = strings.TrimSpace(*req.MutedCourses)
	}

	if req.MoodleEnabled != nil || req.MoodleCalendarURL != nil || req.GoogleClassroomEnabled != nil {
		updateData["lms_last_synced_at"] = nil
	}

	if len(updateData) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no fields to update"})
		return
	}

	if err := h.db.WithContext(c.Request.Context()).
		Model(&models.User{}).
		Where("id = ?", userID).
		Updates(updateData).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update user"})
		return
	}

	updatedUser, err := h.findUserByID(c, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch updated user"})
		return
	}

	c.JSON(http.StatusOK, buildUserResponse(updatedUser))
}

func (h *UserHandler) DisconnectGoogleClassroom(c *gin.Context) {
	userID, ok := h.authenticatedUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	now := c.Request.Context()
	if err := h.db.WithContext(now).Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.User{}).
			Where("id = ?", userID).
			Updates(map[string]interface{}{
				"google_access_token":      nil,
				"google_refresh_token":     nil,
				"google_token_expiry":      nil,
				"google_classroom_enabled": false,
				"lms_last_synced_at":       nil,
			}).Error; err != nil {
			return err
		}

		if err := tx.Where("user_id = ? AND source = ?", userID, "google_classroom").Delete(&models.Event{}).Error; err != nil {
			return err
		}

		return nil
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to disconnect google classroom"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *UserHandler) authenticatedUserID(c *gin.Context) (string, bool) {
	claims, ok := middleware.GetAccessClaims(c)
	if !ok || strings.TrimSpace(claims.Subject) == "" {
		return "", false
	}
	return claims.Subject, true
}

func (h *UserHandler) findUserByID(c *gin.Context, userID string) (*models.User, error) {
	var user models.User
	err := h.db.WithContext(c.Request.Context()).Where("id = ?", userID).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func buildUserResponse(user *models.User) userResponse {
	telegramBotUsername := strings.TrimSpace(os.Getenv("TELEGRAM_BOT_USERNAME"))
	if telegramBotUsername == "" {
		telegramBotUsername = "resisst_bot"
	}

	name := user.Name
	avatarURL := user.AvatarURL
	if strings.TrimSpace(name) == "" {
		name = ""
	}
	if strings.TrimSpace(avatarURL) == "" {
		avatarURL = ""
	}

	return userResponse{
		ID:                     user.ID,
		Email:                  user.Email,
		Name:                   name,
		AvatarURL:              avatarURL,
		WhatsAppNumber:         user.WhatsAppNumber,
		WhatsAppEnabled:        user.WhatsAppEnabled,
		TelegramChatID:         user.TelegramChatID,
		TelegramEnabled:        user.TelegramEnabled,
		MoodleEnabled:          user.MoodleEnabled,
		MoodleCalendarURL:      user.MoodleCalendarURL,
		GoogleClassroomEnabled: user.GoogleClassroomEnabled,
		GoogleConnected:        user.GoogleTokenExpiry != nil,
		TelegramBotUsername:    telegramBotUsername,
		ReminderHours:          defaultString(user.ReminderHours, "[24]"),
		MorningBriefing:        user.MorningBriefing,
		MutedCourses:           defaultString(user.MutedCourses, "[]"),
		CreatedAt:              user.CreatedAt.UTC().Format("2006-01-02T15:04:05.000Z"),
	}
}

func defaultString(value string, fallback string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return fallback
	}
	return trimmed
}

func isLikelyMoodleCalendarURL(rawURL string) bool {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return false
	}

	pathname := strings.ToLower(parsed.Path)
	return strings.Contains(pathname, ".ics") ||
		strings.Contains(pathname, "/calendar/export") ||
		strings.Contains(pathname, "export_execute.php") ||
		(parsed.Query().Has("authtoken") && parsed.Query().Has("userid"))
}

func onlyDigits(input string) string {
	var b strings.Builder
	for _, r := range input {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	return b.String()
}
