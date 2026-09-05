package coursealias

import (
	"strconv"
	"strings"
)

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

func Parse(jsonStr string) map[string]string {
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

func ToJSON(aliases map[string]string) string {
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

func Apply(courseName string, aliases map[string]string) string {
	trimmed := strings.TrimSpace(courseName)
	if trimmed == "" {
		return ""
	}
	if alias, ok := aliases[trimmed]; ok {
		return alias
	}
	lowerTrimmed := strings.ToLower(trimmed)
	for original, alias := range aliases {
		if strings.ToLower(original) == lowerTrimmed {
			return alias
		}
	}
	return trimmed
}
