package classcode

import (
	"regexp"
	"strconv"
	"strings"

	"github.com/jeremi16/ressist-api/internal/models"
	"github.com/jeremi16/ressist-api/internal/pkg/text"
)

var (
	bracketCodeRe = regexp.MustCompile(`\[([A-Za-z0-9]{1,8})\]`)
	parenCodeRe   = regexp.MustCompile(`\(([A-Za-z0-9]{1,8})\)`)
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

func ParseCourseClassFilters(jsonStr string) map[string]string {
	filters := make(map[string]string)
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
			// Value should be a quoted string like "RA"
			value := strings.Trim(strings.TrimSpace(valuePart), `"`)
			if key != "" && value != "" {
				filters[key] = value
			}
		}
	}
	return filters
}

func ToCourseClassFiltersJSON(filters map[string]string) string {
	if len(filters) == 0 {
		return "{}"
	}
	var sb strings.Builder
	sb.WriteString("{")
	first := true
	for k, v := range filters {
		if !first {
			sb.WriteString(",")
		}
		first = false
		sb.WriteString(strconv.Quote(k))
		sb.WriteString(":")
		sb.WriteString(strconv.Quote(v))
	}
	sb.WriteString("}")
	return sb.String()
}

func isValidClassCode(code string) bool {
	// Kelas biasanya 1-6 char alnum, contoh RA, RC, A1, IF-A
	// Kita terima 1-8 lalu upper + trim, hindari false positive kata panjang
	code = strings.TrimSpace(code)
	if len(code) < 1 || len(code) > 8 {
		return false
	}
	// Harus alnum + dash, minimal 1 huruf/angka
	for _, r := range code {
		if !(r >= 'A' && r <= 'Z' || r >= 'a' && r <= 'z' || r >= '0' && r <= '9' || r == '-' || r == '_') {
			return false
		}
	}
	return true
}

func Extract(title string) *string {
	trimmed := strings.TrimSpace(title)
	if trimmed == "" {
		return nil
	}

	// 1. Prefix [CODE] di awal — legacy, prioritas tertinggi
	if strings.HasPrefix(trimmed, "[") {
		closeIdx := strings.Index(trimmed, "]")
		if closeIdx > 1 {
			candidate := strings.TrimSpace(trimmed[1:closeIdx])
			if isValidClassCode(candidate) {
				norm := strings.ToUpper(strings.TrimSpace(candidate))
				return &norm
			}
		}
	}

	// 2. Scan dimana saja di judul untuk [CODE] dan (CODE), ambil match terakhir (paling kanan)
	//    Agar "Worksheet (RA) (RC) closes" -> RC, dan "Tugas (RA) - Metodologi" -> RA
	var lastMatch string
	var lastIdx int = -1

	for _, m := range bracketCodeRe.FindAllStringSubmatchIndex(trimmed, -1) {
		// m[2],m[3] = capture group
		if len(m) >= 4 && m[2] != -1 {
			candidate := strings.TrimSpace(trimmed[m[2]:m[3]])
			if isValidClassCode(candidate) {
				if m[0] > lastIdx {
					lastIdx = m[0]
					lastMatch = candidate
				}
			}
		}
	}
	for _, m := range parenCodeRe.FindAllStringSubmatchIndex(trimmed, -1) {
		if len(m) >= 4 && m[2] != -1 {
			candidate := strings.TrimSpace(trimmed[m[2]:m[3]])
			if isValidClassCode(candidate) {
				// Hindari false positive tahun/bilangan: (2024) 4 digit angka saja -> skip jika >2 char all digits
				allDigits := true
				for _, r := range candidate {
					if r < '0' || r > '9' {
						allDigits = false
						break
					}
				}
				if allDigits && len(candidate) > 2 {
					continue
				}
				if m[0] > lastIdx {
					lastIdx = m[0]
					lastMatch = candidate
				}
			}
		}
	}

	if lastMatch != "" {
		norm := strings.ToUpper(strings.TrimSpace(lastMatch))
		return &norm
	}

	return nil
}

func Filter(events []models.Event, mutedCoursesJSON string, selectedClassCodesJSON *string, keywordFiltersJSON string) []models.Event {
	return FilterWithCourseClass(events, mutedCoursesJSON, selectedClassCodesJSON, keywordFiltersJSON, "{}")
}

func FilterWithCourseClass(events []models.Event, mutedCoursesJSON string, selectedClassCodesJSON *string, keywordFiltersJSON string, courseClassFiltersJSON string) []models.Event {
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
	// Per-matkul single filter: course -> classCode
	rawPerCourse := ParseCourseClassFilters(courseClassFiltersJSON)
	normPerCourse := make(map[string]string)
	for course, code := range rawPerCourse {
		norm := text.Normalize(code)
		if norm != "" {
			normPerCourse[text.Normalize(course)] = norm
		}
	}
	hasPerCourse := len(normPerCourse) > 0

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
		// Effective class code: pakai ClassCode jika ada, fallback ke Extract(title) agar filter manual langsung work tanpa harus sinkron
		effectiveCode := ""
		if event.ClassCode != nil && strings.TrimSpace(*event.ClassCode) != "" {
			effectiveCode = strings.TrimSpace(*event.ClassCode)
		} else {
			if extracted := Extract(event.Title); extracted != nil {
				effectiveCode = *extracted
			}
		}
		normEffective := text.Normalize(effectiveCode)
		hasEffective := effectiveCode != ""
		// Per-matkul takes precedence over global. Empty per-course entry = tampil semua (no filter) for that course.
		if perCode, ok := normPerCourse[normCourse]; ok && perCode != "" {
			if hasEffective && normEffective != perCode {
				continue
			}
			// Tugas umum (tanpa kode) tetap tampil — fallback tampil semua untuk kode umum
		} else if hasPerCourse {
			// Ada per-course map tapi course ini tidak diset -> tampil semua (no global fallback)
			// Sengaja tidak cek global agar per-matkul Opsi A murni per-matkul
		} else if hasCodeFilter && hasEffective {
			if !codeMap[normEffective] {
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
