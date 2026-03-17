package bot

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"github.com/robfig/cron/v3"
	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"github.com/jeremi16/resisst-api/internal/models"
)

type Scheduler struct {
	bot  *Bot
	cron *cron.Cron
}

func NewScheduler(bot *Bot) *Scheduler {
	return &Scheduler{
		bot:  bot,
		cron: cron.New(cron.WithLocation(time.FixedZone("WIB", 7*3600))),
	}
}

func (s *Scheduler) Start(ctx context.Context) error {
	_, err := s.cron.AddFunc("0 7 * * *", func() {
		log.Println("Running morning briefing job...")
		s.sendMorningBriefing()
	})
	if err != nil {
		return fmt.Errorf("failed to add morning briefing job: %w", err)
	}

	_, err = s.cron.AddFunc("0 9 * * *", func() {
		log.Println("Running 24h reminder job...")
		s.sendReminders(24)
	})
	if err != nil {
		return fmt.Errorf("failed to add 24h reminder job: %w", err)
	}

	_, err = s.cron.AddFunc("0 12 * * *", func() {
		log.Println("Running 12h reminder job...")
		s.sendReminders(12)
	})
	if err != nil {
		return fmt.Errorf("failed to add 12h reminder job: %w", err)
	}

	_, err = s.cron.AddFunc("0 18 * * *", func() {
		log.Println("Running 6h reminder job...")
		s.sendReminders(6)
	})
	if err != nil {
		return fmt.Errorf("failed to add 6h reminder job: %w", err)
	}

	_, err = s.cron.AddFunc("0 21 * * *", func() {
		log.Println("Running 3h reminder job...")
		s.sendReminders(3)
	})
	if err != nil {
		return fmt.Errorf("failed to add 3h reminder job: %w", err)
	}

	_, err = s.cron.AddFunc("0 * * * *", func() {
		log.Println("Running 1h reminder job...")
		s.sendReminders(1)
	})
	if err != nil {
		return fmt.Errorf("failed to add 1h reminder job: %w", err)
	}

	s.cron.Start()
	log.Println("Telegram scheduler started successfully")

	<-ctx.Done()
	s.cron.Stop()
	log.Println("Telegram scheduler stopped")
	return nil
}

func (s *Scheduler) sendMorningBriefing() {
	var users []models.User
	err := s.bot.db.Where("telegram_enabled = ? AND morning_briefing = ? AND telegram_chat_id IS NOT NULL", true, true).Find(&users).Error
	if err != nil {
		log.Printf("error fetching users for morning briefing: %v", err)
		return
	}

	for _, user := range users {
		if user.TelegramChatID == nil {
			continue
		}

		chatID, err := strconv.ParseInt(*user.TelegramChatID, 10, 64)
		if err != nil {
			log.Printf("invalid chat ID for user %s: %v", user.ID, err)
			continue
		}

		// Fetch assignments for today and tomorrow
		now := time.Now()
		endOfNextDay := time.Date(now.Year(), now.Month(), now.Day()+1, 23, 59, 59, 0, now.Location())

		var allAssignments []models.Event
		s.bot.db.Where("user_id = ? AND deadline BETWEEN ? AND ?", user.ID, now, endOfNextDay).Order("deadline asc").Find(&allAssignments)

		// Filter assignments
		var assignments []models.Event
		mutedList := parseJSONArray(user.MutedCourses)
		mutedMap := make(map[string]bool)
		for _, m := range mutedList {
			mutedMap[normalizeTextForBot(m)] = true
		}

		keywordFilters := parseKeywordFilters(user.CourseKeywordFilters)
		normKeywordFilters := make(map[string][]string)
		for course, keywords := range keywordFilters {
			normKeywordFilters[normalizeTextForBot(course)] = keywords
		}

		for _, a := range allAssignments {
			courseName := ""
			if a.Course != nil {
				courseName = *a.Course
			}
			normCourse := normalizeTextForBot(courseName)

			// 1. Muted
			if mutedMap[normCourse] {
				continue
			}

			// 2. Class Code
			if a.ClassCode != nil && *a.ClassCode != "" {
				if !isClassCodeSelected(*a.ClassCode, user.ClassCode) {
					continue
				}
			}

			// 3. Keywords
			if keywords, ok := normKeywordFilters[normCourse]; ok && len(keywords) > 0 {
				found := false
				titleLower := strings.ToLower(a.Title)
				for _, k := range keywords {
					if strings.Contains(titleLower, strings.ToLower(k)) {
						found = true
						break
					}
				}
				if !found {
					continue
				}
			}

			assignments = append(assignments, a)
		}

		message := s.buildMorningBriefingMessage(user, assignments)
		msg := tgbotapi.NewMessage(chatID, message)
		msg.ParseMode = "Markdown"

		if _, err := s.bot.api.Send(msg); err != nil {
			log.Printf("failed to send morning briefing to user %s: %v", user.ID, err)
		} else {
			log.Printf("morning briefing sent to user %s", user.ID)
		}
	}
}

func (s *Scheduler) buildMorningBriefingMessage(user models.User, assignments []models.Event) string {
	wib := time.FixedZone("WIB", 7*3600)
	now := time.Now().In(wib)
	
	message := fmt.Sprintf("☀️ *Selamat Pagi, %s!*\n\n", user.Name)
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

func (s *Scheduler) sendReminders(hoursBeforeDeadline int) {
	log.Printf("Checking reminders for %d hours before deadline", hoursBeforeDeadline)
	
	now := time.Now()
	targetTime := now.Add(time.Duration(hoursBeforeDeadline) * time.Hour)
	
	// Check window +/- 30 minutes
	start := targetTime.Add(-30 * time.Minute)
	end := targetTime.Add(30 * time.Minute)

	var assignments []models.Event
	err := s.bot.db.Where("deadline BETWEEN ? AND ?", start, end).Find(&assignments).Error
	if err != nil {
		log.Printf("error fetching assignments for reminders: %v", err)
		return
	}

	for _, a := range assignments {
		reminderKey := fmt.Sprintf("%dh", hoursBeforeDeadline)
		// Check if this reminder was already sent
		if containsReminder(a.RemindersSent, reminderKey) {
			continue
		}

		course := "N/A"
		if a.Course != nil {
			course = *a.Course
		}

		err := s.bot.SendAssignmentNotification(a.UserID, a.Title, course, a.Deadline, a.ClassCode)
		if err == nil {
			// Update RemindersSent
			newReminders := a.RemindersSent
			if newReminders != "" {
				newReminders += ","
			}
			newReminders += reminderKey
			s.bot.db.Model(&a).Update("RemindersSent", newReminders)
		}
	}
}

func containsReminder(reminders string, key string) bool {
	if reminders == "" {
		return false
	}
	parts := strings.Split(reminders, ",")
	for _, p := range parts {
		if p == key {
			return true
		}
	}
	return false
}

// parsing utility for class codes in bot package to avoid circular dependency
func isClassCodeSelected(classCode string, userClassCodesJson *string) bool {
	if userClassCodesJson == nil {
		return true
	}
	codes := parseJSONArray(*userClassCodesJson)
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

func normalizeTextForBot(value string) string {
	return strings.Join(strings.Fields(strings.ToLower(strings.TrimSpace(value))), " ")
}

func parseJSONArray(jsonStr string) []string {
	codes := make([]string, 0)
	if strings.TrimSpace(jsonStr) == "" || jsonStr == "[]" {
		return codes
	}

	trimmed := strings.TrimSpace(jsonStr)
	trimmed = strings.TrimPrefix(trimmed, "[")
	trimmed = strings.TrimSuffix(trimmed, "]")

	if trimmed == "" {
		return codes
	}

	parts := strings.Split(trimmed, ",")
	for _, part := range parts {
		code := strings.Trim(strings.TrimSpace(part), `"`)
		if code != "" {
			codes = append(codes, code)
		}
	}
	return codes
}

func parseKeywordFilters(jsonStr string) map[string][]string {
	filters := make(map[string][]string)
	if strings.TrimSpace(jsonStr) == "" || jsonStr == "{}" {
		return filters
	}

	trimmed := strings.TrimSpace(jsonStr)
	trimmed = strings.TrimPrefix(trimmed, "{")
	trimmed = strings.TrimSuffix(trimmed, "}")

	if trimmed == "" {
		return filters
	}

	pairs := splitJSONPairsForBot(trimmed)
	for _, pair := range pairs {
		parts := strings.SplitN(pair, ":", 2)
		if len(parts) == 2 {
			key := strings.Trim(strings.TrimSpace(parts[0]), `"`)
			valuePart := strings.TrimSpace(parts[1])
			if key != "" && strings.HasPrefix(valuePart, "[") && strings.HasSuffix(valuePart, "]") {
				keywords := parseJSONArray(valuePart)
				if len(keywords) > 0 {
					filters[key] = keywords
				}
			}
		}
	}
	return filters
}

func splitJSONPairsForBot(s string) []string {
	var pairs []string
	var current strings.Builder
	inQuote := false

	for i, r := range s {
		if r == '"' && (i == 0 || s[i-1] != '\\') {
			inQuote = !inQuote
		}
		if r == ',' && !inQuote {
			pairs = append(pairs, current.String())
			current.Reset()
			continue
		}
		current.WriteRune(r)
	}
	if current.Len() > 0 {
		pairs = append(pairs, current.String())
	}
	return pairs
}



func (b *Bot) SendMessage(chatID int64, message string) error {
	msg := tgbotapi.NewMessage(chatID, message)
	msg.ParseMode = "Markdown"
	_, err := b.api.Send(msg)
	return err
}

func (b *Bot) SendAssignmentNotification(userID string, assignmentTitle string, courseName string, dueDate time.Time, classCode *string) error {
	var user models.User
	err := b.db.Where("id = ? AND telegram_enabled = ? AND telegram_chat_id IS NOT NULL", userID, true).First(&user).Error
	if err != nil {
		return fmt.Errorf("user not found or telegram not enabled: %w", err)
	}

	// 1. Muted Courses
	mutedList := parseJSONArray(user.MutedCourses)
	for _, m := range mutedList {
		if normalizeTextForBot(m) == normalizeTextForBot(courseName) {
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
	keywordFilters := parseKeywordFilters(user.CourseKeywordFilters)
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
