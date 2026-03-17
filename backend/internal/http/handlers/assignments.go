package handlers

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AssignmentHandler struct {
	db *gorm.DB
}

func NewAssignmentHandler(db *gorm.DB) *AssignmentHandler {
	return &AssignmentHandler{db: db}
}

type CompleteAssignmentRequest struct {
	AssignmentID string `json:"assignment_id"`
}

type CompleteAssignmentResponse struct {
	Success     bool      `json:"success"`
	Message     string    `json:"message"`
	CompletedAt time.Time `json:"completed_at"`
}

func (h *AssignmentHandler) CompleteAssignment(c *gin.Context) {
	userID, exists := authenticatedUserID(c)
	if !exists {
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

	// Update event to mark as completed
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

func (h *AssignmentHandler) GetAssignments(c *gin.Context) {
	userID, exists := authenticatedUserID(c)
	if !exists {
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

	// Parse filtering data
	mutedList := parseAvailableClassCodes(user.MutedCourses)
	mutedMap := make(map[string]bool)
	for _, m := range mutedList {
		mutedMap[normalizeText(m)] = true
	}

	var selectedCodes []string
	if user.ClassCode != nil {
		selectedCodes = parseAvailableClassCodes(*user.ClassCode)
	}
	hasCodeFilter := len(selectedCodes) > 0
	codeMap := make(map[string]bool)
	for _, c := range selectedCodes {
		codeMap[normalizeText(c)] = true
	}

	keywordFilters := parseCourseKeywordFilters(user.CourseKeywordFilters)
	normKeywordFilters := make(map[string][]string)
	for course, keywords := range keywordFilters {
		normKeywordFilters[normalizeText(course)] = keywords
	}

	var filtered []declType
	for _, a := range assignments {
		// 1. Muted
		courseName := ""
		if a.Course != nil {
			courseName = *a.Course
		}
		normCourse := normalizeText(courseName)
		if mutedMap[normCourse] {
			continue
		}

		// 2. Class Code
		if hasCodeFilter && a.ClassCode != nil && *a.ClassCode != "" {
			if !codeMap[normalizeText(*a.ClassCode)] {
				continue
			}
		}

		// 3. Keyword Filter
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
