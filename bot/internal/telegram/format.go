package telegram

import (
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/jeremi16/resisst-bot/internal/client"
)

var wib = time.FixedZone("WIB", 7*3600)

func deref(s *string, fallback string) string {
	if s == nil || strings.TrimSpace(*s) == "" {
		return fallback
	}
	return *s
}

func pending(a []client.Assignment) []client.Assignment {
	out := make([]client.Assignment, 0, len(a))
	for _, x := range a {
		if !x.Completed {
			out = append(out, x)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Deadline.Before(out[j].Deadline) })
	return out
}

func formatAssignmentList(title string, items []client.Assignment) string {
	var sb strings.Builder
	sb.WriteString(title)
	sb.WriteString("\n\n")
	if len(items) == 0 {
		sb.WriteString("Yeay! Tidak ada tugas. Santai dulu yuk! ☕\n")
		return sb.String()
	}
	for i, a := range items {
		course := deref(a.Course, "N/A")
		dl := a.Deadline.In(wib)
		sb.WriteString(fmt.Sprintf("%d. *%s*\n", i+1, escape(a.Title)))
		sb.WriteString(fmt.Sprintf("   📖 %s\n", escape(course)))
		sb.WriteString(fmt.Sprintf("   ⏰ %s\n", dl.Format("Monday, 2 Jan 15:04")))
		sb.WriteString(fmt.Sprintf("   🆔 `%s`\n\n", a.ID))
	}
	sb.WriteString("Selesaikan via: `/selesai <id>`\n")
	sb.WriteString("🌐 Detail: [resisst.web.id](https://resisst.web.id)")
	return sb.String()
}

// escape minimal markdown chars for titles sent with ParseMode Markdown.
func escape(s string) string {
	s = strings.ReplaceAll(s, "_", "\\_")
	s = strings.ReplaceAll(s, "*", "\\*")
	return s
}

func filterDue(items []client.Assignment, from, to time.Time) []client.Assignment {
	var out []client.Assignment
	for _, a := range items {
		if a.Completed {
			continue
		}
		if !a.Deadline.Before(from) && !a.Deadline.After(to) {
			out = append(out, a)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Deadline.Before(out[j].Deadline) })
	return out
}

func formatReminder(title, course string, due time.Time) string {
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
		"%s *Pengingat Tugas*\n\n📚 *Kelas:* %s\n📝 *Tugas:* %s\n⏰ *Deadline:* %s\n⏳ *Sisa Waktu:* %d jam\n\nAyo segera dikerjakan! 💪\n\n🌐 *Detail:* [resisst.web.id](https://resisst.web.id)",
		emoji, escape(course), escape(title), due.In(wib).Format("Monday, 2 Jan 2006 15:04"), hours,
	)
}

func formatBriefing(name string, items []client.Assignment) string {
	now := time.Now().In(wib)
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("☀️ *Selamat Pagi, %s!*\n\n", escape(name)))
	sb.WriteString(fmt.Sprintf("📅 %s\n\n", now.Format("Monday, 2 January 2006")))
	sb.WriteString("📚 *Tugas yang Belum Dikerjakan:*\n\n")
	if len(items) == 0 {
		sb.WriteString("Yeay! Semua tugas sudah selesai. Santai dulu yuk! ☕\n\n")
	} else {
		for i, a := range items {
			course := deref(a.Course, "N/A")
			dl := a.Deadline.In(wib)
			sb.WriteString(fmt.Sprintf("%d. *%s*\n", i+1, escape(a.Title)))
			sb.WriteString(fmt.Sprintf("   📖 %s\n", escape(course)))
			sb.WriteString(fmt.Sprintf("   ⏰ %s\n\n", dl.Format("Monday, 2 Jan 15:04")))
		}
	}
	sb.WriteString("Semangat belajarnya! 💪\n\n")
	sb.WriteString("🌐 *Cek detail di:* [resisst.web.id](https://resisst.web.id)")
	return sb.String()
}
