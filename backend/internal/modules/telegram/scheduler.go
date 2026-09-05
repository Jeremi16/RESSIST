package telegram

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
	"github.com/jeremi16/resisst-api/internal/pkg/classcode"
	"github.com/jeremi16/resisst-api/internal/pkg/text"
)

// Scheduler handles periodic telegram notifications.
type Scheduler struct {
	bot  *Bot
	cron *cron.Cron
}

// NewScheduler creates a new Scheduler.
func NewScheduler(bot *Bot) *Scheduler {
	return &Scheduler{
		bot:  bot,
		cron: cron.New(cron.WithLocation(time.FixedZone("WIB", 7*3600))),
	}
}

// Start registers cron jobs and blocks until context cancelled.
func (s *Scheduler) Start(ctx context.Context) error {
	if _, err := s.cron.AddFunc("0 7 * * *", func() {
		log.Println("Running morning briefing job...")
		s.sendMorningBriefing()
	}); err != nil {
		return fmt.Errorf("failed to add morning briefing job: %w", err)
	}
	if _, err := s.cron.AddFunc("0 9 * * *", func() {
		log.Println("Running 24h reminder job...")
		s.sendReminders(24)
	}); err != nil {
		return fmt.Errorf("failed to add 24h reminder job: %w", err)
	}
	if _, err := s.cron.AddFunc("0 12 * * *", func() {
		log.Println("Running 12h reminder job...")
		s.sendReminders(12)
	}); err != nil {
		return fmt.Errorf("failed to add 12h reminder job: %w", err)
	}
	if _, err := s.cron.AddFunc("0 18 * * *", func() {
		log.Println("Running 6h reminder job...")
		s.sendReminders(6)
	}); err != nil {
		return fmt.Errorf("failed to add 6h reminder job: %w", err)
	}
	if _, err := s.cron.AddFunc("0 21 * * *", func() {
		log.Println("Running 3h reminder job...")
		s.sendReminders(3)
	}); err != nil {
		return fmt.Errorf("failed to add 3h reminder job: %w", err)
	}
	if _, err := s.cron.AddFunc("0 * * * *", func() {
		log.Println("Running 1h reminder job...")
		s.sendReminders(1)
	}); err != nil {
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

		now := time.Now()
		endOfNextDay := time.Date(now.Year(), now.Month(), now.Day()+1, 23, 59, 59, 0, now.Location())

		var allAssignments []models.Event
		s.bot.db.Where("user_id = ? AND completed = ? AND deadline BETWEEN ? AND ?", user.ID, false, now, endOfNextDay).Order("deadline asc").Find(&allAssignments)

		// Filter assignments using pkg helpers.
		var assignments []models.Event
		mutedList := classcode.ParseArray(user.MutedCourses)
		mutedMap := make(map[string]bool)
		for _, m := range mutedList {
			mutedMap[text.Normalize(m)] = true
		}

		keywordFilters := classcode.ParseKeywordFilters(user.CourseKeywordFilters)
		normKeywordFilters := make(map[string][]string)
		for course, keywords := range keywordFilters {
			normKeywordFilters[text.Normalize(course)] = keywords
		}

		for _, a := range allAssignments {
			courseName := ""
			if a.Course != nil {
				courseName = *a.Course
			}
			normCourse := text.Normalize(courseName)

			if mutedMap[normCourse] {
				continue
			}
			if a.ClassCode != nil && *a.ClassCode != "" {
				if !isClassCodeSelected(*a.ClassCode, user.ClassCode) {
					continue
				}
			}
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
	message += "🌐 *Cek detail di:* [resisst.web.id](https://resisst.web.id)"
	return message
}

func (s *Scheduler) sendReminders(hoursBeforeDeadline int) {
	log.Printf("Checking reminders for %d hours before deadline", hoursBeforeDeadline)

	now := time.Now()
	targetTime := now.Add(time.Duration(hoursBeforeDeadline) * time.Hour)
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
		if containsReminder(a.RemindersSent, reminderKey) {
			continue
		}
		course := "N/A"
		if a.Course != nil {
			course = *a.Course
		}
		err := s.bot.SendAssignmentNotification(a.UserID, a.Title, course, a.Deadline, a.ClassCode)
		if err == nil {
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
