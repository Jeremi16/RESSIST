package urlutil

import (
	"errors"
	"testing"
)

func TestValidateOutboundHTTPURL(t *testing.T) {
	tests := []struct {
		name      string
		rawURL    string
		allowHTTP bool
		wantErr   bool
	}{
		{
			name:      "valid https moodle",
			rawURL:    "https://moodle.itera.ac.id/calendar/export.php?authtoken=a&userid=1",
			allowHTTP: true,
		},
		{
			name:      "valid http when allowed",
			rawURL:    "http://moodle.itera.ac.id/calendar.ics",
			allowHTTP: true,
		},
		{
			name:      "http rejected when not allowed",
			rawURL:    "http://moodle.itera.ac.id/calendar.ics",
			allowHTTP: false,
			wantErr:   true,
		},
		{
			// The classic SSRF target: cloud metadata service.
			name:      "link-local metadata endpoint",
			rawURL:    "http://169.254.169.254/latest/meta-data/?authtoken=a&userid=1",
			allowHTTP: true,
			wantErr:   false, // shape is valid; the dial guard rejects the address
		},
		{
			// userinfo makes the URL *look* like the campus host while dialing
			// loopback. This must be rejected at the shape check.
			name:      "userinfo spoof",
			rawURL:    "http://moodle.itera.ac.id@127.0.0.1/calendar.ics",
			allowHTTP: true,
			wantErr:   true,
		},
		{
			name:      "file scheme",
			rawURL:    "file:///etc/passwd",
			allowHTTP: true,
			wantErr:   true,
		},
		{
			name:      "gopher scheme",
			rawURL:    "gopher://127.0.0.1:6379/_INFO",
			allowHTTP: true,
			wantErr:   true,
		},
		{
			name:      "empty scheme",
			rawURL:    "moodle.itera.ac.id/calendar.ics",
			allowHTTP: true,
			wantErr:   true,
		},
		{
			name:      "missing host",
			rawURL:    "https:///calendar.ics",
			allowHTTP: true,
			wantErr:   true,
		},
		{
			name:      "empty string",
			rawURL:    "",
			allowHTTP: true,
			wantErr:   true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			_, err := ValidateOutboundHTTPURL(tc.rawURL, tc.allowHTTP)
			if tc.wantErr && !errors.Is(err, ErrUnsafeURL) {
				t.Fatalf("expected ErrUnsafeURL, got %v", err)
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("expected success, got %v", err)
			}
		})
	}
}

// TestIsLikelyMoodleCalendarURLIsShapeOnly documents that this helper is a
// shape filter and NOT an authorization decision.
func TestIsLikelyMoodleCalendarURLIsShapeOnly(t *testing.T) {
	if !IsLikelyMoodleCalendarURL("http://127.0.0.1/calendar.ics") {
		t.Fatal("expected shape match: this helper must not be used as authorization")
	}
	if _, err := ValidateOutboundHTTPURL("http://moodle.itera.ac.id@127.0.0.1/calendar.ics", true); !errors.Is(err, ErrUnsafeURL) {
		t.Fatal("userinfo URL must be rejected by the real validator")
	}
}
