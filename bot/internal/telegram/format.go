package telegram

import (
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/jeremi16/ressist-bot/internal/client"
)

var wib = time.FixedZone("WIB", 7*3600)

func deref(s *string, fallback string) string {
	if s == nil || strings.TrimSpace(*s) == "" {
		return fallback
	}
	return *s
}

const pageSize = 5

func urgencyEmoji(due time.Time) string {
	hours := int(time.Until(due).Hours())
	switch {
	case hours <= 3:
		return "🚨"
	case hours <= 12:
		return "⚠️"
	case hours <= 24:
		return "⏰"
	default:
		return "📌"
	}
}

func shortCourse(s *string) string {
	c := deref(s, "N/A")
	r := []rune(c)
	if len(r) <= 12 {
		return c
	}
	return string(r[:12]) + "…"
}

// truncateSmart preserves uniqueness when peers share long common prefix.
// If titles share prefix >10, it keeps head and tail to disambiguate.
// Otherwise plain truncateRunes.
func truncateSmart(s string, n int, peers []client.Assignment) string {
	r := []rune(s)
	if len(r) <= n {
		return s
	}
	// detect common prefix among peers
	if len(peers) > 1 {
		common := longestCommonPrefixRunes(peers)
		if common >= 10 && len(r) > n {
			// keep head 8 + "…" + tail to fill n
			head := 8
			if head > n-2 {
				head = n - 2
			}
			tail := n - head - 1
			if tail < 3 {
				tail = 3
			}
			return string(r[:head]) + "…" + string(r[len(r)-tail:])
		}
	}
	return string(r[:n]) + "…"
}

func longestCommonPrefixRunes(peers []client.Assignment) int {
	if len(peers) == 0 {
		return 0
	}
	base := []rune(peers[0].Title)
	lcp := len(base)
	for _, p := range peers[1:] {
		rr := []rune(p.Title)
		n := len(base)
		if len(rr) < n {
			n = len(rr)
		}
		i := 0
		for i < n && base[i] == rr[i] {
			i++
		}
		if i < lcp {
			lcp = i
		}
		if lcp == 0 {
			break
		}
	}
	return lcp
}

func buttonLabel(idx int, a client.Assignment, peers []client.Assignment) string {
	// 1-indexed for UX consistency with list
	emoji := urgencyEmoji(a.Deadline)
	titlePart := truncateSmart(a.Title, 18, peers)
	// format: "🚨 1. Title"
	return fmt.Sprintf("%s %d. %s", emoji, idx+1, titlePart)
}

func isClassroom(a client.Assignment) bool {
	return strings.Contains(strings.ToLower(a.Source), "google")
}

func timeRemaining(due time.Time) string {
	d := time.Until(due)
	if d < 0 {
		return "terlewat"
	}
	h := int(d.Hours())
	if h < 24 {
		return fmt.Sprintf("%d jam", h)
	}
	days := h / 24
	rem := h % 24
	if rem == 0 {
		return fmt.Sprintf("%d hari", days)
	}
	return fmt.Sprintf("%d hari %d jam", days, rem)
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
	return formatAssignmentListPaged(title, items, 0)
}

func formatAssignmentListPaged(title string, items []client.Assignment, page int) string {
	var sb strings.Builder
	sb.WriteString(title)
	total := len(items)
	if total == 0 {
		sb.WriteString("\n\nYeay! Tidak ada tugas. Santai dulu yuk! ☕\n")
		return sb.String()
	}
	pages := (total + pageSize - 1) / pageSize
	if page < 0 {
		page = 0
	}
	if page >= pages {
		page = pages - 1
	}
	sb.WriteString(fmt.Sprintf(" — hal %d/%d\n\n", page+1, pages))
	start := page * pageSize
	end := start + pageSize
	if end > total {
		end = total
	}
	for i := start; i < end; i++ {
		a := items[i]
		course := deref(a.Course, "N/A")
		dl := a.Deadline.In(wib)
		emoji := urgencyEmoji(a.Deadline)
		sb.WriteString(fmt.Sprintf("%s *%d. %s*\n", emoji, i+1, escape(a.Title)))
		sb.WriteString(fmt.Sprintf("   📖 %s", escape(course)))
		if a.ClassCode != nil && strings.TrimSpace(*a.ClassCode) != "" {
			sb.WriteString(fmt.Sprintf(" · `%s`", escape(strings.TrimSpace(*a.ClassCode))))
		}
		sb.WriteString("\n")
		sb.WriteString(fmt.Sprintf("   ⏰ %s (%s)\n", dl.Format("Monday, 2 Jan 15:04"), timeRemaining(a.Deadline)))
		if isClassroom(a) {
			sb.WriteString("   🔒 Classroom (ikuti Classroom)\n")
		} else {
			sb.WriteString(fmt.Sprintf("   🆔 `%s`\n", a.ID))
		}
		if a.URL != nil && strings.TrimSpace(*a.URL) != "" {
			sb.WriteString(fmt.Sprintf("   🔗 %s\n", escape(strings.TrimSpace(*a.URL))))
		}
		sb.WriteString("\n")
	}
	if total > pageSize {
		sb.WriteString(fmt.Sprintf("_%d tugas total, %d di halaman ini_\n", total, end-start))
	}
	sb.WriteString("Tap tombol di bawah untuk aksi cepat.\n")
	sb.WriteString("🌐 Detail: [ressist.web.id](https://ressist.web.id)")
	return sb.String()
}

func formatDetail(a client.Assignment) string {
	var sb strings.Builder
	sb.WriteString("🔍 *Detail Tugas*\n\n")
	sb.WriteString(fmt.Sprintf("*%s*\n\n", escape(a.Title)))
	if a.Course != nil {
		sb.WriteString(fmt.Sprintf("📖 *Kelas:* %s\n", escape(deref(a.Course, "N/A"))))
	}
	if a.ClassCode != nil && strings.TrimSpace(*a.ClassCode) != "" {
		sb.WriteString(fmt.Sprintf("🏷️ *Kode:* `%s`\n", escape(strings.TrimSpace(*a.ClassCode))))
	}
	dl := a.Deadline.In(wib)
	sb.WriteString(fmt.Sprintf("⏰ *Deadline:* %s WIB\n", dl.Format("Monday, 2 Jan 2006 15:04")))
	sb.WriteString(fmt.Sprintf("⏳ *Sisa:* %s\n", timeRemaining(a.Deadline)))
	sb.WriteString(fmt.Sprintf("📦 *Sumber:* %s\n", escape(a.Source)))
	if isClassroom(a) {
		sb.WriteString("🔒 _Classroom read-only — status mengikuti Google Classroom_\n")
	}
	if a.URL != nil && strings.TrimSpace(*a.URL) != "" {
		sb.WriteString(fmt.Sprintf("🔗 *Link:* %s\n", escape(strings.TrimSpace(*a.URL))))
	}
	sb.WriteString(fmt.Sprintf("🆔 `%s`\n", a.ID))
	if a.Completed {
		sb.WriteString("\n✅ _Sudah selesai_\n")
	}
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
		"%s *Pengingat Tugas*\n\n📚 *Kelas:* %s\n📝 *Tugas:* %s\n⏰ *Deadline:* %s\n⏳ *Sisa Waktu:* %d jam\n\nAyo segera dikerjakan! 💪\n\n🌐 *Detail:* [ressist.web.id](https://ressist.web.id)",
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
	sb.WriteString("🌐 *Cek detail di:* [ressist.web.id](https://ressist.web.id)")
	return sb.String()
}
