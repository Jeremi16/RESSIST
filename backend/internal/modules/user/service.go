package user

// Service contains user-related business logic that is not directly tied to HTTP.
// Currently the user module is thin and most logic lives in Handler; this file
// exists to satisfy the modular structure and to host future extraction of
// validation and domain helpers.

import (
	"strings"

	"github.com/jeremi16/ressist-api/internal/pkg/text"
	"github.com/jeremi16/ressist-api/internal/pkg/urlutil"
)

// ValidateMoodleURL validates that a Moodle calendar URL looks plausible.
func ValidateMoodleURL(rawURL string) bool {
	trimmed := strings.TrimSpace(rawURL)
	if trimmed == "" {
		return true
	}
	return urlutil.IsLikelyMoodleCalendarURL(trimmed)
}

// ValidateWhatsAppNumber validates a WhatsApp number has at least 10 digits.
func ValidateWhatsAppNumber(number string) bool {
	trimmed := strings.TrimSpace(number)
	if trimmed == "" {
		return true
	}
	return len(text.OnlyDigits(trimmed)) >= 10
}
