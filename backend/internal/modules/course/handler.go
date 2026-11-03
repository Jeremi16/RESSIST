package course

import (
	"net/http"
	"sort"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jeremi16/ressist-api/internal/models"
	"github.com/jeremi16/ressist-api/internal/pkg/classcode"
	"github.com/jeremi16/ressist-api/internal/pkg/text"
	"github.com/jeremi16/ressist-api/internal/shared/middleware"
	"gorm.io/gorm"
)

// Handler handles course HTTP requests.
type Handler struct {
	db *gorm.DB
}

// NewHandler creates a new course Handler.
func NewHandler(db *gorm.DB) *Handler {
	return &Handler{db: db}
}

// CourseResponse represents a single course in API response.
type CourseResponse struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// GetAllCourses returns unique courses for the authenticated user.
// Mirrors logic from internal/http/handlers/course.go but uses
// shared middleware and pkg helpers.
func (h *Handler) GetAllCourses(c *gin.Context) {
	userID, ok := middleware.AuthenticatedUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var user models.User
	if err := h.db.WithContext(c.Request.Context()).Where("id = ?", userID).First(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user data"})
		return
	}

	// Parse keyword filters via pkg/classcode.
	keywordFilters := classcode.ParseKeywordFilters(user.CourseKeywordFilters)
	normKeywordFilters := make(map[string][]string, len(keywordFilters))
	for course, keywords := range keywordFilters {
		normKeywordFilters[text.Normalize(course)] = keywords
	}

	// Only the three columns this handler reads. Selecting whole Event rows
	// pulled every column of the model (description, url, timestamps, ...)
	// for every row the user had, just to derive a set of course names.
	type courseRow struct {
		Title  string  `gorm:"column:title"`
		Course *string `gorm:"column:course"`
	}
	var rows []courseRow
	if err := h.db.WithContext(c.Request.Context()).
		Model(&models.Event{}).
		Select("title", "course").
		Where("user_id = ? AND course IS NOT NULL AND course <> ''", userID).
		Find(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch events"})
		return
	}

	// Filter events by keyword filters and collect unique courses.
	courseMap := make(map[string]bool)
	for _, row := range rows {
		if row.Course == nil || *row.Course == "" {
			continue
		}
		courseName := *row.Course
		normCourse := text.Normalize(courseName)

		if keywords, hasFilter := normKeywordFilters[normCourse]; hasFilter && len(keywords) > 0 {
			titleLower := strings.ToLower(row.Title)
			matched := false
			for _, keyword := range keywords {
				if strings.Contains(titleLower, strings.ToLower(keyword)) {
					matched = true
					break
				}
			}
			if matched {
				courseMap[courseName] = true
			}
		} else {
			courseMap[courseName] = true
		}
	}

	// Convert map to sorted slice. sort.Strings is O(n log n); the previous
	// hand-written exchange sort was O(n^2).
	courses := make([]string, 0, len(courseMap))
	for courseName := range courseMap {
		courses = append(courses, courseName)
	}
	sort.Strings(courses)

	response := make([]CourseResponse, len(courses))
	for i, courseName := range courses {
		response[i] = CourseResponse{
			ID:   courseName,
			Name: courseName,
		}
	}

	c.JSON(http.StatusOK, gin.H{"courses": response})
}
