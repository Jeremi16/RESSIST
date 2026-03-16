package handlers

import (
	"errors"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jeremi16/resisst-api/internal/models"
	"gorm.io/gorm"
)

type UserHandler struct {
	db *gorm.DB
}

func NewUserHandler(db *gorm.DB) *UserHandler {
	return &UserHandler{db: db}
}

// GetCurrentUser returns the current authenticated user's profile
func (h *UserHandler) GetCurrentUser(c *gin.Context) {
	userID, ok := authenticatedUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	user, err := h.findUserByID(c, userID)
	if err != nil {
		h.handleUserError(c, err)
		return
	}

	c.JSON(http.StatusOK, buildUserResponse(user))
}

// UpdateCurrentUser updates the current user's settings
func (h *UserHandler) UpdateCurrentUser(c *gin.Context) {
	userID, ok := authenticatedUserID(c)
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
		h.handleUserError(c, err)
		return
	}

	if err := h.validateUpdateRequest(c, user, &req); err != nil {
		return // Error already handled
	}

	updateData := h.buildUpdateData(c, user, &req)
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

// DisconnectGoogleClassroom disconnects Google Classroom integration
func (h *UserHandler) DisconnectGoogleClassroom(c *gin.Context) {
	userID, ok := authenticatedUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	if err := h.db.WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		// Clear Google tokens
		if err := tx.Model(&models.User{}).Where("id = ?", userID).Updates(map[string]interface{}{
			"google_access_token":      nil,
			"google_refresh_token":     nil,
			"google_token_expiry":      nil,
			"google_classroom_enabled": false,
			"lms_last_synced_at":       nil,
		}).Error; err != nil {
			return err
		}

		// Delete Google Classroom events
		return tx.Where("user_id = ? AND source = ?", userID, "google_classroom").Delete(&models.Event{}).Error
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to disconnect google classroom"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// GetCourseAliases returns all course aliases for the current user
func (h *UserHandler) GetCourseAliases(c *gin.Context) {
	user, err := h.getCurrentUser(c)
	if err != nil {
		return
	}

	c.JSON(http.StatusOK, courseAliasResponse{
		Aliases: parseCourseAliases(user.CourseAliases),
	})
}

// AddCourseAlias adds or updates a course alias
func (h *UserHandler) AddCourseAlias(c *gin.Context) {
	var req courseAliasRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	user, err := h.getCurrentUser(c)
	if err != nil {
		return
	}

	aliases := parseCourseAliases(user.CourseAliases)
	aliases[strings.TrimSpace(req.OriginalName)] = strings.TrimSpace(req.Alias)

	if err := h.updateCourseAliases(c, user.ID, aliases); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update alias"})
		return
	}

	c.JSON(http.StatusOK, courseAliasResponse{Aliases: aliases})
}

// DeleteCourseAlias removes a course alias
func (h *UserHandler) DeleteCourseAlias(c *gin.Context) {
	var req courseAliasDeleteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	user, err := h.getCurrentUser(c)
	if err != nil {
		return
	}

	aliases := parseCourseAliases(user.CourseAliases)
	delete(aliases, strings.TrimSpace(req.OriginalName))

	if err := h.updateCourseAliases(c, user.ID, aliases); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete alias"})
		return
	}

	c.JSON(http.StatusOK, courseAliasResponse{Aliases: aliases})
}

// Helper methods

func (h *UserHandler) findUserByID(c *gin.Context, userID string) (*models.User, error) {
	var user models.User
	err := h.db.WithContext(c.Request.Context()).Where("id = ?", userID).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (h *UserHandler) getCurrentUser(c *gin.Context) (*models.User, error) {
	userID, ok := authenticatedUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return nil, errors.New("unauthorized")
	}

	user, err := h.findUserByID(c, userID)
	if err != nil {
		h.handleUserError(c, err)
		return nil, err
	}

	return user, nil
}

func (h *UserHandler) handleUserError(c *gin.Context, err error) {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch user"})
}

func (h *UserHandler) validateUpdateRequest(c *gin.Context, user *models.User, req *userUpdateRequest) error {
	// Validate Moodle URL
	if req.MoodleCalendarURL != nil && (req.MoodleEnabled == nil || *req.MoodleEnabled != false) {
		calendarURL := strings.TrimSpace(*req.MoodleCalendarURL)
		if calendarURL != "" && !isLikelyMoodleCalendarURL(calendarURL) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid moodle calendar url"})
			return errors.New("invalid moodle calendar url")
		}
	}

	// Validate Google Classroom is connected before enabling
	if req.GoogleClassroomEnabled != nil && *req.GoogleClassroomEnabled {
		if user.GoogleAccessToken == nil || dereferenceString(user.GoogleAccessToken, "") == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "please connect google classroom first before enabling it"})
			return errors.New("google classroom not connected")
		}
	}

	// Validate WhatsApp number
	if req.WhatsAppNumber != nil {
		trimmed := strings.TrimSpace(*req.WhatsAppNumber)
		if trimmed != "" && len(onlyDigits(trimmed)) < 10 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid whatsapp number"})
			return errors.New("invalid whatsapp number")
		}
	}

	return nil
}

func (h *UserHandler) buildUpdateData(c *gin.Context, user *models.User, req *userUpdateRequest) map[string]interface{} {
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

	// Simple fields
	if req.WhatsAppEnabled != nil {
		updateData["whatsapp_enabled"] = *req.WhatsAppEnabled
	}
	if req.TelegramEnabled != nil {
		updateData["telegram_enabled"] = *req.TelegramEnabled
	}
	if req.MoodleEnabled != nil {
		updateData["moodle_enabled"] = *req.MoodleEnabled
	}
	if req.GoogleClassroomEnabled != nil {
		updateData["google_classroom_enabled"] = *req.GoogleClassroomEnabled
	}
	if req.MorningBriefing != nil {
		updateData["morning_briefing"] = *req.MorningBriefing
	}

	// Nullable string fields
	if req.WhatsAppNumber != nil {
		updateData["whatsapp_number"] = nullableString(req.WhatsAppNumber)
	}
	if req.TelegramChatID != nil {
		updateData["telegram_chat_id"] = nullableString(req.TelegramChatID)
	}
	if req.MoodleCalendarURL != nil {
		updateData["moodle_calendar_url"] = nullableString(req.MoodleCalendarURL)
	}
	if req.ClassCode != nil {
		updateData["class_code"] = nullableString(req.ClassCode)
	}

	// String fields
	if req.ReminderHours != nil {
		updateData["reminder_hours"] = strings.TrimSpace(*req.ReminderHours)
	}
	if req.MutedCourses != nil {
		updateData["muted_courses"] = strings.TrimSpace(*req.MutedCourses)
	}
	if req.CourseAliases != nil {
		updateData["course_aliases"] = strings.TrimSpace(*req.CourseAliases)
	}
	if req.AvailableClassCodes != nil {
		updateData["available_class_codes"] = strings.TrimSpace(*req.AvailableClassCodes)
	}

	// Reset sync time if LMS settings changed
	if req.MoodleEnabled != nil || req.MoodleCalendarURL != nil || req.GoogleClassroomEnabled != nil {
		updateData["lms_last_synced_at"] = nil
	}

	return updateData
}

func (h *UserHandler) updateCourseAliases(c *gin.Context, userID string, aliases map[string]string) error {
	jsonStr := courseAliasesToJSON(aliases)
	return h.db.WithContext(c.Request.Context()).
		Model(&models.User{}).
		Where("id = ?", userID).
		Update("course_aliases", jsonStr).Error
}

// buildUserResponse converts User model to response DTO
func buildUserResponse(user *models.User) userResponse {
	telegramBotUsername := defaultString(os.Getenv("TELEGRAM_BOT_USERNAME"), "resisst_bot")

	return userResponse{
		ID:                     user.ID,
		Email:                  user.Email,
		Name:                   defaultString(user.Name, ""),
		AvatarURL:              defaultString(user.AvatarURL, ""),
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
		CourseAliases:          parseCourseAliases(user.CourseAliases),
		ClassCode:              user.ClassCode,
		AvailableClassCodes:    parseAvailableClassCodes(user.AvailableClassCodes),
		CreatedAt:              user.CreatedAt.UTC().Format("2006-01-02T15:04:05.000Z"),
	}
}
