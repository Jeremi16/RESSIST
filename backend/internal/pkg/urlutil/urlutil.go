package urlutil

import (
	"errors"
	"net/url"
	"strings"
)

// ErrUnsafeURL is returned when a URL must not be fetched server-side.
var ErrUnsafeURL = errors.New("unsafe url")

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

// ValidateOutboundHTTPURL parses rawURL and rejects anything that is not a
// plain http(s) URL with a host and no userinfo.
//
// This is a *shape* check, not an authorization decision: it does not resolve
// DNS and therefore cannot tell you whether the host points at a private
// address. Pair it with a dial-time guard (see calendar/moodle) so that
// hostnames resolving to 127.0.0.1 or 169.254.169.254 are rejected after
// resolution.
func ValidateOutboundHTTPURL(rawURL string, allowHTTP bool) (*url.URL, error) {
	u, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil {
		return nil, ErrUnsafeURL
	}
	// userinfo lets "https://moodle.itera.ac.id@127.0.0.1/x.ics" read as if it
	// pointed at the campus host while actually dialing loopback.
	if u.User != nil {
		return nil, ErrUnsafeURL
	}
	switch strings.ToLower(u.Scheme) {
	case "https":
	case "http":
		if !allowHTTP {
			return nil, ErrUnsafeURL
		}
	default:
		// file://, gopher://, ftp://, and empty schemes all land here.
		return nil, ErrUnsafeURL
	}
	if u.Hostname() == "" {
		return nil, ErrUnsafeURL
	}
	return u, nil
}

// IsLikelyMoodleCalendarURL is a *shape* filter used to help the UI decide
// whether a pasted URL looks like a Moodle calendar export. It must never be
// used as an authorization check — see ValidateOutboundHTTPURL.
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
