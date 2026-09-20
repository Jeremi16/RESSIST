package telegram

import (
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"github.com/jeremi16/ressist-api/internal/models"
	"github.com/jeremi16/ressist-api/internal/pkg/classcode"
	"github.com/jeremi16/ressist-api/internal/pkg/text"
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

	// 2. Class Code (per-matkul single, fallback tampil semua) — efektif dari classCode atau Extract(title) agar manual langsung work tanpa sinkron
	effectiveCode := ""
	if classCode != nil && strings.TrimSpace(*classCode) != "" {
		effectiveCode = strings.TrimSpace(*classCode)
	} else if extracted := classcode.Extract(assignmentTitle); extracted != nil {
		effectiveCode = *extracted
	}
	hasEffective := effectiveCode != ""
	// Normalize perCourse keys
	normPerCourse := make(map[string]string)
	for k, v := range classcode.ParseCourseClassFilters(user.CourseClassFilters) {
		normPerCourse[text.Normalize(k)] = v
	}
	if normPer, ok := normPerCourse[text.Normalize(courseName)]; ok && strings.TrimSpace(normPer) != "" {
		if hasEffective && text.Normalize(effectiveCode) != text.Normalize(normPer) {
			return fmt.Errorf("assignment class code %s is filtered out by course filter %s", effectiveCode, normPer)
		}
	} else if len(normPerCourse) > 0 {
		// ada per-course map tapi course ini tidak diset -> tampil semua (no global fallback for Opsi A)
	} else if hasEffective {
		if !isClassCodeSelected(effectiveCode, user.ClassCode) {
			return fmt.Errorf("assignment class code %s is filtered out by user", effectiveCode)
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

	sisa := reminderDayLabel(dueDate, timeUntilDue, hours)

	message := fmt.Sprintf(
		"%s *Pengingat Tugas*\n\n"+
			"📚 *Kelas:* %s\n"+
			"📝 *Tugas:* %s\n"+
			"⏰ *Deadline:* %s WIB\n"+
			"⏳ *Sisa Waktu:* %s\n\n"+
			"Ayo segera dikerjakan! 💪\n\n"+
			"🌐 *Detail:* [ressist.web.id](https://ressist.web.id)",
		urgencyEmoji,
		courseName,
		assignmentTitle,
		dueDate.Format("Monday, 2 Jan 2006 15:04 WIB"),
		sisa,
	)

	return b.SendMessage(chatID, message)
}

// isClassCodeSelected checks if a class code is selected by the user.
// Uses pkg/classcode for parsing, normalized.
func isClassCodeSelected(classCode string, userClassCodesJSON *string) bool {
	if userClassCodesJSON == nil {
		return true
	}
	codes := classcode.ParseArray(*userClassCodesJSON)
	if len(codes) == 0 {
		return true
	}
	norm := text.Normalize(classCode)
	for _, code := range codes {
		if text.Normalize(code) == norm {
			return true
		}
	}
	return false
}

// reminderDayLabel maps reminder countdowns: midnight WIB in the 24-48h
// bucket -> "Hari ini", otherwise "besok" only when diff <=24h and the WIB
// calendar day differs. Outside those cases it falls back to "N jam".
func reminderDayLabel(due time.Time, d time.Duration, hours int) string {
	wib := time.FixedZone("WIB", 7*3600)
	dl := due.In(wib)
	nw := time.Now().In(wib)
	bedaHari := dl.YearDay() != nw.YearDay() || dl.Year() != nw.Year()
	isMidnight := dl.Hour() == 0 && dl.Minute() == 0
	switch {
	case hours >= 24 && hours < 48 && isMidnight:
		return "Hari ini"
	case d <= 24*time.Hour && d > 0 && bedaHari && !isMidnight:
		return "besok"
	default:
		if hours < 0 {
			hours = 0
		}
		return fmt.Sprintf("%d jam", hours)
	}
}

// Ensure log is used to avoid unused import if needed.
var _ = log.Printf
