package assignment

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jeremi16/resisst-api/internal/pkg/classcode"
	"github.com/jeremi16/resisst-api/internal/pkg/text"
	"github.com/jeremi16/resisst-api/internal/shared/middleware"
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

	now := time.Now()
	result := h.db.Exec(`
		UPDATE events 
		SET completed = true, completed_at = ?, updated_at = ?
		WHERE id = ? AND user_id = ?
	`, now, now, req.AssignmentID, userID)

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
		ID             string     `json:"id"`
		Title          string     `json:"title"`
		FullTitle      string     `json:"full_title"`
		Course         *string    `json:"course"`
		OriginalCourse *string    `json:"original_course"`
		ClassCode      *string    `json:"class_code"`
		Deadline       time.Time  `json:"deadline"`
		Completed      bool       `json:"completed"`
		CompletedAt    *time.Time `json:"completed_at"`
		Source         string     `json:"source"`
		Description    *string    `json:"description"`
		URL            *string    `json:"url"`
	}
	var assignments []declType

	var user struct {
		ClassCode            *string `gorm:"column:class_code"`
		MutedCourses         string  `gorm:"column:muted_courses"`
		CourseKeywordFilters string  `gorm:"column:course_keyword_filters"`
	}
	if err := h.db.Table("users").Select("class_code, muted_courses, course_keyword_filters").Where("id = ?", userID).Scan(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user"})
		return
	}

	if err := h.db.Raw(`
		SELECT id, title, title as full_title, course, course as original_course, 
		       class_code, deadline, COALESCE(completed, false) as completed, 
		       completed_at, source, description, url
		FROM events
		WHERE user_id = ?
		ORDER BY deadline ASC
	`, userID).Scan(&assignments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch assignments"})
		return
	}

	// Parse filtering data using pkg/classcode and pkg/text.
	mutedList := classcode.ParseArray(user.MutedCourses)
	mutedMap := make(map[string]bool)
	for _, m := range mutedList {
		mutedMap[text.Normalize(m)] = true
	}

	var selectedCodes []string
	if user.ClassCode != nil {
		selectedCodes = classcode.ParseArray(*user.ClassCode)
	}
	hasCodeFilter := len(selectedCodes) > 0
	codeMap := make(map[string]bool)
	for _, cc := range selectedCodes {
		codeMap[text.Normalize(cc)] = true
	}

	keywordFilters := classcode.ParseKeywordFilters(user.CourseKeywordFilters)
	normKeywordFilters := make(map[string][]string)
	for course, keywords := range keywordFilters {
		normKeywordFilters[text.Normalize(course)] = keywords
	}

	var filtered []declType
	for _, a := range assignments {
		courseName := ""
		if a.Course != nil {
			courseName = *a.Course
		}
		normCourse := text.Normalize(courseName)
		if mutedMap[normCourse] {
			continue
		}

		if hasCodeFilter && a.ClassCode != nil && *a.ClassCode != "" {
			if !codeMap[text.Normalize(*a.ClassCode)] {
				continue
			}
		}

		if keywords, ok := normKeywordFilters[normCourse]; ok && len(keywords) > 0 {
			found := false
			titleLower := strings.ToLower(a.Title)
			for _, k := range keywords {
				if strings.Contains(titleLower, strings.ToLower(k)) {
					found = true
					break
				}
			}
			if !found {
				continue
			}
		}

		filtered = append(filtered, a)
	}
	assignments = filtered

	c.JSON(http.StatusOK, assignments)
}
