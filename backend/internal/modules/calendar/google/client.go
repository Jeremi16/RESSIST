package google

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/jeremi16/ressist-api/internal/config"
	"github.com/jeremi16/ressist-api/internal/models"
	"github.com/jeremi16/ressist-api/internal/pkg/text"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"golang.org/x/sync/errgroup"
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
	IsCompleted bool
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

// StudentSubmission represents a Google Classroom submission state.
type StudentSubmission struct {
	ID         string  `json:"id"`
	CourseID   string  `json:"courseId"`
	CourseWorkID string `json:"courseWorkId"`
	State      string  `json:"state"` // NEW, CREATED, TURNED_IN, RETURNED, RECLAIMED_BY_STUDENT
	Late       bool    `json:"late"`
	AssignedGrade *float64 `json:"assignedGrade"`
}

type StudentSubmissionsResponse struct {
	StudentSubmissions []StudentSubmission `json:"studentSubmissions"`
	NextPageToken      string              `json:"nextPageToken"`
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

	return c.FetchAssignmentsFromCourses(ctx, accessToken, courses)
}

// FetchAssignmentsFromCourses fetches assignments from all courses concurrently.
// Returns error if ANY course fails (strict abort) to avoid partial wipe in PersistAssignments.
func (c *Client) FetchAssignmentsFromCourses(ctx context.Context, accessToken string, courses []GoogleCourse) ([]AssignmentRecord, error) {
	now := time.Now()
	cutoff := now.Add(time.Hour * 24 * upcomingWindowDays)

	// Concurrency for courseWork fetching.
	concurrency := 5
	sem := make(chan struct{}, concurrency)
	var mu sync.Mutex
	assignments := make([]AssignmentRecord, 0, 64)

	eg, ctx := errgroup.WithContext(ctx)
	for _, course := range courses {
		course := course
		sem <- struct{}{}
		eg.Go(func() error {
			defer func() { <-sem }()
			// Check ctx cancellation before request.
			if err := ctx.Err(); err != nil {
				return err
			}
			courseWorks, err := c.FetchGoogleCourseWork(ctx, accessToken, course.ID)
			if err != nil {
				log.Printf("[google] FetchGoogleCourseWork failed course=%s err=%v", course.ID, err)
				return fmt.Errorf("course %s: %w", course.ID, err)
			}
			var local []AssignmentRecord
			for _, work := range courseWorks {
				deadline, ok := convertGoogleDeadline(work.DueDate, work.DueTime)
				if !ok || !isValidDeadline(deadline, now, cutoff) {
					continue
				}
				// Check submission state for accurate completed (best-effort, ignore errors).
				isCompleted := false
				if subs, err := c.FetchStudentSubmissions(ctx, accessToken, course.ID, work.ID); err == nil {
					for _, sub := range subs {
						if sub.State == "TURNED_IN" || sub.State == "RETURNED" || sub.AssignedGrade != nil {
							isCompleted = true
							break
						}
					}
					if isCompleted {
						log.Printf("[google] work completed course=%s work=%s", course.ID, work.ID)
					}
				} else {
					// Graceful: 403 insufficient scope (user not re-consented) -> treat as not completed
					if !strings.Contains(err.Error(), "403") {
						log.Printf("[google] FetchStudentSubmissions failed course=%s work=%s err=%v", course.ID, work.ID, err)
					}
				}
				workURL := strings.TrimSpace(work.CourseWorkURL)
				if workURL == "" {
					workURL = fmt.Sprintf(
						"https://classroom.google.com/c/%s/a/%s/details",
						url.PathEscape(work.CourseID),
						url.PathEscape(work.ID),
					)
				}
				local = append(local, AssignmentRecord{
					Title:       text.DefaultString(work.Title, "Untitled Assignment"),
					Course:      text.DefaultString(course.Name, "Unknown Course"),
					Description: text.NullableStringPointer(work.Description),
					URL:         text.NullableStringPointer(workURL),
					Deadline:    deadline.UTC(),
					ExternalID:  work.ID,
					Source:      "google_classroom",
					IsCompleted: isCompleted,
				})
			}
			if len(local) > 0 {
				mu.Lock()
				assignments = append(assignments, local...)
				mu.Unlock()
			}
			return nil
		})
	}
	if err := eg.Wait(); err != nil {
		return nil, err
	}

	sortAssignmentsByDeadline(assignments)
	return assignments, nil
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
		if response.NextPageToken == pageToken {
			log.Printf("[google] duplicate NextPageToken detected, breaking pagination")
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
		if response.NextPageToken == pageToken {
			log.Printf("[google] duplicate NextPageToken detected, breaking pagination course=%s", courseID)
			break
		}
		pageToken = response.NextPageToken
	}

	return works, nil
}

// FetchStudentSubmissions fetches submission states for a coursework.
func (c *Client) FetchStudentSubmissions(ctx context.Context, accessToken, courseID, courseWorkID string) ([]StudentSubmission, error) {
	subs := make([]StudentSubmission, 0, 8)
	pageToken := ""
	for {
		endpoint := fmt.Sprintf(
			"https://classroom.googleapis.com/v1/courses/%s/courseWork/%s/studentSubmissions?pageSize=100",
			url.PathEscape(courseID), url.PathEscape(courseWorkID),
		)
		if pageToken != "" {
			endpoint += "&pageToken=" + url.QueryEscape(pageToken)
		}
		var resp StudentSubmissionsResponse
		if err := c.FetchGoogleJSON(ctx, endpoint, accessToken, &resp); err != nil {
			return nil, err
		}
		subs = append(subs, resp.StudentSubmissions...)
		if resp.NextPageToken == "" {
			break
		}
		if resp.NextPageToken == pageToken {
			log.Printf("[google] duplicate NextPageToken submissions course=%s work=%s", courseID, courseWorkID)
			break
		}
		pageToken = resp.NextPageToken
		// Typically 1 submission per student, no need for many pages.
		if len(subs) >= 1 {
			// still continue if paginated
		}
	}
	return subs, nil
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
		return "", fmt.Errorf("google refresh token missing - re-auth required")
	}

	if c.cfg == nil || c.cfg.GoogleClientID == "" || c.cfg.GoogleClientSecret == "" {
		return "", fmt.Errorf("google oauth config missing - cannot refresh")
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
