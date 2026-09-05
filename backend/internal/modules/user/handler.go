package user

import (
	"errors"
	"math/rand"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jeremi16/resisst-api/internal/models"
	"github.com/jeremi16/resisst-api/internal/pkg/classcode"
	"github.com/jeremi16/resisst-api/internal/pkg/coursealias"
	"github.com/jeremi16/resisst-api/internal/pkg/text"
	"github.com/jeremi16/resisst-api/internal/pkg/urlutil"
	"github.com/jeremi16/resisst-api/internal/shared/middleware"
	"gorm.io/gorm"
)

// Handler handles user HTTP requests.
type Handler struct {
	db *gorm.DB
}

// NewHandler creates a new user Handler.
func NewHandler(db *gorm.DB) *Handler {
	return &Handler{db: db}
}

// GetCurrentUser returns the current authenticated user's profile.
func (h *Handler) GetCurrentUser(c *gin.Context) {
	userID, ok := middleware.AuthenticatedUserID(c)
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

// UpdateCurrentUser updates the current user's settings.
func (h *Handler) UpdateCurrentUser(c *gin.Context) {
	userID, ok := middleware.AuthenticatedUserID(c)
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
		return
	}

	updateData := h.buildUpdateData(&req)
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

// DisconnectGoogleClassroom disconnects Google Classroom integration.
func (h *Handler) DisconnectGoogleClassroom(c *gin.Context) {
	userID, ok := middleware.AuthenticatedUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	if err := h.db.WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.User{}).Where("id = ?", userID).Updates(map[string]interface{}{
			"google_access_token":      nil,
			"google_refresh_token":     nil,
			"google_token_expiry":      nil,
			"google_classroom_enabled": false,
			"lms_last_synced_at":       nil,
		}).Error; err != nil {
			return err
		}

		return tx.Where("user_id = ? AND source = ?", userID, "google_classroom").Delete(&models.Event{}).Error
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to disconnect google classroom"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// GetCourseAliases returns all course aliases for the current user.
func (h *Handler) GetCourseAliases(c *gin.Context) {
	user, err := h.getCurrentUser(c)
	if err != nil {
		return
	}

	c.JSON(http.StatusOK, courseAliasResponse{
		Aliases: coursealias.Parse(user.CourseAliases),
	})
}

// AddCourseAlias adds or updates a course alias.
func (h *Handler) AddCourseAlias(c *gin.Context) {
	var req courseAliasRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	user, err := h.getCurrentUser(c)
	if err != nil {
		return
	}

	aliases := coursealias.Parse(user.CourseAliases)
	aliases[strings.TrimSpace(req.OriginalName)] = strings.TrimSpace(req.Alias)

	if err := h.updateCourseAliases(c, user.ID, aliases); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update alias"})
		return
	}

	c.JSON(http.StatusOK, courseAliasResponse{Aliases: aliases})
}

// DeleteCourseAlias removes a course alias.
func (h *Handler) DeleteCourseAlias(c *gin.Context) {
	var req courseAliasDeleteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	user, err := h.getCurrentUser(c)
	if err != nil {
		return
	}

	aliases := coursealias.Parse(user.CourseAliases)
	delete(aliases, strings.TrimSpace(req.OriginalName))

	if err := h.updateCourseAliases(c, user.ID, aliases); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete alias"})
		return
	}

	c.JSON(http.StatusOK, courseAliasResponse{Aliases: aliases})
}

// GenerateTelegramVerifyCode generates a new verification code for Telegram.
func (h *Handler) GenerateTelegramVerifyCode(c *gin.Context) {
	user, err := h.getCurrentUser(c)
	if err != nil {
		return
	}

	code := generateAlphanumericCode(6)
	expiresAt := time.Now().Add(10 * time.Minute)

	if err := h.db.Model(&models.User{}).Where("id = ?", user.ID).Updates(map[string]interface{}{
		"telegram_verify_code":    code,
		"telegram_verify_expires": expiresAt,
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate code"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":       code,
		"expires_at": expiresAt.Format(time.RFC3339),
	})
}

// Helper methods

func (h *Handler) findUserByID(c *gin.Context, userID string) (*models.User, error) {
	var user models.User
	err := h.db.WithContext(c.Request.Context()).Where("id = ?", userID).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (h *Handler) getCurrentUser(c *gin.Context) (*models.User, error) {
	userID, ok := middleware.AuthenticatedUserID(c)
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

func (h *Handler) handleUserError(c *gin.Context, err error) {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch user"})
}

func (h *Handler) validateUpdateRequest(c *gin.Context, user *models.User, req *userUpdateRequest) error {
	if req.MoodleCalendarURL != nil && (req.MoodleEnabled == nil || *req.MoodleEnabled != false) {
		calendarURL := strings.TrimSpace(*req.MoodleCalendarURL)
		if calendarURL != "" && !urlutil.IsLikelyMoodleCalendarURL(calendarURL) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid moodle calendar url"})
			return errors.New("invalid moodle calendar url")
		}
	}

	if req.GoogleClassroomEnabled != nil && *req.GoogleClassroomEnabled {
		if user.GoogleAccessToken == nil || text.Dereference(user.GoogleAccessToken, "") == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "please connect google classroom first before enabling it"})
			return errors.New("google classroom not connected")
		}
	}

	if req.WhatsAppNumber != nil {
		trimmed := strings.TrimSpace(*req.WhatsAppNumber)
		if trimmed != "" && len(text.OnlyDigits(trimmed)) < 10 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid whatsapp number"})
			return errors.New("invalid whatsapp number")
		}
	}

	return nil
}

func (h *Handler) buildUpdateData(req *userUpdateRequest) map[string]interface{} {
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

	if req.MoodleEnabled != nil || req.MoodleCalendarURL != nil || req.GoogleClassroomEnabled != nil {
		updateData["lms_last_synced_at"] = nil
	}

	return updateData
}

func (h *Handler) updateCourseAliases(c *gin.Context, userID string, aliases map[string]string) error {
	jsonStr := coursealias.ToJSON(aliases)
	return h.db.WithContext(c.Request.Context()).
		Model(&models.User{}).
		Where("id = ?", userID).
		Update("course_aliases", jsonStr).Error
}

func buildUserResponse(user *models.User) userResponse {
	telegramBotUsername := text.DefaultString(os.Getenv("TELEGRAM_BOT_USERNAME"), "resisst_bot")

	return userResponse{
		ID:                     user.ID,
		Email:                  user.Email,
		Name:                   text.DefaultString(user.Name, ""),
		AvatarURL:              text.DefaultString(user.AvatarURL, ""),
		WhatsAppNumber:         user.WhatsAppNumber,
		WhatsAppEnabled:        user.WhatsAppEnabled,
		TelegramChatID:         user.TelegramChatID,
		TelegramEnabled:        user.TelegramEnabled,
		MoodleEnabled:          user.MoodleEnabled,
		MoodleCalendarURL:      user.MoodleCalendarURL,
		GoogleClassroomEnabled: user.GoogleClassroomEnabled,
		GoogleConnected:        user.GoogleTokenExpiry != nil,
		TelegramBotUsername:    telegramBotUsername,
		ReminderHours:          text.DefaultString(user.ReminderHours, "[24]"),
		MorningBriefing:        user.MorningBriefing,
		MutedCourses:           text.DefaultString(user.MutedCourses, "[]"),
		CourseAliases:          coursealias.Parse(user.CourseAliases),
		ClassCode:              user.ClassCode,
		AvailableClassCodes:    classcode.ParseArray(user.AvailableClassCodes),
		CreatedAt:              user.CreatedAt.UTC().Format("2006-01-02T15:04:05.000Z"),
	}
}

func generateAlphanumericCode(length int) string {
	const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[rand.Intn(len(charset))]
	}
	return string(b)
}

// ---------------------------------------------------------------------------
// Request / Response Types (mirroring handlers/types.go user section)
// ---------------------------------------------------------------------------

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
	CourseAliases          *string `json:"course_aliases"`
	ClassCode              *string `json:"class_code"`
	AvailableClassCodes    *string `json:"available_class_codes"`
}

type userResponse struct {
	ID                     string            `json:"id"`
	Email                  string            `json:"email"`
	Name                   string            `json:"name"`
	AvatarURL              string            `json:"avatar_url"`
	WhatsAppNumber         *string           `json:"whatsapp_number"`
	WhatsAppEnabled        bool              `json:"whatsapp_enabled"`
	TelegramChatID         *string           `json:"telegram_chat_id"`
	TelegramEnabled        bool              `json:"telegram_enabled"`
	MoodleEnabled          bool              `json:"moodle_enabled"`
	MoodleCalendarURL      *string           `json:"moodle_calendar_url"`
	GoogleClassroomEnabled bool              `json:"google_classroom_enabled"`
	GoogleConnected        bool              `json:"google_connected"`
	TelegramBotUsername    string            `json:"telegram_bot_username"`
	ReminderHours          string            `json:"reminder_hours"`
	MorningBriefing        bool              `json:"morning_briefing"`
	MutedCourses           string            `json:"muted_courses"`
	CourseAliases          map[string]string `json:"course_aliases"`
	ClassCode              *string           `json:"class_code"`
	AvailableClassCodes    []string          `json:"available_class_codes"`
	CreatedAt              string            `json:"created_at"`
}

type courseAliasRequest struct {
	OriginalName string `json:"original_name" binding:"required"`
	Alias        string `json:"alias" binding:"required"`
}

type courseAliasDeleteRequest struct {
	OriginalName string `json:"original_name" binding:"required"`
}

type courseAliasResponse struct {
	Aliases map[string]string `json:"aliases"`
}
