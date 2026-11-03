package moodle

import (
	"context"
	"net"
	"testing"
)

func TestIsPrivateIP(t *testing.T) {
	tests := []struct {
		addr string
		want bool
	}{
		{"127.0.0.1", true},
		{"127.1.2.3", true},
		{"10.0.0.5", true},
		{"172.16.0.1", true},
		{"172.31.255.255", true},
		{"192.168.1.1", true},
		// 169.254.169.254 is the cloud metadata endpoint.
		{"169.254.169.254", true},
		{"::1", true},
		{"fc00::1", true},
		{"fe80::1", true},
		{"100.64.0.1", true},
		// Public addresses must remain reachable.
		{"8.8.8.8", false},
		{"103.10.10.10", false},
		{"2001:4860:4860::8888", false},
	}

	for _, tc := range tests {
		t.Run(tc.addr, func(t *testing.T) {
			ip := net.ParseIP(tc.addr)
			if ip == nil {
				t.Fatalf("bad fixture: %s", tc.addr)
			}
			if got := isPrivateIP(ip); got != tc.want {
				t.Fatalf("isPrivateIP(%s) = %v, want %v", tc.addr, got, tc.want)
			}
		})
	}
}

func TestIsPrivateIPRejectsNil(t *testing.T) {
	if !isPrivateIP(nil) {
		t.Fatal("nil IP must be treated as private (fail closed)")
	}
}

// TestFetchMoodleCalendarRejectsUnsafeScheme proves the client validates
// before dialing, so the cron path (which never goes through an HTTP handler)
// is covered too.
func TestFetchMoodleCalendarRejectsUnsafeScheme(t *testing.T) {
	c := New()
	for _, raw := range []string{
		"file:///etc/passwd",
		"gopher://127.0.0.1:6379/_INFO",
		"http://moodle.itera.ac.id@127.0.0.1/calendar.ics",
	} {
		if _, err := c.FetchMoodleCalendar(context.Background(), raw); err == nil {
			t.Fatalf("expected %q to be rejected before dialing", raw)
		}
	}
}
