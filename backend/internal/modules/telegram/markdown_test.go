package telegram

import (
	"strings"
	"testing"
)

// TestEscapeMarkdownPreventsParseFailure covers the four send sites where an
// unescaped underscore/asterisk/bracket in an LMS-provided title made Telegram
// reject the whole message, silently dropping the notification.
func TestEscapeMarkdownPreventsParseFailure(t *testing.T) {
	tests := []struct {
		in   string
		want string
	}{
		{"Tugas_1", `Tugas\_1`},
		{"UTS *Kalkulus*", `UTS \*Kalkulus\*`},
		{"pakai `code`", "pakai \\`code\\`"},
		{"[link]", `\[link\]`},
		{"Judul normal", "Judul normal"},
		{"", ""},
	}

	for _, tc := range tests {
		if got := escapeMarkdown(tc.in); got != tc.want {
			t.Fatalf("escapeMarkdown(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

// TestEscapeMarkdownLeavesNoBareSpecials asserts that after escaping, no
// unescaped formatting character remains.
func TestEscapeMarkdownLeavesNoBareSpecials(t *testing.T) {
	dirty := "Tugas_1 *wajib* `kode` [ref]"
	escaped := escapeMarkdown(dirty)
	for _, ch := range []string{"_", "*", "`", "[", "]"} {
		idx := 0
		for {
			pos := strings.Index(escaped[idx:], ch)
			if pos < 0 {
				break
			}
			abs := idx + pos
			if abs == 0 || escaped[abs-1] != '\\' {
				t.Fatalf("unescaped %q at %d in %q", ch, abs, escaped)
			}
			idx = abs + 1
		}
	}
}

// TestBriefingOverflowNoteOnlyWhenTruncated ensures users are told when the
// list was cut off, rather than assuming the list is complete.
func TestBriefingOverflowNoteOnlyWhenTruncated(t *testing.T) {
	if note := briefingOverflowNote(3); note != "" {
		t.Fatalf("expected no note for a short list, got %q", note)
	}
	if note := briefingOverflowNote(maxBriefingAssignments); note == "" {
		t.Fatal("expected a truncation note when the limit was reached")
	}
}
