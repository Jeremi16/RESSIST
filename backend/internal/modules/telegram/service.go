package telegram

import (
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"github.com/jeremi16/resisst-api/internal/models"
	"github.com/jeremi16/resisst-api/internal/pkg/classcode"
	"github.com/jeremi16/resisst-api/internal/pkg/text"
)

// SendMessage sends a markdown message to a chat.
func (b *Bot) SendMessage(chatID int64, message string) error {
	msg := tgbotapi.NewMessage(chatID, message)
	msg.ParseMode = "Markdown"
	_, err := b.api.Send(msg)
	return err
}

// SendAssignmentNotification sends a reminder for a single assignment respecting user filters.
func (b *Bot) SendAssignmentNotification(userID string, assignmentTitle string, courseName string, dueDate time.Time, classCode *string) error {
	var user models.User
	err := b.db.Where("id = ? AND telegram_enabled = ? AND telegram_chat_id IS NOT NULL", userID, true).First(&user).Error
	if err != nil {
		return fmt.Errorf("user not found or telegram not enabled: %w", err)
	}

	// 1. Muted Courses
	mutedList := classcode.ParseArray(user.MutedCourses)
	for _, m := range mutedList {
		if text.Normalize(m) == text.Normalize(courseName) {
			return fmt.Errorf("course %s is muted", courseName)
		}
	}

	// 2. Class Code
	if classCode != nil && *classCode != "" {
		if !isClassCodeSelected(*classCode, user.ClassCode) {
			return fmt.Errorf("assignment class code %s is filtered out by user", *classCode)
		}
	}

	// 3. Keyword Filter
	keywordFilters := classcode.ParseKeywordFilters(user.CourseKeywordFilters)
	if keywords, ok := keywordFilters[courseName]; ok && len(keywords) > 0 {
		found := false
		titleLower := strings.ToLower(assignmentTitle)
		for _, k := range keywords {
			if strings.Contains(titleLower, strings.ToLower(k)) {
				found = true
				break
			}
		}
		if !found {
			return fmt.Errorf("assignment title doesn't match keyword filters for course %s", courseName)
		}
	}

	if user.TelegramChatID == nil {
		return fmt.Errorf("telegram chat ID is nil")
	}

	chatID, err := strconv.ParseInt(*user.TelegramChatID, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid chat ID: %w", err)
	}

	timeUntilDue := time.Until(dueDate)
	hours := int(timeUntilDue.Hours())

	var urgencyEmoji string
	if hours <= 3 {
		urgencyEmoji = "🚨"
	} else if hours <= 12 {
		urgencyEmoji = "⚠️"
	} else {
		urgencyEmoji = "📌"
	}

	message := fmt.Sprintf(
		"%s *Pengingat Tugas*\n\n"+
			"📚 *Kelas:* %s\n"+
			"📝 *Tugas:* %s\n"+
			"⏰ *Deadline:* %s\n"+
			"⏳ *Sisa Waktu:* %d jam\n\n"+
			"Ayo segera dikerjakan! 💪\n\n"+
			"🌐 *Detail:* [resisst.web.id](https://resisst.web.id)",
		urgencyEmoji,
		courseName,
		assignmentTitle,
		dueDate.Format("Monday, 2 Jan 2006 15:04"),
		hours,
	)

	return b.SendMessage(chatID, message)
}

// isClassCodeSelected checks if a class code is selected by the user.
// Uses pkg/classcode for parsing.
func isClassCodeSelected(classCode string, userClassCodesJSON *string) bool {
	if userClassCodesJSON == nil {
		return true
	}
	codes := classcode.ParseArray(*userClassCodesJSON)
	if len(codes) == 0 {
		return true
	}
	for _, code := range codes {
		if code == classCode {
			return true
		}
	}
	return false
}

// Ensure log is used to avoid unused import if needed.
var _ = log.Printf
