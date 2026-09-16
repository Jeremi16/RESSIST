package client

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

// Client talks to ressist-api 100% over HTTP. No DATABASE_URL here.
type Client struct {
	base  string
	token string
	http  *http.Client
}

func New(base, token string) *Client {
	return &Client{
		base:  base,
		token: token,
		http:  &http.Client{Timeout: 20 * time.Second},
	}
}

func (c *Client) do(method, path string, actAsUser string, body interface{}, out interface{}) error {
	var reader io.Reader
	if body != nil {
		buf, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reader = bytes.NewReader(buf)
	}
	req, err := http.NewRequest(method, c.base+path, reader)
	if err != nil {
		return err
	}
	req.Header.Set("X-Bot-Token", c.token)
	if actAsUser != "" {
		req.Header.Set("X-Act-As-User", actAsUser)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("api %s %s: status %d: %s", method, path, resp.StatusCode, truncate(string(data), 300))
	}
	if out == nil {
		return nil
	}
	if err := json.Unmarshal(data, out); err != nil {
		return fmt.Errorf("decode %s %s: %w", method, path, err)
	}
	return nil
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}

// ---------------------------------------------------------------------------
// Types (mirror backend JSON)
// ---------------------------------------------------------------------------

type TelegramUser struct {
	ID              string  `json:"id"`
	Name            string  `json:"name"`
	TelegramEnabled bool    `json:"telegram_enabled"`
	TelegramChatID  *string `json:"telegram_chat_id"`
}

type BotUser struct {
	ID              string  `json:"id"`
	Name            string  `json:"name"`
	TelegramEnabled bool    `json:"telegram_enabled"`
	TelegramChatID  *string `json:"telegram_chat_id"`
	MorningBriefing bool    `json:"morning_briefing"`
	ReminderHours   string  `json:"reminder_hours"`
	MutedCourses    string  `json:"muted_courses"`
	ClassCode       *string `json:"class_code"`
}

type Assignment struct {
	ID         string     `json:"id"`
	Title      string     `json:"title"`
	FullTitle  string     `json:"full_title"`
	Course     *string    `json:"course"`
	ClassCode  *string    `json:"class_code"`
	Deadline   time.Time  `json:"deadline"`
	Completed  bool       `json:"completed"`
	Status     string     `json:"status"`
	Source     string     `json:"source"`
	URL        *string    `json:"url"`
}

type DueAssignment struct {
	ID            string    `json:"id"`
	UserID        string    `json:"user_id"`
	Title         string    `json:"title"`
	Course        *string   `json:"course"`
	ClassCode     *string   `json:"class_code"`
	Deadline      time.Time `json:"deadline"`
	RemindersSent string    `json:"reminders_sent"`
	ChatID        *string   `json:"telegram_chat_id"`
	UserName      string    `json:"user_name"`
	Completed     bool      `json:"completed"`
	MutedCourses         string  `json:"muted_courses"`
	UserClassCode        *string `json:"user_class_code"`
	CourseKeywordFilters string  `json:"course_keyword_filters"`
	ReminderHours        string  `json:"reminder_hours"`
}

type BriefingCandidate struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	TelegramChat *string `json:"telegram_chat_id"`
}

type VerifyResult struct {
	Success bool   `json:"success"`
	UserID  string `json:"user_id"`
	Name    string `json:"name"`
}

// ---------------------------------------------------------------------------
// Methods
// ---------------------------------------------------------------------------

func (c *Client) GetUserByTelegram(chatID string) (*TelegramUser, error) {
	var out TelegramUser
	if err := c.do(http.MethodGet, "/internal/users/by-telegram/"+url.PathEscape(chatID), "", nil, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) GetUser(userID string) (*BotUser, error) {
	var out BotUser
	if err := c.do(http.MethodGet, "/internal/users/"+url.PathEscape(userID), "", nil, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) VerifyTelegram(code, chatID, username string) (*VerifyResult, error) {
	var out VerifyResult
	body := map[string]interface{}{"code": code, "chat_id": chatID}
	if username != "" {
		body["telegram_username"] = username
	}
	if err := c.do(http.MethodPost, "/internal/telegram/verify", "", body, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) GetAssignments(userID string) ([]Assignment, error) {
	var out []Assignment
	if err := c.do(http.MethodGet, "/v1/assignments", userID, nil, &out); err != nil {
		return nil, err
	}
	if out == nil {
		out = []Assignment{}
	}
	return out, nil
}

func (c *Client) CompleteAssignment(userID, assignmentID string) error {
	body := map[string]interface{}{"assignment_id": assignmentID}
	return c.do(http.MethodPost, "/v1/assignments/complete", userID, body, nil)
}

func (c *Client) GetDueAssignments(hoursBefore, windowMinutes int) ([]DueAssignment, error) {
	path := fmt.Sprintf("/internal/scheduler/due?hours_before=%d&window_minutes=%d", hoursBefore, windowMinutes)
	var out []DueAssignment
	if err := c.do(http.MethodGet, path, "", nil, &out); err != nil {
		return nil, err
	}
	if out == nil {
		out = []DueAssignment{}
	}
	return out, nil
}

func (c *Client) MarkReminderSent(assignmentID, key string) error {
	body := map[string]interface{}{"assignment_id": assignmentID, "key": key}
	return c.do(http.MethodPost, "/internal/scheduler/mark-sent", "", body, nil)
}

func (c *Client) GetBriefingCandidates() ([]BriefingCandidate, error) {
	var out []BriefingCandidate
	if err := c.do(http.MethodGet, "/internal/scheduler/briefing-candidates", "", nil, &out); err != nil {
		return nil, err
	}
	if out == nil {
		out = []BriefingCandidate{}
	}
	return out, nil
}
