package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"

	"github.com/jeremi16/resisst-api/internal/models"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

// fetchProviderAssignments fetches assignments from the specified provider
func (h *CalendarHandler) fetchProviderAssignments(ctx context.Context, provider string, user *models.User) ([]assignmentRecord, error) {
	switch provider {
	case "moodle":
		return h.fetchMoodleAssignments(ctx, user)
	case "google_classroom":
		return h.fetchGoogleClassroomAssignments(ctx, user)
	default:
		return nil, fmt.Errorf("unsupported provider: %s", provider)
	}
}

// fetchMoodleAssignments fetches assignments from Moodle calendar
func (h *CalendarHandler) fetchMoodleAssignments(ctx context.Context, user *models.User) ([]assignmentRecord, error) {
	if user.MoodleCalendarURL == nil || dereferenceString(user.MoodleCalendarURL, "") == "" {
		return nil, fmt.Errorf("moodle calendar URL is not configured")
	}

	rawICS, err := h.fetchMoodleCalendar(ctx, *user.MoodleCalendarURL)
	if err != nil {
		return nil, err
	}

	return h.parseMoodleEvents(rawICS, user), nil
}

// fetchMoodleCalendar makes HTTP request to fetch Moodle calendar
func (h *CalendarHandler) fetchMoodleCalendar(ctx context.Context, calendarURL string) (string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, strings.TrimSpace(calendarURL), nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", "resisst-api/1.0")

	client := &http.Client{Timeout: 12 * time.Second}
	resp, err := client.Do(req)
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

// parseMoodleEvents parses ICS data and filters by user class
func (h *CalendarHandler) parseMoodleEvents(rawICS string, user *models.User) []assignmentRecord {
	parsedEvents := parseMoodleICS(rawICS)
	now := time.Now()
	cutoff := now.Add(time.Hour * 24 * upcomingWindowDays)

	assignments := make([]assignmentRecord, 0, len(parsedEvents))
	for _, event := range parsedEvents {
		deadline := getEventDeadline(event)
		if !isValidDeadline(deadline, now, cutoff) {
			continue
		}

		classCode := extractClassCode(event.Title)
		if !shouldIncludeForUserClass(classCode, user.ClassCode) {
			continue
		}

		eventURL := strings.TrimSpace(event.URL)
		if eventURL == "" {
			eventURL = extractMoodleURLFromDescription(event.Description)
		}
		assignments = append(assignments, assignmentRecord{
			Title:       defaultString(event.Title, "Untitled Assignment"),
			Course:      defaultString(event.Course, "Umum"),
			ClassCode:   classCode,
			Description: nullableStringPointer(event.Description),
			URL:         nullableStringPointer(eventURL),
			Deadline:    deadline.UTC(),
			ExternalID:  event.UID,
			Source:      "moodle",
		})
	}

	sortAssignmentsByDeadline(assignments)
	return assignments
}

// getEventDeadline returns the deadline (End time or fallback to Start)
func getEventDeadline(event moodleCalendarEvent) time.Time {
	if !event.End.IsZero() {
		return event.End
	}
	return event.Start
}

// isValidDeadline checks if deadline is within the valid range
func isValidDeadline(deadline, now, cutoff time.Time) bool {
	return !deadline.IsZero() && deadline.After(now) && deadline.Before(cutoff)
}

// shouldIncludeForUserClass checks if assignment should be included based on user class
func shouldIncludeForUserClass(assignmentClassCode, userClassCode *string) bool {
	if userClassCode == nil || dereferenceString(userClassCode, "") == "" {
		return true // Include all if user has no class set
	}
	if assignmentClassCode == nil {
		return true // Include general assignments (no class code)
	}
	return *assignmentClassCode == *userClassCode
}

// sortAssignmentsByDeadline sorts assignments by deadline
func sortAssignmentsByDeadline(assignments []assignmentRecord) {
	sort.Slice(assignments, func(i, j int) bool {
		return assignments[i].Deadline.Before(assignments[j].Deadline)
	})
}

// extractMoodleURLFromDescription tries to find a direct URL in ICS description text.
func extractMoodleURLFromDescription(description string) string {
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

// fetchGoogleClassroomAssignments fetches assignments from Google Classroom
func (h *CalendarHandler) fetchGoogleClassroomAssignments(ctx context.Context, user *models.User) ([]assignmentRecord, error) {
	accessToken, err := h.ensureGoogleAccessToken(ctx, user)
	if err != nil {
		return nil, err
	}

	courses, err := h.fetchGoogleCourses(ctx, accessToken)
	if err != nil {
		return nil, err
	}
	if len(courses) == 0 {
		return []assignmentRecord{}, nil
	}

	return h.fetchAssignmentsFromCourses(ctx, accessToken, courses), nil
}

// fetchAssignmentsFromCourses fetches assignments from all courses
func (h *CalendarHandler) fetchAssignmentsFromCourses(ctx context.Context, accessToken string, courses []googleCourse) []assignmentRecord {
	now := time.Now()
	cutoff := now.Add(time.Hour * 24 * upcomingWindowDays)
	assignments := make([]assignmentRecord, 0, 64)

	for _, course := range courses {
		courseWorks, err := h.fetchGoogleCourseWork(ctx, accessToken, course.ID)
		if err != nil {
			continue
		}

		for _, work := range courseWorks {
			deadline, ok := convertGoogleDeadline(work.DueDate, work.DueTime)
			if !ok || !isValidDeadline(deadline, now, cutoff) {
				continue
			}
			workURL := strings.TrimSpace(work.CourseWorkURL)
			if workURL == "" {
				workURL = fmt.Sprintf(
					"https://classroom.google.com/c/%s/a/%s/details",
					url.PathEscape(work.CourseID),
					url.PathEscape(work.ID),
				)
			}
			assignments = append(assignments, assignmentRecord{
				Title:       defaultString(work.Title, "Untitled Assignment"),
				Course:      defaultString(course.Name, "Unknown Course"),
				Description: nullableStringPointer(work.Description),
				URL:         nullableStringPointer(workURL),
				Deadline:    deadline.UTC(),
				ExternalID:  work.ID,
				Source:      "google_classroom",
			})
		}
	}

	sortAssignmentsByDeadline(assignments)
	return assignments
}

// fetchGoogleCourses fetches all active courses from Google Classroom
func (h *CalendarHandler) fetchGoogleCourses(ctx context.Context, accessToken string) ([]googleCourse, error) {
	courses := make([]googleCourse, 0, 16)
	pageToken := ""

	for {
		endpoint := "https://classroom.googleapis.com/v1/courses?pageSize=100&courseStates=ACTIVE"
		if pageToken != "" {
			endpoint += "&pageToken=" + url.QueryEscape(pageToken)
		}

		var response googleCoursesResponse
		if err := h.fetchGoogleJSON(ctx, endpoint, accessToken, &response); err != nil {
			return nil, err
		}
		courses = append(courses, response.Courses...)

		if response.NextPageToken == "" {
			break
		}
		pageToken = response.NextPageToken
	}

	return courses, nil
}

// fetchGoogleCourseWork fetches all coursework for a course
func (h *CalendarHandler) fetchGoogleCourseWork(ctx context.Context, accessToken string, courseID string) ([]googleCourseWork, error) {
	works := make([]googleCourseWork, 0, 32)
	pageToken := ""

	for {
		endpoint := fmt.Sprintf(
			"https://classroom.googleapis.com/v1/courses/%s/courseWork?pageSize=100&courseWorkStates=PUBLISHED",
			url.PathEscape(courseID),
		)
		if pageToken != "" {
			endpoint += "&pageToken=" + url.QueryEscape(pageToken)
		}

		var response googleCourseWorkResponse
		if err := h.fetchGoogleJSON(ctx, endpoint, accessToken, &response); err != nil {
			return nil, err
		}
		works = append(works, response.CourseWork...)

		if response.NextPageToken == "" {
			break
		}
		pageToken = response.NextPageToken
	}

	return works, nil
}

// fetchGoogleJSON makes authenticated request to Google API
func (h *CalendarHandler) fetchGoogleJSON(ctx context.Context, endpoint string, accessToken string, target interface{}) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 12 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		return fmt.Errorf("google api failed: status=%d body=%s", resp.StatusCode, string(body))
	}

	return json.NewDecoder(resp.Body).Decode(target)
}

// ensureGoogleAccessToken ensures valid Google access token (refreshes if needed)
func (h *CalendarHandler) ensureGoogleAccessToken(ctx context.Context, user *models.User) (string, error) {
	accessToken := dereferenceString(user.GoogleAccessToken, "")
	if accessToken == "" {
		return "", fmt.Errorf("google access token is not configured")
	}

	// Token still valid
	if user.GoogleTokenExpiry == nil || time.Now().Before(user.GoogleTokenExpiry.Add(-1*time.Minute)) {
		return accessToken, nil
	}

	// Try to refresh token
	return h.refreshGoogleToken(ctx, user, accessToken)
}

// refreshGoogleToken refreshes Google OAuth token
func (h *CalendarHandler) refreshGoogleToken(ctx context.Context, user *models.User, currentToken string) (string, error) {
	refreshToken := dereferenceString(user.GoogleRefreshToken, "")
	if refreshToken == "" {
		return currentToken, nil // Can't refresh without refresh token
	}

	if h.cfg == nil || h.cfg.GoogleClientID == "" || h.cfg.GoogleClientSecret == "" {
		return currentToken, nil // Can't refresh without OAuth config
	}

	oauthConfig := oauth2.Config{
		ClientID:     h.cfg.GoogleClientID,
		ClientSecret: h.cfg.GoogleClientSecret,
		Endpoint:     google.Endpoint,
	}

	seedToken := &oauth2.Token{
		AccessToken:  currentToken,
		RefreshToken: refreshToken,
	}
	if user.GoogleTokenExpiry != nil {
		seedToken.Expiry = user.GoogleTokenExpiry.UTC()
	}

	refreshed, err := oauthConfig.TokenSource(ctx, seedToken).Token()
	if err != nil {
		return "", err
	}
	if dereferenceString(&refreshed.AccessToken, "") == "" {
		return "", fmt.Errorf("empty access token after refresh")
	}

	if err := h.updateGoogleTokens(ctx, user, refreshed); err != nil {
		return "", err
	}

	return refreshed.AccessToken, nil
}

// updateGoogleTokens updates Google tokens in database
func (h *CalendarHandler) updateGoogleTokens(ctx context.Context, user *models.User, token *oauth2.Token) error {
	updates := map[string]interface{}{
		"google_access_token": token.AccessToken,
	}

	if !token.Expiry.IsZero() {
		expiry := token.Expiry.UTC()
		updates["google_token_expiry"] = expiry
		user.GoogleTokenExpiry = &expiry
	}
	if dereferenceString(&token.RefreshToken, "") != "" {
		updates["google_refresh_token"] = token.RefreshToken
		user.GoogleRefreshToken = &token.RefreshToken
	}

	if err := h.db.WithContext(ctx).Model(&models.User{}).Where("id = ?", user.ID).Updates(updates).Error; err != nil {
		return err
	}

	user.GoogleAccessToken = &token.AccessToken
	return nil
}
