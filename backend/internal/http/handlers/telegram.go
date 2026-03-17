package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jeremi16/resisst-api/internal/bot"
	"github.com/jeremi16/resisst-api/internal/models"
	"gorm.io/gorm"
)

type TelegramHandler struct {
	db  *gorm.DB
	bot *bot.Bot
}

func NewTelegramHandler(db *gorm.DB, telegramBot *bot.Bot) *TelegramHandler {
	return &TelegramHandler{
		db:  db,
		bot: telegramBot,
	}
}



func (h *TelegramHandler) SendTestReminder(c *gin.Context) {
	userID, ok := authenticatedUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// Try to find the closest upcoming assignment
	var assignment models.Event
	err := h.db.Where("user_id = ? AND deadline > ?", userID, time.Now()).Order("deadline asc").First(&assignment).Error

	var title, course string
	var deadline time.Time

	if err == nil {
		title = assignment.Title
		course = dereferenceString(assignment.Course, "N/A")
		deadline = assignment.Deadline
	} else {
		// Fallback to dummy if no assignments found
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

func (h *TelegramHandler) SendMorningBriefing(c *gin.Context) {
	userID, ok := authenticatedUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
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

	// Fetch assignments for today and tomorrow
	now := time.Now()
	endOfNextDay := time.Date(now.Year(), now.Month(), now.Day()+1, 23, 59, 59, 0, now.Location())

	var allAssignments []models.Event
	h.db.Where("user_id = ? AND deadline BETWEEN ? AND ?", userID, now, endOfNextDay).Order("deadline asc").Find(&allAssignments)

	assignments := FilterAssignments(allAssignments, user.MutedCourses, user.ClassCode, user.CourseKeywordFilters)

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
	message += "📚 *Daftar Tugas Mendatang:*\n\n"

	if len(assignments) == 0 {
		message += "Wah, sepertinya belum ada tugas baru. Santai dulu yuk! ☕\n\n"
	} else {
		for i, a := range assignments {
			course := "N/A"
			if a.Course != nil {
				course = *a.Course
			}
			
			// Convert UTC to WIB for display
			deadlineWIB := a.Deadline.In(wib)
			
			message += fmt.Sprintf("%d. *%s*\n", i+1, a.Title)
			message += fmt.Sprintf("   📖 %s\n", course)
			message += fmt.Sprintf("   ⏰ %s\n\n", deadlineWIB.Format("Monday, 2 Jan 15:04"))
		}
	}

	message += "Semangat belajarnya! 💪\n\n"
	message += "🌐 *Cek detail di:* [resisst.web.id](https://resisst.web.id)"
	return message
}
