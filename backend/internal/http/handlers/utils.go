package handlers

import (
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jeremi16/resisst-api/internal/http/middleware"
)

// ============================================================================
// String & Pointer Utilities
// ============================================================================

// nullableStringPointer returns a pointer to the trimmed string, or nil if empty
func nullableStringPointer(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

// defaultString returns the value if not empty, otherwise returns fallback
func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

// normalizeText normalizes text for comparison (lowercase, single spaces)
func normalizeText(value string) string {
	return strings.Join(strings.Fields(strings.ToLower(strings.TrimSpace(value))), " ")
}

// intToString converts int to string
func intToString(value int) string {
	return strconv.Itoa(value)
}

// onlyDigits extracts only digit characters from a string
func onlyDigits(input string) string {
	var b strings.Builder
	for _, r := range input {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// ============================================================================
// Auth Utilities
// ============================================================================

// authenticatedUserID extracts the user ID from JWT claims
func authenticatedUserID(c *gin.Context) (string, bool) {
	claims, ok := middleware.GetAccessClaims(c)
	if !ok || strings.TrimSpace(claims.Subject) == "" {
		return "", false
	}
	return claims.Subject, true
}

// ============================================================================
// Course Alias Utilities
// ============================================================================

// parseCourseAliases parses JSON string to map
// Format: {"Original Name":"Alias","Another":"Alias2"}
func parseCourseAliases(jsonStr string) map[string]string {
	aliases := make(map[string]string)
	if strings.TrimSpace(jsonStr) == "" || jsonStr == "{}" {
		return aliases
	}

	trimmed := strings.TrimSpace(jsonStr)
	trimmed = strings.TrimPrefix(trimmed, "{")
	trimmed = strings.TrimSuffix(trimmed, "}")

	if trimmed == "" {
		return aliases
	}

	pairs := splitJSONPairs(trimmed)
	for _, pair := range pairs {
		parts := strings.SplitN(pair, ":", 2)
		if len(parts) == 2 {
			key := strings.Trim(strings.TrimSpace(parts[0]), `"`)
			value := strings.Trim(strings.TrimSpace(parts[1]), `"`)
			if key != "" {
				aliases[key] = value
			}
		}
	}
	return aliases
}

// courseAliasesToJSON converts map to JSON string
func courseAliasesToJSON(aliases map[string]string) string {
	if len(aliases) == 0 {
		return "{}"
	}

	var sb strings.Builder
	sb.WriteString("{")
	first := true
	for k, v := range aliases {
		if !first {
			sb.WriteString(",")
		}
		first = false
		sb.WriteString(strconv.Quote(k) + ":" + strconv.Quote(v))
	}
	sb.WriteString("}")
	return sb.String()
}

// applyCourseAlias applies alias mapping to course name
func applyCourseAlias(courseName string, aliases map[string]string) string {
	trimmed := strings.TrimSpace(courseName)
	if trimmed == "" {
		return ""
	}

	// Try exact match first
	if alias, ok := aliases[trimmed]; ok {
		return alias
	}

	// Try normalized match (case-insensitive)
	lowerTrimmed := strings.ToLower(trimmed)
	for original, alias := range aliases {
		if strings.ToLower(original) == lowerTrimmed {
			return alias
		}
	}

	return trimmed
}

// parseAvailableClassCodes parses JSON array string to slice
// Format: ["RA","RB","RC"]
func parseAvailableClassCodes(jsonStr string) []string {
	codes := make([]string, 0)
	if strings.TrimSpace(jsonStr) == "" || jsonStr == "[]" {
		return codes
	}

	trimmed := strings.TrimSpace(jsonStr)
	trimmed = strings.TrimPrefix(trimmed, "[")
	trimmed = strings.TrimSuffix(trimmed, "]")

	if trimmed == "" {
		return codes
	}

	// Split by comma and trim quotes
	parts := strings.Split(trimmed, ",")
	for _, part := range parts {
		code := strings.Trim(strings.TrimSpace(part), `"`)
		if code != "" {
			codes = append(codes, code)
		}
	}
	return codes
}

// availableClassCodesToJSON converts slice to JSON array string
func availableClassCodesToJSON(codes []string) string {
	if len(codes) == 0 {
		return "[]"
	}

	var sb strings.Builder
	sb.WriteString("[")
	for i, code := range codes {
		if i > 0 {
			sb.WriteString(",")
		}
		sb.WriteString(strconv.Quote(code))
	}
	sb.WriteString("]")
	return sb.String()
}

// splitJSONPairs splits JSON object content by comma, respecting quoted strings
func splitJSONPairs(s string) []string {
	var pairs []string
	var current strings.Builder
	inQuote := false

	for i, r := range s {
		if r == '"' && (i == 0 || s[i-1] != '\\') {
			inQuote = !inQuote
		}
		if r == ',' && !inQuote {
			pairs = append(pairs, current.String())
			current.Reset()
			continue
		}
		current.WriteRune(r)
	}
	if current.Len() > 0 {
		pairs = append(pairs, current.String())
	}
	return pairs
}

// ============================================================================
// Class Code Utilities
// ============================================================================

// extractClassCode extracts class code from assignment title
// Pattern: [XX] at the beginning of title, e.g., "[RB] Tugas 1", "[RA] Quiz 2"
func extractClassCode(title string) *string {
	trimmed := strings.TrimSpace(title)
	if trimmed == "" || !strings.HasPrefix(trimmed, "[") {
		return nil
	}

	closeIdx := strings.Index(trimmed, "]")
	if closeIdx <= 1 {
		return nil
	}

	classCode := strings.TrimSpace(trimmed[1:closeIdx])
	if classCode == "" {
		return nil
	}

	return &classCode
}

// ============================================================================
// Time Utilities
// ============================================================================

// formatTimeRemaining formats the remaining time until deadline
func formatTimeRemaining(deadline time.Time) string {
	now := time.Now()
	if !deadline.After(now) {
		return "deadline lewat"
	}

	diff := deadline.Sub(now)
	days := int(diff.Hours()) / 24
	hours := int(diff.Hours()) % 24
	minutes := int(diff.Minutes()) % 60

	if days > 0 {
		if hours > 0 {
			return strings.TrimSpace(daysToString(days) + " " + hoursToString(hours))
		}
		return daysToString(days)
	}
	if hours > 0 {
		if minutes > 0 {
			return strings.TrimSpace(hoursToString(hours) + " " + minutesToString(minutes))
		}
		return hoursToString(hours)
	}
	if minutes > 0 {
		return minutesToString(minutes)
	}
	return "kurang dari 1 menit"
}

func daysToString(days int) string {
	return strconv.Itoa(days) + " hari"
}

func hoursToString(hours int) string {
	return strconv.Itoa(hours) + " jam"
}

func minutesToString(minutes int) string {
	return strconv.Itoa(minutes) + " menit"
}

// dereferenceString returns the string value or default if nil
func dereferenceString(s *string, defaultVal string) string {
	if s != nil {
		return *s
	}
	return defaultVal
}

// ============================================================================
// URL Utilities
// ============================================================================

// joinURL joins base URL with path
func joinURL(base, path string) string {
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

// isLikelyMoodleCalendarURL validates if the URL looks like a Moodle calendar URL
func isLikelyMoodleCalendarURL(rawURL string) bool {
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

// ============================================================================
// Sorting Utilities
// ============================================================================

// parseSortOption validates and returns the sort option
func parseSortOption(sortQuery string) string {
	switch strings.TrimSpace(strings.ToLower(sortQuery)) {
	case SortDeadlineDesc:
		return SortDeadlineDesc
	case SortNewest:
		return SortNewest
	case SortOldest:
		return SortOldest
	default:
		return SortDeadlineAsc // default
	}
}

// getOrderClause returns the SQL ORDER BY clause for the given sort option
func getOrderClause(sortBy string) string {
	switch sortBy {
	case SortDeadlineDesc:
		return "deadline desc"
	case SortNewest:
		return "created_at desc"
	case SortOldest:
		return "created_at asc"
	default:
		return "deadline asc" // SortDeadlineAsc
	}
}

// ============================================================================
// Sync Key Utilities
// ============================================================================

// buildAssignmentSyncKey creates a unique sync key for an assignment
func buildAssignmentSyncKey(provider, externalID, course, title string) string {
	if strings.TrimSpace(externalID) != "" {
		return provider + ":" + strings.TrimSpace(externalID)
	}
	return provider + ":" + normalizeText(course) + ":" + normalizeText(title)
}
