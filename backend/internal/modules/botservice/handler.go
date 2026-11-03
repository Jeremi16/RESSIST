package botservice

import (
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jeremi16/ressist-api/internal/models"
	"gorm.io/gorm"
)

// Handler serves service-to-service endpoints for ressist-bot.
// All routes are guarded by middleware.RequireBotService.
type Handler struct {
	db *gorm.DB
}

// NewHandler creates a new internal Handler.
func NewHandler(db *gorm.DB) *Handler {
	return &Handler{db: db}
}

// GetUserByTelegram resolves a telegram chat id to a user id.
// GET /internal/users/by-telegram/:chatID
func (h *Handler) GetUserByTelegram(c *gin.Context) {
	chatID := strings.TrimSpace(c.Param("chatID"))
	if chatID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "chatID is required"})
		return
	}
	var users []models.User
	if err := h.db.WithContext(c.Request.Context()).
		Where("telegram_chat_id = ?", chatID).
		Limit(2).
		Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}
	// More than one row claiming the same chat means the binding is ambiguous;
	// picking one arbitrarily would deliver another user's reminders to
	// whoever happens to sort first.
	if len(users) > 1 {
		log.Printf("[botservice] ambiguous telegram chat binding detected")
		c.JSON(http.StatusConflict, gin.H{"error": "ambiguous chat binding"})
		return
	}
	if len(users) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	user := users[0]
	c.JSON(http.StatusOK, gin.H{
		"id":                user.ID,
		"name":              user.Name,
		"telegram_enabled":  user.TelegramEnabled,
		"telegram_chat_id":  user.TelegramChatID,
		"telegram_username": user.TelegramUsername,
	})
}

// GetUser returns the minimal profile the bot needs for /status.
// GET /internal/users/:id
func (h *Handler) GetUser(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id is required"})
		return
	}
	var user models.User
	if err := h.db.WithContext(c.Request.Context()).
		Where("id = ?", id).
		First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"id":               user.ID,
		"name":             user.Name,
		"telegram_enabled": user.TelegramEnabled,
		"telegram_chat_id": user.TelegramChatID,
		"morning_briefing": user.MorningBriefing,
		"reminder_hours":   user.ReminderHours,
		"muted_courses":    user.MutedCourses,
		"class_code":       user.ClassCode,
	})
}

type verifyTelegramRequest struct {
	Code             string  `json:"code"`
	ChatID           string  `json:"chat_id"`
	TelegramUsername *string `json:"telegram_username"`
}

// telegramAttemptWindow is how long a failed verification is remembered, and
// how long a chat is locked out once it exceeds maxTelegramAttempts.
const (
	maxTelegramAttempts   = 5
	telegramAttemptWindow = 10 * time.Minute
)

// verifyAttemptLimiter tracks failed code redemptions per chat id.
type verifyAttemptLimiter struct {
	mu      sync.Mutex
	entries map[string]*attemptEntry
}

type attemptEntry struct {
	count     int
	firstSeen time.Time
	lockedFor time.Time
}

var telegramAttempts = &verifyAttemptLimiter{entries: make(map[string]*attemptEntry)}

// allow reports whether this chat id may attempt a redemption now.
func (l *verifyAttemptLimiter) allow(chatID string, now time.Time) (bool, time.Duration) {
	l.mu.Lock()
	defer l.mu.Unlock()

	entry, ok := l.entries[chatID]
	if !ok {
		return true, 0
	}
	if now.Sub(entry.firstSeen) > telegramAttemptWindow {
		delete(l.entries, chatID)
		return true, 0
	}
	if now.Before(entry.lockedFor) {
		return false, entry.lockedFor.Sub(now)
	}
	return true, 0
}

// fail records a failed attempt and returns the lockout duration once the
// threshold is reached (0 otherwise).
func (l *verifyAttemptLimiter) fail(chatID string, now time.Time) time.Duration {
	l.mu.Lock()
	defer l.mu.Unlock()

	// Opportunistic cleanup so the map cannot grow without bound.
	if len(l.entries) > 4096 {
		for k, v := range l.entries {
			if now.Sub(v.firstSeen) > telegramAttemptWindow {
				delete(l.entries, k)
			}
		}
	}

	entry, ok := l.entries[chatID]
	if !ok || now.Sub(entry.firstSeen) > telegramAttemptWindow {
		l.entries[chatID] = &attemptEntry{count: 1, firstSeen: now}
		return 0
	}
	entry.count++
	if entry.count >= maxTelegramAttempts {
		entry.lockedFor = now.Add(telegramAttemptWindow)
		entry.count = 0
		entry.firstSeen = now
		return telegramAttemptWindow
	}
	return 0
}

func (l *verifyAttemptLimiter) reset(chatID string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.entries, chatID)
}

// recordFailedAttempt logs the failure and locks the chat out after too many.
func (h *Handler) recordFailedAttempt(c *gin.Context, chatID string) {
	now := time.Now()
	if lock := telegramAttempts.fail(chatID, now); lock > 0 {
		log.Printf("[botservice] telegram verify locked out after %d failed attempts", maxTelegramAttempts)
	}
}

// VerifyTelegram links a telegram chat to a user via verify code.
// POST /internal/telegram/verify
// Logic moved here from the old in-process bot so ressist-bot stays stateless.
func (h *Handler) VerifyTelegram(c *gin.Context) {
	var req verifyTelegramRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}
	req.Code = strings.TrimSpace(req.Code)
	req.ChatID = strings.TrimSpace(req.ChatID)
	if req.Code == "" || req.ChatID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "code and chat_id are required"})
		return
	}

	if ok, wait := telegramAttempts.allow(req.ChatID, time.Now()); !ok {
		seconds := int(wait.Seconds())
		if seconds < 1 {
			seconds = 1
		}
		c.Header("Retry-After", strconv.Itoa(seconds))
		c.JSON(http.StatusTooManyRequests, gin.H{
			"error":               "too many failed attempts",
			"retry_after_seconds": seconds,
		})
		return
	}

	var user models.User
	if err := h.db.WithContext(c.Request.Context()).
		Where("telegram_verify_code = ? AND telegram_verify_expires > ?", req.Code, time.Now()).
		First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// A wrong guess must cost something, otherwise the code space can
			// be swept silently. Attribute the failure to the user who owns an
			// active code so the counter has somewhere to live.
			h.recordFailedAttempt(c, req.ChatID)
			c.JSON(http.StatusNotFound, gin.H{"error": "invalid or expired code"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}

	// A wrong guess must cost something, otherwise the 8-character code space
	// can be swept silently. The failure cannot be attributed to a user row
	// (we do not know whose code was guessed), so the counter is keyed by the
	// chat id that is doing the guessing.
	if err := h.db.WithContext(c.Request.Context()).
		Where("telegram_verify_code = ? AND telegram_verify_expires > ?", req.Code, time.Now()).
		First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			h.recordFailedAttempt(c, req.ChatID)
			c.JSON(http.StatusNotFound, gin.H{"error": "invalid or expired code"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}

	updates := map[string]interface{}{
		"telegram_chat_id":        &req.ChatID,
		"telegram_enabled":        true,
		"telegram_verify_code":    nil,
		"telegram_verify_expires": nil,
	}
	if req.TelegramUsername != nil && strings.TrimSpace(*req.TelegramUsername) != "" {
		username := strings.TrimSpace(*req.TelegramUsername)
		updates["telegram_username"] = &username
	}
	if err := h.db.WithContext(c.Request.Context()).
		Model(&user).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to link telegram"})
		return
	}
	telegramAttempts.reset(req.ChatID)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"user_id": user.ID,
		"name":    user.Name,
	})
}

type dueAssignment struct {
	ID            string     `json:"id"`
	UserID        string     `json:"user_id"`
	Title         string     `json:"title"`
	Course        *string    `json:"course"`
	ClassCode     *string    `json:"class_code"`
	Deadline      time.Time  `json:"deadline"`
	RemindersSent string     `json:"reminders_sent"`
	ChatID        *string    `json:"telegram_chat_id"`
	UserName      string     `json:"user_name"`
	Completed     bool       `json:"completed"`
	// User prefs for bot-side filtering (muted/class/keyword + reminder_hours)
	MutedCourses         string  `json:"muted_courses"`
	UserClassCode        *string `json:"user_class_code"`
	CourseKeywordFilters string  `json:"course_keyword_filters"`
	ReminderHours        string  `json:"reminder_hours"`
}

// GetDueAssignments returns assignments due ~hoursBefore from now with owner chat info.
// GET /internal/scheduler/due?hours_before=24&window_minutes=30
// Lets the stateless bot send reminders without DB access.
func (h *Handler) GetDueAssignments(c *gin.Context) {
	hoursBefore := atoiDefault(c.Query("hours_before"), 24)
	windowMinutes := atoiDefault(c.Query("window_minutes"), 12)

	wib := time.FixedZone("WIB", 7*3600)
	now := time.Now().In(wib)
	target := now.Add(time.Duration(hoursBefore) * time.Hour)
	start := target.Add(-time.Duration(windowMinutes) * time.Minute)
	end := target.Add(time.Duration(windowMinutes) * time.Minute)

	var rows []dueAssignment
	if err := h.db.WithContext(c.Request.Context()).
		Table("events").
		Select("events.id, events.user_id, events.title, events.course, events.class_code, events.deadline, events.reminders_sent, events.completed, users.telegram_chat_id, users.name as user_name, users.muted_courses, users.class_code as user_class_code, users.course_keyword_filters, users.reminder_hours").
		Joins("JOIN users ON users.id = events.user_id").
		Where("events.deadline BETWEEN ? AND ? AND ((events.status = ? OR events.status IS NULL OR events.status = '') AND events.completed = ?) AND users.telegram_enabled = ? AND users.telegram_chat_id IS NOT NULL", start, end, "pending", false, true).
		Scan(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}
	if rows == nil {
		rows = []dueAssignment{}
	}
	c.JSON(http.StatusOK, rows)
}

type markSentRequest struct {
	AssignmentID string `json:"assignment_id"`
	Key          string `json:"key"`
}

// MarkReminderSent appends a reminder key (e.g. "24h") to events.reminders_sent.
// POST /internal/scheduler/mark-sent
func (h *Handler) MarkReminderSent(c *gin.Context) {
	var req markSentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}
	req.AssignmentID = strings.TrimSpace(req.AssignmentID)
	req.Key = strings.TrimSpace(req.Key)
	if req.AssignmentID == "" || req.Key == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "assignment_id and key are required"})
		return
	}

	var event models.Event
	if err := h.db.WithContext(c.Request.Context()).
		Where("id = ?", req.AssignmentID).
		First(&event).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "assignment not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}
	if containsReminder(event.RemindersSent, req.Key) {
		c.JSON(http.StatusOK, gin.H{"success": true, "already_sent": true})
		return
	}
	newReminders := event.RemindersSent
	if newReminders != "" {
		newReminders += ","
	}
	newReminders += req.Key
	if err := h.db.WithContext(c.Request.Context()).
		Model(&event).Update("reminders_sent", newReminders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

type briefingCandidate struct {
	ID           string  `json:"id"`
	Name         string  `json:"name"`
	TelegramChat *string `json:"telegram_chat_id"`
}

// GetBriefingCandidates returns users eligible for the morning briefing.
// GET /internal/scheduler/briefing-candidates
func (h *Handler) GetBriefingCandidates(c *gin.Context) {
	var rows []briefingCandidate
	if err := h.db.WithContext(c.Request.Context()).
		Table("users").
		Select("id, name, telegram_chat_id").
		Where("telegram_enabled = ? AND morning_briefing = ? AND telegram_chat_id IS NOT NULL", true, true).
		Scan(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}
	if rows == nil {
		rows = []briefingCandidate{}
	}
	c.JSON(http.StatusOK, rows)
}

func containsReminder(reminders, key string) bool {
	if reminders == "" {
		return false
	}
	for _, p := range strings.Split(reminders, ",") {
		if strings.TrimSpace(p) == key {
			return true
		}
	}
	return false
}

func atoiDefault(s string, def int) int {
	if strings.TrimSpace(s) == "" {
		return def
	}
	var n int
	if _, err := parseInt(s, &n); err != nil {
		return def
	}
	return n
}

func parseInt(s string, out *int) (int, error) {
	var n int
	for _, r := range strings.TrimSpace(s) {
		if r < '0' || r > '9' {
			return 0, errNotNumber
		}
		n = n*10 + int(r-'0')
	}
	*out = n
	return n, nil
}

var errNotNumber = errString("not a number")

type errString string

func (e errString) Error() string { return string(e) }
