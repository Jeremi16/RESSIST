package classcode

import (
	"strconv"
	"strings"

	"github.com/jeremi16/ressist-api/internal/models"
	"github.com/jeremi16/ressist-api/internal/pkg/text"
)

func ParseArray(jsonStr string) []string {
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
	parts := strings.Split(trimmed, ",")
	for _, part := range parts {
		code := strings.Trim(strings.TrimSpace(part), `"`)
		if code != "" {
			codes = append(codes, code)
		}
	}
	return codes
}

func ToJSON(codes []string) string {
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

func ParseKeywordFilters(jsonStr string) map[string][]string {
	filters := make(map[string][]string)
	if strings.TrimSpace(jsonStr) == "" || jsonStr == "{}" {
		return filters
	}
	trimmed := strings.TrimSpace(jsonStr)
	trimmed = strings.TrimPrefix(trimmed, "{")
	trimmed = strings.TrimSuffix(trimmed, "}")
	if trimmed == "" {
		return filters
	}
	pairs := splitJSONPairs(trimmed)
	for _, pair := range pairs {
		parts := strings.SplitN(pair, ":", 2)
		if len(parts) == 2 {
			key := strings.Trim(strings.TrimSpace(parts[0]), `"`)
			valuePart := strings.TrimSpace(parts[1])
			if key != "" && strings.HasPrefix(valuePart, "[") && strings.HasSuffix(valuePart, "]") {
				keywords := ParseArray(valuePart)
				if len(keywords) > 0 {
					filters[key] = keywords
				}
			}
		}
	}
	return filters
}

func Extract(title string) *string {
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

func Filter(events []models.Event, mutedCoursesJSON string, selectedClassCodesJSON *string, keywordFiltersJSON string) []models.Event {
	mutedList := ParseArray(mutedCoursesJSON)
	mutedMap := make(map[string]bool)
	for _, m := range mutedList {
		mutedMap[text.Normalize(m)] = true
	}
	var selectedCodes []string
	if selectedClassCodesJSON != nil {
		selectedCodes = ParseArray(*selectedClassCodesJSON)
	}
	hasCodeFilter := len(selectedCodes) > 0
	codeMap := make(map[string]bool)
	for _, c := range selectedCodes {
		codeMap[text.Normalize(c)] = true
	}
	keywordFilters := ParseKeywordFilters(keywordFiltersJSON)
	normKeywordFilters := make(map[string][]string)
	for course, keywords := range keywordFilters {
		normKeywordFilters[text.Normalize(course)] = keywords
	}
	filtered := make([]models.Event, 0, len(events))
	for _, event := range events {
		courseName := ""
		if event.Course != nil {
			courseName = *event.Course
		}
		normCourse := text.Normalize(courseName)
		if mutedMap[normCourse] {
			continue
		}
		if hasCodeFilter && event.ClassCode != nil && *event.ClassCode != "" {
			if !codeMap[text.Normalize(*event.ClassCode)] {
				continue
			}
		}
		if keywords, ok := normKeywordFilters[normCourse]; ok && len(keywords) > 0 {
			found := false
			titleLower := strings.ToLower(event.Title)
			for _, k := range keywords {
				if strings.Contains(titleLower, strings.ToLower(k)) {
					found = true
					break
				}
			}
			if !found {
				continue
			}
		}
		filtered = append(filtered, event)
	}
	return filtered
}
