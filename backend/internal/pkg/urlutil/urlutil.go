package urlutil

import (
	"net/url"
	"strings"
)

func Join(base, path string) string {
	trimmedBase := strings.TrimRight(strings.TrimSpace(base), "/")
	trimmedPath := strings.TrimSpace(path)
	if trimmedPath == "" {
		return trimmedBase
	}
	if !strings.HasPrefix(trimmedPath, "/") {
		trimmedPath = "/" + trimmedPath
	}
	return trimmedBase + trimmedPath
}

func IsLikelyMoodleCalendarURL(rawURL string) bool {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return false
	}
	pathname := strings.ToLower(parsed.Path)
	return strings.Contains(pathname, ".ics") ||
		strings.Contains(pathname, "/calendar/export") ||
		strings.Contains(pathname, "export_execute.php") ||
		(parsed.Query().Has("authtoken") && parsed.Query().Has("userid"))
}
