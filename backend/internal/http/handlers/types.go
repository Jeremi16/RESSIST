package handlers

import "time"

// ============================================================================
// Calendar Types
// ============================================================================

type calendarEventPreview struct {
	ID             string    `json:"id"`
	Title          string    `json:"title"`
	FullTitle      string    `json:"full_title"`
	Course         string    `json:"course"`
	OriginalCourse string    `json:"original_course"`
	CourseID       *string   `json:"course_id,omitempty"`
	ClassCode      *string   `json:"class_code,omitempty"`
	Description    *string   `json:"description,omitempty"`
	URL            *string   `json:"url,omitempty"`
	Deadline       string    `json:"deadline"`
	TimeRemaining  string    `json:"timeRemaining"`
	DeadlineDate   time.Time `json:"deadlineDate"`
	Source         string    `json:"source"`
	Completed      bool      `json:"completed"`
	CompletedAt    *time.Time `json:"completed_at,omitempty"`
}

type calendarSourceInfo struct {
	Provider string `json:"provider"`
	Count    int    `json:"count"`
	Success  bool   `json:"success"`
}

type calendarTestRequest struct {
	MoodleCalendarURL string `json:"moodle_calendar_url"`
	TestMoodle        bool   `json:"test_moodle"`
	TestGoogle        bool   `json:"test_google"`
}

// Sort options for tasks
const (
	SortDeadlineAsc  = "deadline_asc"  // Deadline terdekat (default)
	SortDeadlineDesc = "deadline_desc" // Deadline terjauh
	SortNewest       = "newest"        // Event terbaru ditambahkan
	SortOldest       = "oldest"        // Event paling lama ditambahkan
)

// ============================================================================
// User Types
// ============================================================================

type userUpdateRequest struct {
	WhatsAppNumber         *string `json:"whatsapp_number"`
	WhatsAppEnabled        *bool   `json:"whatsapp_enabled"`
	TelegramChatID         *string `json:"telegram_chat_id"`
	TelegramEnabled        *bool   `json:"telegram_enabled"`
	MoodleEnabled          *bool   `json:"moodle_enabled"`
	MoodleCalendarURL      *string `json:"moodle_calendar_url"`
	GoogleClassroomEnabled *bool   `json:"google_classroom_enabled"`
	ReminderHours          *string `json:"reminder_hours"`
	MorningBriefing        *bool   `json:"morning_briefing"`
	MutedCourses           *string `json:"muted_courses"`
	CourseAliases          *string `json:"course_aliases"`
	ClassCode              *string `json:"class_code"`
	AvailableClassCodes    *string `json:"available_class_codes"`
}

type userResponse struct {
	ID                     string            `json:"id"`
	Email                  string            `json:"email"`
	Name                   string            `json:"name"`
	AvatarURL              string            `json:"avatar_url"`
	WhatsAppNumber         *string           `json:"whatsapp_number"`
	WhatsAppEnabled        bool              `json:"whatsapp_enabled"`
	TelegramChatID         *string           `json:"telegram_chat_id"`
	TelegramEnabled        bool              `json:"telegram_enabled"`
	MoodleEnabled          bool              `json:"moodle_enabled"`
	MoodleCalendarURL      *string           `json:"moodle_calendar_url"`
	GoogleClassroomEnabled bool              `json:"google_classroom_enabled"`
	GoogleConnected        bool              `json:"google_connected"`
	TelegramBotUsername    string            `json:"telegram_bot_username"`
	ReminderHours          string            `json:"reminder_hours"`
	MorningBriefing        bool              `json:"morning_briefing"`
	MutedCourses           string            `json:"muted_courses"`
	CourseAliases          map[string]string `json:"course_aliases"`
	ClassCode              *string           `json:"class_code"`
	AvailableClassCodes    []string          `json:"available_class_codes"`
	CreatedAt              string            `json:"created_at"`
}

type courseAliasRequest struct {
	OriginalName string `json:"original_name" binding:"required"`
	Alias        string `json:"alias" binding:"required"`
}

type courseAliasDeleteRequest struct {
	OriginalName string `json:"original_name" binding:"required"`
}

type courseAliasResponse struct {
	Aliases map[string]string `json:"aliases"`
}

// ============================================================================
// Sync Types
// ============================================================================

type assignmentRecord struct {
	Title       string
	Course      string
	ClassCode   *string
	Description *string
	URL         *string
	Deadline    time.Time
	ExternalID  string
	Source      string
}

type newAssignmentInfo struct {
	Title    string    `json:"title"`
	Course   string    `json:"course"`
	Deadline time.Time `json:"deadline"`
	Source   string    `json:"source"`
}

type moodleCalendarEvent struct {
	UID         string
	Title       string
	Course      string
	ClassCode   *string
	Description string
	URL         string
	Start       time.Time
	End         time.Time
}

// ============================================================================
// Google Classroom Types
// ============================================================================

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
	Description   string           `json:"description"`
	CourseID      string           `json:"courseId"`
	DueDate       *googleDate      `json:"dueDate"`
	DueTime       *googleTimeOfDay `json:"dueTime"`
	CourseWorkURL string           `json:"alternateLink"`
}

type googleCourseWorkResponse struct {
	CourseWork    []googleCourseWork `json:"courseWork"`
	NextPageToken string             `json:"nextPageToken"`
}

// ============================================================================
// Auth Types
// ============================================================================

type loginSyncResult struct {
	TotalEvents    int                  `json:"total_events"`
	NewAssignments []loginNewAssignment `json:"new_assignments"`
}

type loginNewAssignment struct {
	Title    string    `json:"title"`
	Course   string    `json:"course"`
	Deadline time.Time `json:"deadline"`
	Source   string    `json:"source"`
}
