package telegram

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jeremi16/ressist-api/internal/models"
	"github.com/jeremi16/ressist-api/internal/pkg/classcode"
	"github.com/jeremi16/ressist-api/internal/pkg/text"
	"github.com/jeremi16/ressist-api/internal/shared/middleware"
	"gorm.io/gorm"
)

// Handler handles telegram HTTP requests.
type Handler struct {
	db  *gorm.DB
	bot *Bot
}

// NewHandler creates a new telegram Handler.
func NewHandler(db *gorm.DB, telegramBot *Bot) *Handler {
	return &Handler{
		db:  db,
		bot: telegramBot,
	}
}

// SendTestReminder sends a test reminder to the authenticated user.
// It tries upcoming assignments in deadline order until one passes user filters
// (muted/class/keyword). If all are filtered, it sends a DUMMY so the user can
// still verify the Telegram connection. Filtered-out tasks return filtered:true
// instead of 500.
func (h *Handler) SendTestReminder(c *gin.Context) {
	userID, ok := middleware.AuthenticatedUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	if h.bot == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Telegram bot is not configured on the server"})
		return
	}

	wib := time.FixedZone("WIB", 7*3600)

	var assignments []models.Event
	h.db.Where("user_id = ? AND deadline > ?", userID, time.Now()).Order("deadline asc").Limit(10).Find(&assignments)

	// Try each upcoming assignment until one passes filters (SendAssignmentNotification handles muted/class/keyword)
	var lastFilterErr error
	for _, a := range assignments {
		title := a.Title
		course := text.Dereference(a.Course, "N/A")
		err := h.bot.SendAssignmentNotification(userID, title, course, a.Deadline.In(wib), a.ClassCode)
		if err == nil {
			c.JSON(http.StatusOK, gin.H{"success": true, "message": "Test reminder sent successfully"})
			return
		}
		if isFilterError(err) {
			lastFilterErr = err
			continue
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to send notification", "message": err.Error()})
		return
	}

	// All real assignments filtered (or no assignments at all) — send dummy via direct message
	// Dummy bypasses class/keyword filters but still checks telegram_enabled/chat_id
	var user models.User
	if err := h.db.Where("id = ? AND telegram_enabled = ? AND telegram_chat_id IS NOT NULL", userID, true).First(&user).Error; err != nil {
		// No telegram connection
		msg := "telegram not connected or not enabled"
		if lastFilterErr != nil {
			msg = fmt.Sprintf("semua tugas ter-filter (%s). Hubungkan Telegram untuk dummy test", lastFilterErr.Error())
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": msg})
		return
	}
	chatID, _ := strconv.ParseInt(*user.TelegramChatID, 10, 64)
	dummyDeadline := time.Now().Add(24 * time.Hour).In(wib)
	dummyMsg := buildTestReminderMessage("Tugas Contoh (DUMMY)", "Kelas Contoh", dummyDeadline)
	if err := h.bot.SendMessage(chatID, dummyMsg); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to send notification", "message": err.Error()})
		return
	}
	if lastFilterErr != nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Tugas asli ter-filter, dummy reminder dikirim. Cek Telegram.", "filtered": true, "reason": lastFilterErr.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Test reminder sent successfully (dummy)"})
}

func isFilterError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "is muted") || strings.Contains(msg, "filtered out") || strings.Contains(msg, "doesn't match keyword")
}

func buildTestReminderMessage(title, course string, due time.Time) string {
	d := time.Until(due)
	hours := int(d.Hours())
	if hours < 0 {
		hours = 0
	}
	emoji := "📌"
	switch {
	case hours <= 3:
		emoji = "🚨"
	case hours <= 12:
		emoji = "⚠️"
	}
	return fmt.Sprintf(
		"%s *Pengingat Tugas*\n\n📚 *Kelas:* %s\n📝 *Tugas:* %s\n⏰ *Deadline:* %s WIB\n⏳ *Sisa Waktu:* %s\n\nAyo segera dikerjakan! 💪\n\n🌐 *Detail:* [ressist.web.id](https://ressist.web.id)",
		emoji, course, title, due.Format("Monday, 2 Jan 2006 15:04 WIB"), reminderDayLabel(due, d, hours),
	)
}

// SendMorningBriefing sends a morning briefing to the authenticated user.
func (h *Handler) SendMorningBriefing(c *gin.Context) {
	userID, ok := middleware.AuthenticatedUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	if h.bot == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Telegram bot is not configured on the server"})
		return
	}

	var user models.User
	err := h.db.Where("id = ? AND telegram_enabled = ? AND telegram_chat_id IS NOT NULL", userID, true).First(&user).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusBadRequest, gin.H{"error": "telegram not connected or not enabled"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		}
		return
	}

	if user.TelegramChatID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "telegram chat ID not found"})
		return
	}

	chatID, _ := strconv.ParseInt(*user.TelegramChatID, 10, 64)

	wib := time.FixedZone("WIB", 7*3600)
	now := time.Now().In(wib)
	endOfNextDay := time.Date(now.Year(), now.Month(), now.Day()+1, 23, 59, 59, 0, wib)

	var allAssignments []models.Event
	h.db.Where("user_id = ? AND ((status = ? OR status IS NULL OR status = '') AND completed = ?) AND deadline BETWEEN ? AND ?", userID, "pending", false, now, endOfNextDay).Order("deadline asc").Find(&allAssignments)

	assignments := classcode.FilterWithCourseClass(allAssignments, user.MutedCourses, user.ClassCode, user.CourseKeywordFilters, user.CourseClassFilters)

	message := buildMorningBriefingMessage(user.Name, assignments)
	err = h.bot.SendMessage(chatID, message)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "failed to send morning briefing",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Morning briefing sent successfully",
	})
}

func buildMorningBriefingMessage(userName string, assignments []models.Event) string {
	wib := time.FixedZone("WIB", 7*3600)
	now := time.Now().In(wib)

	message := fmt.Sprintf("☀️ *Selamat Pagi, %s!*\n\n", userName)
	message += fmt.Sprintf("📅 %s\n\n", now.Format("Monday, 2 January 2006"))
	message += "📚 *Tugas yang Belum Dikerjakan:*\n\n"

	if len(assignments) == 0 {
		message += "Yeay! Semua tugas sudah selesai. Santai dulu yuk! ☕\n\n"
	} else {
		for i, a := range assignments {
			course := "N/A"
			if a.Course != nil {
				course = *a.Course
			}
			deadlineWIB := a.Deadline.In(wib)
			message += fmt.Sprintf("%d. *%s*\n", i+1, a.Title)
			message += fmt.Sprintf("   📖 %s\n", course)
			message += fmt.Sprintf("   ⏰ %s\n\n", deadlineWIB.Format("Monday, 2 Jan 15:04"))
		}
	}

	message += "Semangat belajarnya! 💪\n\n"
	message += "🌐 *Cek detail di:* [ressist.web.id](https://ressist.web.id)"
	return message
}
