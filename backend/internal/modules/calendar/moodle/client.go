package moodle

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"sort"
	"strings"
	"syscall"
	"time"

	"github.com/jeremi16/ressist-api/internal/models"
	"github.com/jeremi16/ressist-api/internal/modules/calendar/ics"
	"github.com/jeremi16/ressist-api/internal/pkg/classcode"
	"github.com/jeremi16/ressist-api/internal/pkg/text"
	textpkg "github.com/jeremi16/ressist-api/internal/pkg/text"
	"github.com/jeremi16/ressist-api/internal/pkg/urlutil"
)

const upcomingWindowDays = 60

// privateCIDRs lists address ranges that must never be reachable through a
// user-supplied URL. Loopback, RFC1918, link-local (which includes the
// 169.254.169.254 cloud metadata endpoint), IPv6 loopback, unique-local, and
// IPv6 link-local.
var privateCIDRs = mustParseCIDRs(
	"127.0.0.0/8",
	"10.0.0.0/8",
	"172.16.0.0/12",
	"192.168.0.0/16",
	"169.254.0.0/16",
	"0.0.0.0/8",
	"100.64.0.0/10",
	"::1/128",
	"fc00::/7",
	"fe80::/10",
)

func mustParseCIDRs(raw ...string) []*net.IPNet {
	nets := make([]*net.IPNet, 0, len(raw))
	for _, cidr := range raw {
		_, block, err := net.ParseCIDR(cidr)
		if err != nil {
			panic("moodle: invalid CIDR " + cidr)
		}
		nets = append(nets, block)
	}
	return nets
}

func isPrivateIP(ip net.IP) bool {
	if ip == nil {
		return true
	}
	for _, block := range privateCIDRs {
		if block.Contains(ip) {
			return true
		}
	}
	return false
}

// outboundClient is the only HTTP client used for user-supplied URLs.
//
// The dial Control hook runs *after* DNS resolution, so a hostname that
// resolves to a private address is rejected even though the URL itself looks
// public. This is what closes the DNS-rebinding gap left by
// urlutil.ValidateOutboundHTTPURL.
var outboundClient = &http.Client{
	Timeout: 12 * time.Second,
	Transport: &http.Transport{
		Proxy: nil, // never honour HTTP_PROXY: it would bypass the dial guard
		DialContext: (&net.Dialer{
			Timeout:   5 * time.Second,
			KeepAlive: 30 * time.Second,
			Control: func(network, address string, _ syscall.RawConn) error {
				host, _, err := net.SplitHostPort(address)
				if err != nil {
					return fmt.Errorf("egress blocked: unparsable address %q", address)
				}
				ip := net.ParseIP(host)
				if ip == nil || isPrivateIP(ip) {
					return fmt.Errorf("egress blocked: %s", address)
				}
				return nil
			},
		}).DialContext,
		TLSHandshakeTimeout:   5 * time.Second,
		ResponseHeaderTimeout: 10 * time.Second,
		MaxIdleConns:          10,
		IdleConnTimeout:       30 * time.Second,
	},
	CheckRedirect: func(req *http.Request, via []*http.Request) error {
		if len(via) >= 3 {
			return errors.New("too many redirects")
		}
		// Each hop is a fresh user-controlled URL; validate it too.
		_, err := urlutil.ValidateOutboundHTTPURL(req.URL.String(), true)
		return err
	},
}

// AssignmentRecord mirrors sync.AssignmentRecord for moodle package isolation.
type AssignmentRecord struct {
	Title       string
	Course      string
	ClassCode   *string
	Description *string
	URL         *string
	Deadline    time.Time
	ExternalID  string
	Source      string
}

// MoodleCalendarEvent alias for ics event.
type MoodleCalendarEvent = ics.MoodleCalendarEvent

// Client handles Moodle calendar interactions.
type Client struct{}

// New creates a new Moodle Client.
func New() *Client {
	return &Client{}
}

// FetchMoodleAssignments fetches assignments from Moodle calendar.
func (c *Client) FetchMoodleAssignments(ctx context.Context, user *models.User) ([]AssignmentRecord, error) {
	if user.MoodleCalendarURL == nil || text.Dereference(user.MoodleCalendarURL, "") == "" {
		return nil, fmt.Errorf("moodle calendar URL is not configured")
	}

	rawICS, err := c.FetchMoodleCalendar(ctx, *user.MoodleCalendarURL)
	if err != nil {
		return nil, err
	}

	return c.ParseMoodleEvents(rawICS, user), nil
}

// FetchMoodleCalendar makes HTTP request to fetch Moodle calendar.
func (c *Client) FetchMoodleCalendar(ctx context.Context, calendarURL string) (string, error) {
	// Validate before dialing. This must live here rather than only in the
	// HTTP handler because the cron path (lmssync -> SyncProviders ->
	// FetchMoodleAssignments) never passes through a handler, and because
	// rows already in the database may hold a URL saved before validation
	// existed.
	if _, err := urlutil.ValidateOutboundHTTPURL(calendarURL, true); err != nil {
		return "", fmt.Errorf("moodle calendar url rejected: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, strings.TrimSpace(calendarURL), nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", "ressist-api/1.0")

	resp, err := outboundClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return "", fmt.Errorf("moodle fetch failed: status=%d body=%s", resp.StatusCode, string(body))
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// ParseMoodleEvents parses ICS data and filters by user class.
func (c *Client) ParseMoodleEvents(rawICS string, user *models.User) []AssignmentRecord {
	parsedEvents := ics.ParseMoodleICS(rawICS)
	now := time.Now()
	cutoff := now.Add(time.Hour * 24 * upcomingWindowDays)

	assignments := make([]AssignmentRecord, 0, len(parsedEvents))
	for _, event := range parsedEvents {
		deadline := GetEventDeadline(event)
		if !IsValidDeadline(deadline, now, cutoff) {
			continue
		}

		classCode := classcode.Extract(event.Title)
		if !ShouldIncludeForUserClass(classCode, user.ClassCode) {
			continue
		}

		eventURL := strings.TrimSpace(event.URL)
		if eventURL == "" {
			eventURL = ExtractMoodleURLFromDescription(event.Description)
		}
		assignments = append(assignments, AssignmentRecord{
			Title:       text.DefaultString(event.Title, "Untitled Assignment"),
			Course:      text.DefaultString(event.Course, "Umum"),
			ClassCode:   classCode,
			Description: text.NullableStringPointer(event.Description),
			URL:         text.NullableStringPointer(eventURL),
			Deadline:    deadline.UTC(),
			ExternalID:  event.UID,
			Source:      "moodle",
		})
	}

	SortAssignmentsByDeadline(assignments)
	return assignments
}

// GetEventDeadline returns the deadline (End time or fallback to Start).
func GetEventDeadline(event MoodleCalendarEvent) time.Time {
	if !event.End.IsZero() {
		return event.End
	}
	return event.Start
}

// IsValidDeadline checks if deadline is within the valid range.
func IsValidDeadline(deadline, now, cutoff time.Time) bool {
	return !deadline.IsZero() && deadline.After(now) && deadline.Before(cutoff)
}

// ShouldIncludeForUserClass checks if assignment should be included based on user class codes.
func ShouldIncludeForUserClass(assignmentClassCode, userClassCodesJSON *string) bool {
	if userClassCodesJSON == nil || text.Dereference(userClassCodesJSON, "") == "" {
		return true // Include all if user has no class codes set
	}
	if assignmentClassCode == nil {
		return true // Include general assignments (no class code)
	}

	var selectedCodes []string
	if err := json.Unmarshal([]byte(*userClassCodesJSON), &selectedCodes); err != nil {
		// Fallback ke ParseArray yang lebih toleran
		selectedCodes = classcode.ParseArray(*userClassCodesJSON)
		if len(selectedCodes) == 0 {
			return true
		}
	}

	if len(selectedCodes) == 0 {
		return true // No codes selected, include all
	}

	// Normalize comparison (RA == ra) agar konsisten dengan classcode.Filter
	normAssignment := textpkg.Normalize(*assignmentClassCode)
	for _, code := range selectedCodes {
		if textpkg.Normalize(code) == normAssignment {
			return true
		}
	}
	return false
}

// SortAssignmentsByDeadline sorts assignments by deadline.
func SortAssignmentsByDeadline(assignments []AssignmentRecord) {
	sort.Slice(assignments, func(i, j int) bool {
		return assignments[i].Deadline.Before(assignments[j].Deadline)
	})
}

// ExtractMoodleURLFromDescription tries to find a direct URL in ICS description text.
func ExtractMoodleURLFromDescription(description string) string {
	desc := strings.TrimSpace(description)
	if desc == "" {
		return ""
	}

	for _, token := range strings.Fields(desc) {
		candidate := strings.Trim(token, " \t\r\n<>[](){}\"',;")
		lower := strings.ToLower(candidate)
		if strings.HasPrefix(lower, "http://") || strings.HasPrefix(lower, "https://") {
			return candidate
		}
	}

	return ""
}

// Lowercase aliases for handler compatibility
func getEventDeadline(event MoodleCalendarEvent) time.Time { return GetEventDeadline(event) }
func isValidDeadline(deadline, now, cutoff time.Time) bool { return IsValidDeadline(deadline, now, cutoff) }
func shouldIncludeForUserClass(a, b *string) bool          { return ShouldIncludeForUserClass(a, b) }
func sortAssignmentsByDeadline(a []AssignmentRecord)        { SortAssignmentsByDeadline(a) }
func extractMoodleURLFromDescription(d string) string       { return ExtractMoodleURLFromDescription(d) }
func fetchMoodleCalendar(c context.Context, u string) (string, error) {
	return New().FetchMoodleCalendar(c, u)
}
