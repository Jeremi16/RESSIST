package ics

import (
	"strings"
	"testing"
)

// TestParseMoodleICSParameterisedSummary covers the bug where a SUMMARY with
// parameters did not match the raw "SUMMARY:" prefix, leaving Title empty —
// and an event with an empty title is dropped entirely.
func TestParseMoodleICSParameterisedSummary(t *testing.T) {
	raw := strings.Join([]string{
		"BEGIN:VCALENDAR",
		"BEGIN:VEVENT",
		"UID:abc-123",
		"SUMMARY;LANGUAGE=en:UTS Kalkulus",
		"CATEGORIES;LANGUAGE=en:MAT101",
		"DTSTART:20300101T090000Z",
		"DTEND:20300101T110000Z",
		"END:VEVENT",
		"END:VCALENDAR",
	}, "\r\n")

	events := ParseMoodleICS(raw)
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d (parameterised SUMMARY was likely dropped)", len(events))
	}
	if events[0].Title != "UTS Kalkulus" {
		t.Fatalf("title = %q, want %q", events[0].Title, "UTS Kalkulus")
	}
	if events[0].Course != "MAT101" {
		t.Fatalf("course = %q, want %q", events[0].Course, "MAT101")
	}
	if events[0].UID != "abc-123" {
		t.Fatalf("uid = %q", events[0].UID)
	}
}

// TestParseMoodleICSPlainSummary ensures the parameterless form still works.
func TestParseMoodleICSPlainSummary(t *testing.T) {
	raw := strings.Join([]string{
		"BEGIN:VEVENT",
		"UID:x1",
		"SUMMARY:Tugas_1",
		"CATEGORIES:IF2233",
		"DTEND:20300101T110000Z",
		"END:VEVENT",
	}, "\r\n")

	events := ParseMoodleICS(raw)
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(events))
	}
	if events[0].Title != "Tugas_1" {
		t.Fatalf("title = %q", events[0].Title)
	}
}

// TestParseMoodleICSFoldedLine verifies RFC 5545 line unfolding.
func TestParseMoodleICSFoldedLine(t *testing.T) {
	raw := strings.Join([]string{
		"BEGIN:VEVENT",
		"UID:x2",
		"SUMMARY:Tugas yang sangat pan",
		" jang sekali",
		"DTEND:20300101T110000Z",
		"END:VEVENT",
	}, "\r\n")

	events := ParseMoodleICS(raw)
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(events))
	}
	if events[0].Title != "Tugas yang sangat panjang sekali" {
		t.Fatalf("unfolded title = %q", events[0].Title)
	}
}

// TestParseMoodleICSHugeFoldedLineIsBounded ensures a pathological folded line
// cannot grow without limit.
func TestParseMoodleICSHugeFoldedLineIsBounded(t *testing.T) {
	var sb strings.Builder
	sb.WriteString("BEGIN:VEVENT\r\nUID:x3\r\nSUMMARY:")
	for i := 0; i < 200000; i++ {
		sb.WriteString("\r\n aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
	}
	sb.WriteString("\r\nDTEND:20300101T110000Z\r\nEND:VEVENT\r\n")

	// Must terminate and stay within the cap rather than allocating unbounded.
	events := ParseMoodleICS(sb.String())
	for _, e := range events {
		if len(e.Title) > maxICSLineBytes {
			t.Fatalf("title length %d exceeds cap %d", len(e.Title), maxICSLineBytes)
		}
	}
}

// TestIcsPropertyValueRejectsPrefixCollisions makes sure a property name that
// merely starts with the target name is not treated as a match.
func TestIcsPropertyValueRejectsPrefixCollisions(t *testing.T) {
	if _, ok := icsPropertyValue("SUMMARYX:value", "SUMMARY"); ok {
		t.Fatal("SUMMARYX must not match SUMMARY")
	}
	if v, ok := icsPropertyValue("SUMMARY;LANGUAGE=id:halo", "SUMMARY"); !ok || v != "halo" {
		t.Fatalf("parameterised value = %q ok=%v", v, ok)
	}
	if v, ok := icsPropertyValue("SUMMARY:halo", "SUMMARY"); !ok || v != "halo" {
		t.Fatalf("plain value = %q ok=%v", v, ok)
	}
}
