package telegram

import "strings"

// markdownEscaper escapes the characters Telegram's legacy Markdown parse mode
// treats as formatting.
//
// Every message built here interpolates values that come from the LMS (course
// names, assignment titles) or from the user (their display name). An
// unbalanced "_", "*", "`", "[" or "]" makes Telegram reject the entire
// message with "400 Bad Request: can't parse entities" — so the notification
// is not merely ugly, it is never delivered, and there is no retry.
// maxBriefingAssignments caps how many tasks go into one briefing message.
// Telegram rejects messages over 4096 characters, and building the body from an
// unbounded backlog wastes memory before that rejection.
const maxBriefingAssignments = 50

var markdownEscaper = strings.NewReplacer(
	"_", "\\_",
	"*", "\\*",
	"`", "\\`",
	"[", "\\[",
	"]", "\\]",
)

// escapeMarkdown makes an arbitrary string safe to interpolate into a Markdown
// message body.
func escapeMarkdown(s string) string {
	return markdownEscaper.Replace(s)
}
