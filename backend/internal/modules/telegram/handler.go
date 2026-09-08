package telegram

import (
	"fmt"
	"net/http"
	"strconv"
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

	var assignment models.Event
	err := h.db.Where("user_id = ? AND deadline > ?", userID, time.Now()).Order("deadline asc").First(&assignment).Error

	var title, course string
	var deadline time.Time

	if err == nil {
		title = assignment.Title
		course = text.Dereference(assignment.Course, "N/A")
		deadline = assignment.Deadline
	} else {
		title = "Tugas Contoh (DUMMY)"
		course = "Kelas Contoh"
		deadline = time.Now().Add(24 * time.Hour)
	}

	wib := time.FixedZone("WIB", 7*3600)
	err = h.bot.SendAssignmentNotification(
		userID,
		title,
		course,
		deadline.In(wib),
		assignment.ClassCode,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "failed to send notification",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Test reminder sent successfully",
	})
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

	now := time.Now()
	endOfNextDay := time.Date(now.Year(), now.Month(), now.Day()+1, 23, 59, 59, 0, now.Location())

	var allAssignments []models.Event
	h.db.Where("user_id = ? AND (status = ? OR (status IS NULL OR status = '') AND completed = ?) AND deadline BETWEEN ? AND ?", userID, "pending", false, now, endOfNextDay).Order("deadline asc").Find(&allAssignments)

	assignments := classcode.Filter(allAssignments, user.MutedCourses, user.ClassCode, user.CourseKeywordFilters)

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
