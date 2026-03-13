package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jeremi16/resisst-api/internal/models"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"gorm.io/gorm"
)

type assignmentRecord struct {
	Title      string
	Course     string
	Deadline   time.Time
	ExternalID string
	Source     string
}

type moodleCalendarEvent struct {
	UID    string
	Title  string
	Course string
	Start  time.Time
	End    time.Time
}

type googleCourse struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type googleCoursesResponse struct {
	Courses       []googleCourse `json:"courses"`
	NextPageToken string         `json:"nextPageToken"`
}

type googleDate struct {
	Year  int `json:"year"`
	Month int `json:"month"`
	Day   int `json:"day"`
}

type googleTimeOfDay struct {
	Hours   int `json:"hours"`
	Minutes int `json:"minutes"`
}

type googleCourseWork struct {
	ID            string           `json:"id"`
	Title         string           `json:"title"`
	CourseID      string           `json:"courseId"`
	DueDate       *googleDate      `json:"dueDate"`
	DueTime       *googleTimeOfDay `json:"dueTime"`
	CourseWorkURL string           `json:"alternateLink"`
}

type googleCourseWorkResponse struct {
	CourseWork    []googleCourseWork `json:"courseWork"`
	NextPageToken string             `json:"nextPageToken"`
}

func (h *CalendarHandler) syncAndBuildCalendarResponse(c *gin.Context, user *models.User, providers []string) (gin.H, error) {
	if len(providers) == 0 {
		return h.buildCalendarResponse(c, user, providers, nil, true)
	}

	sourceInfo := make([]calendarSourceInfo, 0, len(providers))
	successfulSources := 0
	failedSources := 0

	for _, provider := range providers {
		assignments, err := h.fetchProviderAssignments(c.Request.Context(), provider, user)
		if err != nil {
			sourceInfo = append(sourceInfo, calendarSourceInfo{
				Provider: provider,
				Count:    0,
				Success:  false,
			})
			failedSources++
			continue
		}

		if err := h.persistAssignments(c.Request.Context(), user.ID, provider, assignments); err != nil {
			sourceInfo = append(sourceInfo, calendarSourceInfo{
				Provider: provider,
				Count:    0,
				Success:  false,
			})
			failedSources++
			continue
		}

		sourceInfo = append(sourceInfo, calendarSourceInfo{
			Provider: provider,
			Count:    len(assignments),
			Success:  true,
		})
		successfulSources++
	}

	fromCache := true
	if successfulSources > 0 {
		now := time.Now().UTC()
		if err := h.db.WithContext(c.Request.Context()).
			Model(&models.User{}).
			Where("id = ?", user.ID).
			Update("lms_last_synced_at", now).Error; err == nil {
			user.LMSLastSyncedAt = &now
		}
		fromCache = false
	}

	response, err := h.buildCalendarResponse(c, user, providers, sourceInfo, fromCache)
	if err != nil {
		return nil, err
	}
	response["successfulSources"] = successfulSources
	response["failedSources"] = failedSources
	return response, nil
}

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

func (h *CalendarHandler) persistAssignments(ctx context.Context, userID string, provider string, assignments []assignmentRecord) error {
	now := time.Now().UTC()
	assignmentsByKey := make(map[string]assignmentRecord, len(assignments))

	for _, assignment := range assignments {
		key := buildAssignmentSyncKey(provider, assignment.ExternalID, assignment.Course, assignment.Title)
		assignmentsByKey[key] = assignment
	}

	keys := make([]string, 0, len(assignmentsByKey))
	for key := range assignmentsByKey {
		keys = append(keys, key)
	}

	return h.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, key := range keys {
			assignment := assignmentsByKey[key]
			courseValue := nullableStringPointer(assignment.Course)
			sourceIDValue := nullableStringPointer(assignment.ExternalID)

			var existing models.Event
			err := tx.Where("user_id = ? AND sync_key = ?", userID, key).First(&existing).Error
			if err != nil {
				if !errors.Is(err, gorm.ErrRecordNotFound) {
					return err
				}

				event := models.Event{
					ID:              uuid.NewString(),
					UserID:          userID,
					Title:           assignment.Title,
					Course:          courseValue,
					Deadline:        assignment.Deadline.UTC(),
					Source:          provider,
					SourceID:        sourceIDValue,
					SyncKey:         key,
					Reminder24HSent: false,
					RemindersSent:   "[]",
				}
				if err := tx.Create(&event).Error; err != nil {
					return err
				}
				continue
			}

			updateData := map[string]interface{}{
				"title":     assignment.Title,
				"course":    courseValue,
				"deadline":  assignment.Deadline.UTC(),
				"source":    provider,
				"source_id": sourceIDValue,
			}
			if err := tx.Model(&models.Event{}).Where("id = ?", existing.ID).Updates(updateData).Error; err != nil {
				return err
			}
		}

		query := tx.Where("user_id = ? AND source = ? AND deadline > ?", userID, provider, now)
		if len(keys) > 0 {
			query = query.Where("sync_key NOT IN ?", keys)
		}
		return query.Delete(&models.Event{}).Error
	})
}

func (h *CalendarHandler) fetchMoodleAssignments(ctx context.Context, user *models.User) ([]assignmentRecord, error) {
	if user.MoodleCalendarURL == nil || strings.TrimSpace(*user.MoodleCalendarURL) == "" {
		return nil, fmt.Errorf("moodle calendar URL is not configured")
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, strings.TrimSpace(*user.MoodleCalendarURL), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "resisst-api/1.0")

	client := &http.Client{Timeout: 12 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return nil, fmt.Errorf("moodle fetch failed: status=%d body=%s", resp.StatusCode, string(body))
	}

	rawICS, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	parsedEvents := parseMoodleICS(string(rawICS))
	now := time.Now()
	cutoff := now.Add(time.Hour * 24 * upcomingWindowDays)

	assignments := make([]assignmentRecord, 0, len(parsedEvents))
	for _, event := range parsedEvents {
		deadline := event.End
		if deadline.IsZero() {
			deadline = event.Start
		}
		if deadline.IsZero() || !deadline.After(now) || deadline.After(cutoff) {
			continue
		}

		assignments = append(assignments, assignmentRecord{
			Title:      defaultString(event.Title, "Untitled Assignment"),
			Course:     defaultString(event.Course, "Umum"),
			Deadline:   deadline.UTC(),
			ExternalID: event.UID,
			Source:     "moodle",
		})
	}

	sort.Slice(assignments, func(i, j int) bool {
		return assignments[i].Deadline.Before(assignments[j].Deadline)
	})
	return assignments, nil
}

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
			if !ok || !deadline.After(now) || deadline.After(cutoff) {
				continue
			}
			assignments = append(assignments, assignmentRecord{
				Title:      defaultString(work.Title, "Untitled Assignment"),
				Course:     defaultString(course.Name, "Unknown Course"),
				Deadline:   deadline.UTC(),
				ExternalID: work.ID,
				Source:     "google_classroom",
			})
		}
	}

	sort.Slice(assignments, func(i, j int) bool {
		return assignments[i].Deadline.Before(assignments[j].Deadline)
	})
	return assignments, nil
}

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
		if strings.TrimSpace(response.NextPageToken) == "" {
			break
		}
		pageToken = response.NextPageToken
	}

	return courses, nil
}

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
		if strings.TrimSpace(response.NextPageToken) == "" {
			break
		}
		pageToken = response.NextPageToken
	}

	return works, nil
}

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

func (h *CalendarHandler) ensureGoogleAccessToken(ctx context.Context, user *models.User) (string, error) {
	accessToken := ""
	if user.GoogleAccessToken != nil {
		accessToken = strings.TrimSpace(*user.GoogleAccessToken)
	}
	if accessToken == "" {
		return "", fmt.Errorf("google access token is not configured")
	}

	if user.GoogleTokenExpiry == nil || time.Now().Before(user.GoogleTokenExpiry.Add(-1*time.Minute)) {
		return accessToken, nil
	}

	refreshToken := ""
	if user.GoogleRefreshToken != nil {
		refreshToken = strings.TrimSpace(*user.GoogleRefreshToken)
	}
	if refreshToken == "" {
		return accessToken, nil
	}

	if h.cfg == nil || strings.TrimSpace(h.cfg.GoogleClientID) == "" || strings.TrimSpace(h.cfg.GoogleClientSecret) == "" {
		return accessToken, nil
	}

	oauthConfig := oauth2.Config{
		ClientID:     h.cfg.GoogleClientID,
		ClientSecret: h.cfg.GoogleClientSecret,
		Endpoint:     google.Endpoint,
	}

	seedToken := &oauth2.Token{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}
	if user.GoogleTokenExpiry != nil {
		seedToken.Expiry = user.GoogleTokenExpiry.UTC()
	}

	refreshed, err := oauthConfig.TokenSource(ctx, seedToken).Token()
	if err != nil {
		return "", err
	}
	if strings.TrimSpace(refreshed.AccessToken) == "" {
		return "", fmt.Errorf("empty access token after refresh")
	}

	updates := map[string]interface{}{
		"google_access_token": refreshed.AccessToken,
	}
	if !refreshed.Expiry.IsZero() {
		expiry := refreshed.Expiry.UTC()
		updates["google_token_expiry"] = expiry
		user.GoogleTokenExpiry = &expiry
	}
	if strings.TrimSpace(refreshed.RefreshToken) != "" {
		updates["google_refresh_token"] = refreshed.RefreshToken
		user.GoogleRefreshToken = &refreshed.RefreshToken
	}

	if err := h.db.WithContext(ctx).
		Model(&models.User{}).
		Where("id = ?", user.ID).
		Updates(updates).Error; err != nil {
		return "", err
	}

	user.GoogleAccessToken = &refreshed.AccessToken
	return refreshed.AccessToken, nil
}

func parseMoodleICS(raw string) []moodleCalendarEvent {
	content := strings.ReplaceAll(raw, "\r\n", "\n")
	content = strings.ReplaceAll(content, "\r", "\n")
	lines := strings.Split(content, "\n")

	events := make([]moodleCalendarEvent, 0, 32)
	current := moodleCalendarEvent{}
	inEvent := false

	for i := 0; i < len(lines); i++ {
		line := strings.TrimRight(lines[i], " \t")
		if line == "" {
			continue
		}

		for i+1 < len(lines) && strings.HasPrefix(lines[i+1], " ") {
			line += strings.TrimPrefix(lines[i+1], " ")
			i++
		}

		switch {
		case line == "BEGIN:VEVENT":
			inEvent = true
			current = moodleCalendarEvent{}
		case line == "END:VEVENT":
			if inEvent && strings.TrimSpace(current.Title) != "" {
				events = append(events, current)
			}
			inEvent = false
		default:
			if !inEvent {
				continue
			}
			switch {
			case strings.HasPrefix(line, "UID:"):
				current.UID = strings.TrimSpace(strings.TrimPrefix(line, "UID:"))
			case strings.HasPrefix(line, "SUMMARY:"):
				current.Title = unescapeICS(strings.TrimPrefix(line, "SUMMARY:"))
			case strings.HasPrefix(line, "CATEGORIES:"):
				current.Course = unescapeICS(strings.TrimPrefix(line, "CATEGORIES:"))
			case strings.HasPrefix(line, "DTSTART"):
				value := icsValue(line)
				if t, ok := parseICalDate(value); ok {
					current.Start = t
				}
			case strings.HasPrefix(line, "DTEND"):
				value := icsValue(line)
				if t, ok := parseICalDate(value); ok {
					current.End = t
				}
			}
		}
	}

	sort.Slice(events, func(i, j int) bool {
		left := events[i].End
		if left.IsZero() {
			left = events[i].Start
		}
		right := events[j].End
		if right.IsZero() {
			right = events[j].Start
		}
		return left.Before(right)
	})
	return events
}

func icsValue(line string) string {
	idx := strings.Index(line, ":")
	if idx < 0 || idx == len(line)-1 {
		return ""
	}
	return strings.TrimSpace(line[idx+1:])
}

func parseICalDate(raw string) (time.Time, bool) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return time.Time{}, false
	}

	layouts := []string{
		"20060102T150405Z",
		"20060102T150405",
		"20060102",
	}

	for _, layout := range layouts {
		var t time.Time
		var err error
		if strings.HasSuffix(layout, "Z") {
			t, err = time.Parse(layout, value)
		} else {
			t, err = time.ParseInLocation(layout, value, time.Local)
		}
		if err == nil {
			return t, true
		}
	}

	return time.Time{}, false
}

func convertGoogleDeadline(dueDate *googleDate, dueTime *googleTimeOfDay) (time.Time, bool) {
	if dueDate == nil || dueDate.Year == 0 || dueDate.Month == 0 || dueDate.Day == 0 {
		return time.Time{}, false
	}

	hours := 23
	minutes := 59
	if dueTime != nil {
		if dueTime.Hours >= 0 && dueTime.Hours <= 23 {
			hours = dueTime.Hours
		}
		if dueTime.Minutes >= 0 && dueTime.Minutes <= 59 {
			minutes = dueTime.Minutes
		}
	}

	return time.Date(dueDate.Year, time.Month(dueDate.Month), dueDate.Day, hours, minutes, 0, 0, time.UTC), true
}

func buildAssignmentSyncKey(provider string, externalID string, course string, title string) string {
	if strings.TrimSpace(externalID) != "" {
		return provider + ":" + strings.TrimSpace(externalID)
	}
	return provider + ":" + normalizeText(course) + ":" + normalizeText(title)
}

func normalizeText(value string) string {
	return strings.Join(strings.Fields(strings.ToLower(strings.TrimSpace(value))), " ")
}

func nullableStringPointer(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func unescapeICS(value string) string {
	replaced := strings.ReplaceAll(value, "\\n", "\n")
	replaced = strings.ReplaceAll(replaced, "\\,", ",")
	replaced = strings.ReplaceAll(replaced, "\\;", ";")
	replaced = strings.ReplaceAll(replaced, "\\\\", "\\")
	return strings.TrimSpace(replaced)
}
