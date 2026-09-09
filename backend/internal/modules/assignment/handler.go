package assignment

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jeremi16/ressist-api/internal/models"
	"github.com/jeremi16/ressist-api/internal/pkg/classcode"
	"github.com/jeremi16/ressist-api/internal/shared/middleware"
	"gorm.io/gorm"
)

// Handler handles assignment HTTP requests.
type Handler struct {
	db *gorm.DB
}

// NewHandler creates a new assignment Handler.
func NewHandler(db *gorm.DB) *Handler {
	return &Handler{db: db}
}

// CompleteAssignmentRequest is the payload for marking assignment complete.
type CompleteAssignmentRequest struct {
	AssignmentID string `json:"assignment_id"`
}

// CompleteAssignmentResponse is the response after completing assignment.
type CompleteAssignmentResponse struct {
	Success     bool      `json:"success"`
	Message     string    `json:"message"`
	CompletedAt time.Time `json:"completed_at"`
}

// CompleteAssignment marks an assignment as completed.
func (h *Handler) CompleteAssignment(c *gin.Context) {
	userID, ok := middleware.AuthenticatedUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req CompleteAssignmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if req.AssignmentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "assignment_id is required"})
		return
	}

	// Classroom tasks are read-only (full source of truth from Classroom)
	var existingSource struct {
		Source string `gorm:"column:source"`
		Status string `gorm:"column:status"`
	}
	if err := h.db.Table("events").Select("source, status").Where("id = ? AND user_id = ?", req.AssignmentID, userID).Scan(&existingSource).Error; err == nil {
		if existingSource.Source == "google_classroom" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Classroom tasks are read-only, status follows Classroom"})
			return
		}
		if existingSource.Status == "missed" {
			// Allow completing a missed task, but mark as completed
		}
	}

	now := time.Now()
	result := h.db.Exec(`
		UPDATE events 
		SET completed = true, completed_at = ?, status = 'completed', status_updated_at = ?, updated_at = ?
		WHERE id = ? AND user_id = ?
	`, now, now, now, req.AssignmentID, userID)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update assignment"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Assignment not found"})
		return
	}

	c.JSON(http.StatusOK, CompleteAssignmentResponse{
		Success:     true,
		Message:     "Assignment marked as completed",
		CompletedAt: now,
	})
}

// GetAssignments returns filtered assignments for the authenticated user.
func (h *Handler) GetAssignments(c *gin.Context) {
	userID, ok := middleware.AuthenticatedUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	type declType struct {
		ID              string     `json:"id"`
		Title           string     `json:"title"`
		FullTitle       string     `json:"full_title"`
		Course          *string    `json:"course"`
		OriginalCourse  *string    `json:"original_course"`
		ClassCode       *string    `json:"class_code"`
		Deadline        time.Time  `json:"deadline"`
		Completed       bool       `json:"completed"`
		CompletedAt     *time.Time `json:"completed_at"`
		Status          string     `json:"status"`
		StatusUpdatedAt *time.Time `json:"status_updated_at"`
		Source          string     `json:"source"`
		Description     *string    `json:"description"`
		URL             *string    `json:"url"`
	}
	var assignments []declType

	var user struct {
		ClassCode            *string `gorm:"column:class_code"`
		MutedCourses         string  `gorm:"column:muted_courses"`
		CourseKeywordFilters string  `gorm:"column:course_keyword_filters"`
		CourseClassFilters   string  `gorm:"column:course_class_filters"`
	}
	if err := h.db.Table("users").Select("class_code, muted_courses, course_keyword_filters, course_class_filters").Where("id = ?", userID).Scan(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user"})
		return
	}

	if err := h.db.Raw(`
		SELECT id, title, title as full_title, course, course as original_course, 
		       class_code, deadline, COALESCE(completed, false) as completed, 
		       completed_at, COALESCE(status,'pending') as status, status_updated_at, source, description, url
		FROM events
		WHERE user_id = ?
		ORDER BY deadline ASC
	`, userID).Scan(&assignments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch assignments"})
		return
	}

	// Reuse central Filter logic via temporary models.Event slice to avoid duplication
	events := make([]models.Event, 0, len(assignments))
	for _, a := range assignments {
		events = append(events, models.Event{
			Title:     a.Title,
			Course:    a.Course,
			ClassCode: a.ClassCode,
		})
	}
	filteredEvents := classcode.FilterWithCourseClass(events, user.MutedCourses, user.ClassCode, user.CourseKeywordFilters, user.CourseClassFilters)
	// Map back to original assignments via ordered walk (Filter preserves order)
	var filtered []declType
	fi := 0
	for idx, ev := range events {
		if fi >= len(filteredEvents) {
			break
		}
		fe := filteredEvents[fi]
		courseEv := ""
		if ev.Course != nil {
			courseEv = *ev.Course
		}
		courseFe := ""
		if fe.Course != nil {
			courseFe = *fe.Course
		}
		codeEv := ""
		if ev.ClassCode != nil {
			codeEv = *ev.ClassCode
		}
		codeFe := ""
		if fe.ClassCode != nil {
			codeFe = *fe.ClassCode
		}
		if ev.Title == fe.Title && courseEv == courseFe && codeEv == codeFe {
			filtered = append(filtered, assignments[idx])
			fi++
		}
	}
	assignments = filtered

	c.JSON(http.StatusOK, assignments)
}
