package calendar

import "time"

// ============================================================================
// Calendar Types (copied from handlers/types.go, calendar-related only)
// ============================================================================

type calendarEventPreview struct {
	ID              string     `json:"id"`
	Title           string     `json:"title"`
	FullTitle       string     `json:"full_title"`
	Course          string     `json:"course"`
	OriginalCourse  string     `json:"original_course"`
	CourseID        *string    `json:"course_id,omitempty"`
	ClassCode       *string    `json:"class_code,omitempty"`
	Description     *string    `json:"description,omitempty"`
	URL             *string    `json:"url,omitempty"`
	Deadline        string     `json:"deadline"`
	TimeRemaining   string     `json:"timeRemaining"`
	DeadlineDate    time.Time  `json:"deadlineDate"`
	Source          string     `json:"source"`
	Completed       bool       `json:"completed"`
	CompletedAt     *time.Time `json:"completed_at,omitempty"`
	Status          string     `json:"status"`
	StatusUpdatedAt *time.Time `json:"status_updated_at,omitempty"`
}

type calendarSourceInfo struct {
	Provider string `json:"provider"`
	Count    int    `json:"count"`
	Success  bool   `json:"success"`
	// Observability for Classroom partial/skip (omitempty keeps old clients working).
	Error             string   `json:"error,omitempty"`
	FailedCourses     []string `json:"failed_courses,omitempty"`
	Partial           bool     `json:"partial,omitempty"`
	TotalCourseWork   int      `json:"total_course_work,omitempty"`
	SkippedNoDeadline int      `json:"skipped_no_deadline,omitempty"`
	SkippedPast       int      `json:"skipped_past_deadline,omitempty"`
	SkippedFarFuture  int      `json:"skipped_far_future,omitempty"`
}

type calendarTestRequest struct {
	MoodleCalendarURL string `json:"moodle_calendar_url"`
	TestMoodle        bool   `json:"test_moodle"`
	TestGoogle        bool   `json:"test_google"`
}

// Sort options for tasks
const (
	SortDeadlineAsc  = "deadline_asc"
	SortDeadlineDesc = "deadline_desc"
	SortNewest       = "newest"
	SortOldest       = "oldest"
)

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

// Exported aliases for cross-package use
type AssignmentRecord = assignmentRecord
type NewAssignmentInfo = newAssignmentInfo
type MoodleCalendarEvent = moodleCalendarEvent

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

// Exported aliases
type GoogleCourse = googleCourse
type GoogleCoursesResponse = googleCoursesResponse
type GoogleDate = googleDate
type GoogleTimeOfDay = googleTimeOfDay
type GoogleCourseWork = googleCourseWork
type GoogleCourseWorkResponse = googleCourseWorkResponse

// ============================================================================
// Login/Auth minimal types
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
