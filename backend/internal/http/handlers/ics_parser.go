package handlers

import (
	"sort"
	"strings"
	"time"
)

// parseMoodleICS parses Moodle ICS calendar data into calendar events
func parseMoodleICS(raw string) []moodleCalendarEvent {
	content := normalizeLineEndings(raw)
	lines := strings.Split(content, "\n")

	events := make([]moodleCalendarEvent, 0, 32)
	current := moodleCalendarEvent{}
	inEvent := false

	for i := 0; i < len(lines); i++ {
		line := strings.TrimRight(lines[i], " \t")
		if line == "" {
			continue
		}

		// Handle line folding (lines starting with space are continuations)
		for i+1 < len(lines) && strings.HasPrefix(lines[i+1], " ") {
			line += strings.TrimPrefix(lines[i+1], " ")
			i++
		}

		switch {
		case line == "BEGIN:VEVENT":
			inEvent = true
			current = moodleCalendarEvent{}
		case line == "END:VEVENT":
			if inEvent && strings.TrimSpace(current.Title) != "" {
				events = append(events, current)
			}
			inEvent = false
		default:
			if !inEvent {
				continue
			}
			parseICSEventLine(line, &current)
		}
	}

	sortEventsByDeadline(events)
	return events
}

// parseICSEventLine parses a single ICS line and updates the event
func parseICSEventLine(line string, event *moodleCalendarEvent) {
	switch {
	case strings.HasPrefix(line, "UID:"):
		event.UID = strings.TrimSpace(strings.TrimPrefix(line, "UID:"))
	case strings.HasPrefix(line, "SUMMARY:"):
		event.Title = unescapeICS(strings.TrimPrefix(line, "SUMMARY:"))
	case strings.HasPrefix(line, "CATEGORIES:"):
		event.Course = unescapeICS(strings.TrimPrefix(line, "CATEGORIES:"))
	case strings.HasPrefix(line, "DESCRIPTION"):
		if value, ok := icsPropertyValue(line, "DESCRIPTION"); ok {
			event.Description = unescapeICS(value)
		}
	case strings.HasPrefix(line, "URL"):
		if value, ok := icsPropertyValue(line, "URL"); ok {
			event.URL = strings.TrimSpace(value)
		}
	case strings.HasPrefix(line, "DTSTART"):
		value := icsValue(line)
		if t, ok := parseICalDate(value); ok {
			event.Start = t
		}
	case strings.HasPrefix(line, "DTEND"):
		value := icsValue(line)
		if t, ok := parseICalDate(value); ok {
			event.End = t
		}
	}
}

// normalizeLineEndings converts all line endings to LF
func normalizeLineEndings(raw string) string {
	content := strings.ReplaceAll(raw, "\r\n", "\n")
	return strings.ReplaceAll(content, "\r", "\n")
}

// sortEventsByDeadline sorts events by deadline (End time, fallback to Start)
func sortEventsByDeadline(events []moodleCalendarEvent) {
	sort.Slice(events, func(i, j int) bool {
		left := events[i].End
		if left.IsZero() {
			left = events[i].Start
		}
		right := events[j].End
		if right.IsZero() {
			right = events[j].Start
		}
		return left.Before(right)
	})
}

// icsValue extracts the value part after the colon
func icsValue(line string) string {
	idx := strings.Index(line, ":")
	if idx < 0 || idx == len(line)-1 {
		return ""
	}
	return strings.TrimSpace(line[idx+1:])
}

// icsPropertyValue extracts value for a property that may include parameters.
// Examples:
// - DESCRIPTION:foo
// - DESCRIPTION;LANGUAGE=en:foo
// - URL;VALUE=URI:https://example.com
func icsPropertyValue(line string, property string) (string, bool) {
	if !strings.HasPrefix(line, property) {
		return "", false
	}
	if len(line) == len(property) {
		return "", false
	}
	next := line[len(property)]
	if next != ':' && next != ';' {
		return "", false
	}
	idx := strings.Index(line, ":")
	if idx < 0 || idx == len(line)-1 {
		return "", false
	}
	return strings.TrimSpace(line[idx+1:]), true
}

// unescapeICS unescapes ICS special characters
func unescapeICS(value string) string {
	replaced := strings.ReplaceAll(value, "\\n", "\n")
	replaced = strings.ReplaceAll(replaced, "\\,", ",")
	replaced = strings.ReplaceAll(replaced, "\\;", ";")
	replaced = strings.ReplaceAll(replaced, "\\\\", "\\")
	return strings.TrimSpace(replaced)
}

// parseICalDate parses iCalendar date formats
func parseICalDate(raw string) (time.Time, bool) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return time.Time{}, false
	}

	layouts := []string{
		"20060102T150405Z",
		"20060102T150405",
		"20060102",
	}

	for _, layout := range layouts {
		var t time.Time
		var err error
		if strings.HasSuffix(layout, "Z") {
			t, err = time.Parse(layout, value)
		} else {
			t, err = time.ParseInLocation(layout, value, time.Local)
		}
		if err == nil {
			return t, true
		}
	}

	return time.Time{}, false
}

// convertGoogleDeadline converts Google Classroom due date/time to time.Time
func convertGoogleDeadline(dueDate *googleDate, dueTime *googleTimeOfDay) (time.Time, bool) {
	if dueDate == nil || dueDate.Year == 0 || dueDate.Month == 0 || dueDate.Day == 0 {
		return time.Time{}, false
	}

	hours := 23
	minutes := 59
	if dueTime != nil {
		if dueTime.Hours >= 0 && dueTime.Hours <= 23 {
			hours = dueTime.Hours
		}
		if dueTime.Minutes >= 0 && dueTime.Minutes <= 59 {
			minutes = dueTime.Minutes
		}
	}

	return time.Date(dueDate.Year, time.Month(dueDate.Month), dueDate.Day, hours, minutes, 0, 0, time.UTC), true
}
