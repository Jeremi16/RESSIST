package scheduler

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"github.com/jeremi16/ressist-bot/internal/client"
	"github.com/robfig/cron/v3"
)

// Scheduler sends periodic notifications via the SendFunc (telegram).
// All data comes from ressist-api over HTTP. No DB here.
type Scheduler struct {
	client *client.Client
	send   func(chatID int64, text string) error
	cron   *cron.Cron
}

func New(c *client.Client, send func(chatID int64, text string) error) *Scheduler {
	return &Scheduler{
		client: c,
		send:   send,
		cron:   cron.New(cron.WithLocation(time.FixedZone("WIB", 7*3600))),
	}
}

// Start registers cron jobs and blocks until ctx cancelled.
func (s *Scheduler) Start(ctx context.Context) error {
	jobs := []struct {
		spec string
		fn   func()
		name string
	}{
		{"0 7 * * *", s.sendMorningBriefing, "morning briefing"},
		{"0 9 * * *", func() { s.sendReminders(24) }, "24h reminder"},
		{"0 12 * * *", func() { s.sendReminders(12) }, "12h reminder"},
		{"0 18 * * *", func() { s.sendReminders(6) }, "6h reminder"},
		{"0 21 * * *", func() { s.sendReminders(3) }, "3h reminder"},
		{"0 * * * *", func() { s.sendReminders(1) }, "1h reminder"},
	}
	for _, j := range jobs {
		fn, name := j.fn, j.name
		if _, err := s.cron.AddFunc(j.spec, func() {
			log.Printf("Running %s job...", name)
			fn()
		}); err != nil {
			return fmt.Errorf("failed to add %s job: %w", name, err)
		}
	}

	s.cron.Start()
	log.Println("Bot scheduler started successfully")

	<-ctx.Done()
	s.cron.Stop()
	log.Println("Bot scheduler stopped")
	return nil
}

func (s *Scheduler) sendMorningBriefing() {
	candidates, err := s.client.GetBriefingCandidates()
	if err != nil {
		log.Printf("briefing candidates failed: %v", err)
		return
	}
	for _, u := range candidates {
		if u.TelegramChat == nil {
			continue
		}
		chatID, err := strconv.ParseInt(*u.TelegramChat, 10, 64)
		if err != nil {
			continue
		}
		items, err := s.client.GetAssignments(u.ID)
		if err != nil {
			log.Printf("assignments for %s failed: %v", u.ID, err)
			continue
		}
		now := time.Now()
		end := time.Date(now.Year(), now.Month(), now.Day()+1, 23, 59, 59, 0, now.Location())
		var filtered []string
		_ = filtered
		var pending []client.Assignment
		for _, a := range items {
			if a.Completed {
				continue
			}
			if a.Deadline.Before(now.Add(-1*time.Hour)) || a.Deadline.After(end) {
				continue
			}
			pending = append(pending, a)
		}
		text := buildBriefing(u.Name, pending)
		if err := s.send(chatID, text); err != nil {
			log.Printf("briefing to %s failed: %v", u.ID, err)
		} else {
			log.Printf("morning briefing sent to user %s", u.ID)
		}
	}
}

func (s *Scheduler) sendReminders(hoursBefore int) {
	key := fmt.Sprintf("%dh", hoursBefore)
	rows, err := s.client.GetDueAssignments(hoursBefore, 30)
	if err != nil {
		log.Printf("due assignments (%s) failed: %v", key, err)
		return
	}
	for _, a := range rows {
		if a.Completed || a.ChatID == nil {
			continue
		}
		if containsReminder(a.RemindersSent, key) {
			continue
		}
		chatID, err := strconv.ParseInt(*a.ChatID, 10, 64)
		if err != nil {
			continue
		}
		course := "N/A"
		if a.Course != nil && *a.Course != "" {
			course = *a.Course
		}
		if err := s.send(chatID, buildReminder(a.Title, course, a.Deadline)); err != nil {
			log.Printf("reminder to %s failed: %v", a.UserID, err)
			continue
		}
		if err := s.client.MarkReminderSent(a.ID, key); err != nil {
			log.Printf("mark-sent %s failed: %v", a.ID, err)
		}
	}
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

func buildBriefing(name string, items []client.Assignment) string {
	wib := time.FixedZone("WIB", 7*3600)
	now := time.Now().In(wib)
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("☀️ *Selamat Pagi, %s!*\n\n", name))
	sb.WriteString(fmt.Sprintf("📅 %s\n\n", now.Format("Monday, 2 January 2006")))
	sb.WriteString("📚 *Tugas yang Belum Dikerjakan:*\n\n")
	if len(items) == 0 {
		sb.WriteString("Yeay! Semua tugas sudah selesai. Santai dulu yuk! ☕\n\n")
	} else {
		for i, a := range items {
			course := "N/A"
			if a.Course != nil && *a.Course != "" {
				course = *a.Course
			}
			sb.WriteString(fmt.Sprintf("%d. *%s*\n", i+1, a.Title))
			sb.WriteString(fmt.Sprintf("   📖 %s\n", course))
			sb.WriteString(fmt.Sprintf("   ⏰ %s\n\n", a.Deadline.In(wib).Format("Monday, 2 Jan 15:04")))
		}
	}
	sb.WriteString("Semangat belajarnya! 💪\n\n")
	sb.WriteString("🌐 *Cek detail di:* [ressist.web.id](https://ressist.web.id)")
	return sb.String()
}

func buildReminder(title, course string, due time.Time) string {
	hours := int(time.Until(due).Hours())
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
		"%s *Pengingat Tugas*\n\n📚 *Kelas:* %s\n📝 *Tugas:* %s\n⏰ *Deadline:* %s\n⏳ *Sisa Waktu:* %d jam\n\nAyo segera dikerjakan! 💪\n\n🌐 *Detail:* [ressist.web.id](https://ressist.web.id)",
		emoji, course, title, due.In(time.FixedZone("WIB", 7*3600)).Format("Monday, 2 Jan 2006 15:04"), hours,
	)
}
