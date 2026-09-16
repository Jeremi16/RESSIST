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
//
// Reminder design (fix untuk "24/12/6/1 tidak bekerja"):
// Satu job tiap 10 menit mengecek SEMUA bucket (24,12,6,3,1) dengan
// window ±10 menit di sisi backend. Desain lama (satu cron sehari per
// bucket, mis. 24h hanya jam 09:00) membuat deadline di jam lain
// tidak pernah kena window ±30 menit.
func (s *Scheduler) Start(ctx context.Context) error {
	jobs := []struct {
		spec string
		fn   func()
		name string
	}{
		{"0 7 * * *", s.sendMorningBriefing, "morning briefing"},
		{"*/10 * * * *", s.sendAllReminders, "all reminders (24/12/6/3/1h)"},
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

// sendAllReminders dipanggil tiap 10 menit dan mengecek semua bucket.
// Window 12 menit (interval 10 + buffer 2) agar tidak ada deadline yang
// lolos di sela jadwal, dan MarkReminderSent mencegah duplikat.
func (s *Scheduler) sendAllReminders() {
	for _, h := range []int{24, 12, 6, 3, 1} {
		s.sendReminders(h)
	}
}

func (s *Scheduler) sendReminders(hoursBefore int) {
	key := fmt.Sprintf("%dh", hoursBefore)
	// Window disamakan dengan interval cron (10 mnt + buffer).
	rows, err := s.client.GetDueAssignments(hoursBefore, 12)
	if err != nil {
		log.Printf("due assignments (%s) failed: %v", key, err)
		return
	}
	if len(rows) > 0 {
		log.Printf("reminders (%s): %d due rows", key, len(rows))
	}
	sent := 0
	for _, a := range rows {
		if a.Completed || a.ChatID == nil {
			continue
		}
		if containsReminder(a.RemindersSent, key) {
			continue
		}
		// Respect user's chosen reminder_hours (e.g. [24,6]). Skip if this bucket not selected.
		if !isReminderHourSelected(a.ReminderHours, hoursBefore) {
			continue
		}
		// Respect per-user filters (muted courses / class code / keyword)
		if isMuted(a.Course, a.MutedCourses) {
			continue
		}
		if !isClassCodeAllowed(a.ClassCode, a.UserClassCode) {
			continue
		}
		if !matchesKeywordFilter(a.Title, a.Course, a.CourseKeywordFilters) {
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
		} else {
			sent++
		}
	}
	if sent > 0 {
		log.Printf("reminders (%s): sent %d", key, sent)
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

func normalize(s string) string {
	return strings.Join(strings.Fields(strings.ToLower(strings.TrimSpace(s))), " ")
}

func parseArray(jsonStr string) []string {
	if strings.TrimSpace(jsonStr) == "" || strings.TrimSpace(jsonStr) == "[]" {
		return nil
	}
	trimmed := strings.TrimSpace(jsonStr)
	trimmed = strings.TrimPrefix(trimmed, "[")
	trimmed = strings.TrimSuffix(trimmed, "]")
	if strings.TrimSpace(trimmed) == "" {
		return nil
	}
	var out []string
	for _, part := range strings.Split(trimmed, ",") {
		code := strings.Trim(strings.TrimSpace(part), `"`)
		if code != "" {
			out = append(out, code)
		}
	}
	return out
}

func isReminderHourSelected(raw string, hoursBefore int) bool {
	// Default selaras dengan User.ReminderHours baru "[24,12,6,1]".
	if strings.TrimSpace(raw) == "" {
		raw = "[24,12,6,1]"
	}
	codes := parseArray(raw)
	if len(codes) == 0 {
		return false
	}
	target := strconv.Itoa(hoursBefore)
	for _, c := range codes {
		if strings.TrimSpace(c) == target {
			return true
		}
	}
	return false
}

func isMuted(course *string, mutedJSON string) bool {
	courseName := ""
	if course != nil {
		courseName = *course
	}
	norm := normalize(courseName)
	if norm == "" {
		return false
	}
	for _, m := range parseArray(mutedJSON) {
		if normalize(m) == norm {
			return true
		}
	}
	return false
}

func isClassCodeAllowed(classCode *string, userClassCodeJSON *string) bool {
	if classCode == nil || strings.TrimSpace(*classCode) == "" {
		return true
	}
	if userClassCodeJSON == nil || strings.TrimSpace(*userClassCodeJSON) == "" {
		return true
	}
	codes := parseArray(*userClassCodeJSON)
	if len(codes) == 0 {
		return true
	}
	norm := normalize(*classCode)
	for _, c := range codes {
		if normalize(c) == norm {
			return true
		}
	}
	return false
}

func parseKeywordFilters(jsonStr string) map[string][]string {
	filters := make(map[string][]string)
	if strings.TrimSpace(jsonStr) == "" || strings.TrimSpace(jsonStr) == "{}" {
		return filters
	}
	trimmed := strings.TrimSpace(jsonStr)
	trimmed = strings.TrimPrefix(trimmed, "{")
	trimmed = strings.TrimSuffix(trimmed, "}")
	if strings.TrimSpace(trimmed) == "" {
		return filters
	}
	// split on commas not inside quotes/brackets
	var pairs []string
	var cur strings.Builder
	inQuote := false
	bracketDepth := 0
	for i, r := range trimmed {
		if r == '"' && (i == 0 || trimmed[i-1] != '\\') {
			inQuote = !inQuote
		}
		if !inQuote {
			if r == '[' {
				bracketDepth++
			} else if r == ']' {
				bracketDepth--
			}
		}
		if r == ',' && !inQuote && bracketDepth == 0 {
			pairs = append(pairs, cur.String())
			cur.Reset()
			continue
		}
		cur.WriteRune(r)
	}
	if cur.Len() > 0 {
		pairs = append(pairs, cur.String())
	}
	for _, pair := range pairs {
		parts := strings.SplitN(pair, ":", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.Trim(strings.TrimSpace(parts[0]), `"`)
		val := strings.TrimSpace(parts[1])
		if key == "" || !strings.HasPrefix(val, "[") || !strings.HasSuffix(val, "]") {
			continue
		}
		keywords := parseArray(val)
		if len(keywords) > 0 {
			filters[normalize(key)] = keywords
		}
	}
	return filters
}

func matchesKeywordFilter(title string, course *string, keywordJSON string) bool {
	if strings.TrimSpace(keywordJSON) == "" || strings.TrimSpace(keywordJSON) == "{}" {
		return true
	}
	filters := parseKeywordFilters(keywordJSON)
	if len(filters) == 0 {
		return true
	}
	courseName := ""
	if course != nil {
		courseName = *course
	}
	normCourse := normalize(courseName)
	keywords, ok := filters[normCourse]
	if !ok || len(keywords) == 0 {
		return true
	}
	titleLower := strings.ToLower(title)
	for _, k := range keywords {
		if strings.Contains(titleLower, strings.ToLower(strings.TrimSpace(k))) {
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
		"%s *Pengingat Tugas*\n\n📚 *Kelas:* %s\n📝 *Tugas:* %s\n⏰ *Deadline:* %s WIB\n⏳ *Sisa Waktu:* %d jam\n\nAyo segera dikerjakan! 💪\n\n🌐 *Detail:* [ressist.web.id](https://ressist.web.id)",
		emoji, course, title, due.In(time.FixedZone("WIB", 7*3600)).Format("Monday, 2 Jan 2006 15:04 WIB"), hours,
	)
}
