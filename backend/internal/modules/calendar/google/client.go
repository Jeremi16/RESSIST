package google

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

	"github.com/jeremi16/resisst-api/internal/config"
	"github.com/jeremi16/resisst-api/internal/models"
	"github.com/jeremi16/resisst-api/internal/pkg/text"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"gorm.io/gorm"
)

const upcomingWindowDays = 60

// AssignmentRecord mirrors sync.AssignmentRecord for google package isolation.
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

// GoogleCourse represents a Google Classroom course.
type GoogleCourse struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// GoogleCoursesResponse represents paginated courses response.
type GoogleCoursesResponse struct {
	Courses       []GoogleCourse `json:"courses"`
	NextPageToken string         `json:"nextPageToken"`
}

// GoogleDate represents due date.
type GoogleDate struct {
	Year  int `json:"year"`
	Month int `json:"month"`
	Day   int `json:"day"`
}

// GoogleTimeOfDay represents due time.
type GoogleTimeOfDay struct {
	Hours   int `json:"hours"`
	Minutes int `json:"minutes"`
}

// GoogleCourseWork represents a coursework item.
type GoogleCourseWork struct {
	ID            string           `json:"id"`
	Title         string           `json:"title"`
	Description   string           `json:"description"`
	CourseID      string           `json:"courseId"`
	DueDate       *GoogleDate      `json:"dueDate"`
	DueTime       *GoogleTimeOfDay `json:"dueTime"`
	CourseWorkURL string           `json:"alternateLink"`
}

// GoogleCourseWorkResponse represents paginated coursework response.
type GoogleCourseWorkResponse struct {
	CourseWork    []GoogleCourseWork `json:"courseWork"`
	NextPageToken string             `json:"nextPageToken"`
}

// Client handles Google Classroom API interactions.
type Client struct {
	db  *gorm.DB
	cfg *config.Config
}

// New creates a new Google Client.
func New(db *gorm.DB, cfg *config.Config) *Client {
	return &Client{db: db, cfg: cfg}
}

// FetchGoogleClassroomAssignments fetches assignments from Google Classroom.
func (c *Client) FetchGoogleClassroomAssignments(ctx context.Context, user *models.User) ([]AssignmentRecord, error) {
	accessToken, err := c.EnsureGoogleAccessToken(ctx, user)
	if err != nil {
		return nil, err
	}

	courses, err := c.FetchGoogleCourses(ctx, accessToken)
	if err != nil {
		return nil, err
	}
	if len(courses) == 0 {
		return []AssignmentRecord{}, nil
	}

	return c.FetchAssignmentsFromCourses(ctx, accessToken, courses), nil
}

// FetchAssignmentsFromCourses fetches assignments from all courses.
func (c *Client) FetchAssignmentsFromCourses(ctx context.Context, accessToken string, courses []GoogleCourse) []AssignmentRecord {
	now := time.Now()
	cutoff := now.Add(time.Hour * 24 * upcomingWindowDays)
	assignments := make([]AssignmentRecord, 0, 64)

	for _, course := range courses {
		courseWorks, err := c.FetchGoogleCourseWork(ctx, accessToken, course.ID)
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
			assignments = append(assignments, AssignmentRecord{
				Title:       text.DefaultString(work.Title, "Untitled Assignment"),
				Course:      text.DefaultString(course.Name, "Unknown Course"),
				Description: text.NullableStringPointer(work.Description),
				URL:         text.NullableStringPointer(workURL),
				Deadline:    deadline.UTC(),
				ExternalID:  work.ID,
				Source:      "google_classroom",
			})
		}
	}

	sortAssignmentsByDeadline(assignments)
	return assignments
}

// FetchGoogleCourses fetches all active courses from Google Classroom.
func (c *Client) FetchGoogleCourses(ctx context.Context, accessToken string) ([]GoogleCourse, error) {
	courses := make([]GoogleCourse, 0, 16)
	pageToken := ""

	for {
		endpoint := "https://classroom.googleapis.com/v1/courses?pageSize=100&courseStates=ACTIVE"
		if pageToken != "" {
			endpoint += "&pageToken=" + url.QueryEscape(pageToken)
		}

		var response GoogleCoursesResponse
		if err := c.FetchGoogleJSON(ctx, endpoint, accessToken, &response); err != nil {
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

// FetchGoogleCourseWork fetches all coursework for a course.
func (c *Client) FetchGoogleCourseWork(ctx context.Context, accessToken string, courseID string) ([]GoogleCourseWork, error) {
	works := make([]GoogleCourseWork, 0, 32)
	pageToken := ""

	for {
		endpoint := fmt.Sprintf(
			"https://classroom.googleapis.com/v1/courses/%s/courseWork?pageSize=100&courseWorkStates=PUBLISHED",
			url.PathEscape(courseID),
		)
		if pageToken != "" {
			endpoint += "&pageToken=" + url.QueryEscape(pageToken)
		}

		var response GoogleCourseWorkResponse
		if err := c.FetchGoogleJSON(ctx, endpoint, accessToken, &response); err != nil {
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

// FetchGoogleJSON makes authenticated request to Google API.
func (c *Client) FetchGoogleJSON(ctx context.Context, endpoint string, accessToken string, target interface{}) error {
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

// EnsureGoogleAccessToken ensures valid Google access token (refreshes if needed).
func (c *Client) EnsureGoogleAccessToken(ctx context.Context, user *models.User) (string, error) {
	accessToken := text.Dereference(user.GoogleAccessToken, "")
	if accessToken == "" {
		return "", fmt.Errorf("google access token is not configured")
	}

	// Token still valid
	if user.GoogleTokenExpiry == nil || time.Now().Before(user.GoogleTokenExpiry.Add(-1*time.Minute)) {
		return accessToken, nil
	}

	// Try to refresh token
	return c.RefreshGoogleToken(ctx, user, accessToken)
}

// RefreshGoogleToken refreshes Google OAuth token.
func (c *Client) RefreshGoogleToken(ctx context.Context, user *models.User, currentToken string) (string, error) {
	refreshToken := text.Dereference(user.GoogleRefreshToken, "")
	if refreshToken == "" {
		return currentToken, nil // Can't refresh without refresh token
	}

	if c.cfg == nil || c.cfg.GoogleClientID == "" || c.cfg.GoogleClientSecret == "" {
		return currentToken, nil // Can't refresh without OAuth config
	}

	oauthConfig := oauth2.Config{
		ClientID:     c.cfg.GoogleClientID,
		ClientSecret: c.cfg.GoogleClientSecret,
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
	if text.Dereference(&refreshed.AccessToken, "") == "" {
		return "", fmt.Errorf("empty access token after refresh")
	}

	if err := c.UpdateGoogleTokens(ctx, user, refreshed); err != nil {
		return "", err
	}

	return refreshed.AccessToken, nil
}

// UpdateGoogleTokens updates Google tokens in database.
func (c *Client) UpdateGoogleTokens(ctx context.Context, user *models.User, token *oauth2.Token) error {
	updates := map[string]interface{}{
		"google_access_token": token.AccessToken,
	}

	if !token.Expiry.IsZero() {
		expiry := token.Expiry.UTC()
		updates["google_token_expiry"] = expiry
		user.GoogleTokenExpiry = &expiry
	}
	if text.Dereference(&token.RefreshToken, "") != "" {
		updates["google_refresh_token"] = token.RefreshToken
		user.GoogleRefreshToken = &token.RefreshToken
	}

	if err := c.db.WithContext(ctx).Model(&models.User{}).Where("id = ?", user.ID).Updates(updates).Error; err != nil {
		return err
	}

	user.GoogleAccessToken = &token.AccessToken
	return nil
}

// Helpers

func convertGoogleDeadline(dueDate *GoogleDate, dueTime *GoogleTimeOfDay) (time.Time, bool) {
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

func isValidDeadline(deadline, now, cutoff time.Time) bool {
	return !deadline.IsZero() && deadline.After(now) && deadline.Before(cutoff)
}

func sortAssignmentsByDeadline(assignments []AssignmentRecord) {
	sort.Slice(assignments, func(i, j int) bool {
		return assignments[i].Deadline.Before(assignments[j].Deadline)
	})
}

// Lowercase aliases for internal compatibility

type googleCourse = GoogleCourse
type googleCoursesResponse = GoogleCoursesResponse
type googleDate = GoogleDate
type googleTimeOfDay = GoogleTimeOfDay
type googleCourseWork = GoogleCourseWork
type googleCourseWorkResponse = GoogleCourseWorkResponse
