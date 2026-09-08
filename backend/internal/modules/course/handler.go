package course

import (
	"net/http"
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
	if err := h.db.Where("id = ?", userID).First(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user data"})
		return
	}

	// Parse keyword filters via pkg/classcode.
	keywordFilters := classcode.ParseKeywordFilters(user.CourseKeywordFilters)
	normKeywordFilters := make(map[string][]string, len(keywordFilters))
	for course, keywords := range keywordFilters {
		normKeywordFilters[text.Normalize(course)] = keywords
	}

	// Get all events for this user.
	var events []models.Event
	if err := h.db.Where("user_id = ?", userID).Find(&events).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch events"})
		return
	}

	// Filter events by keyword filters and collect unique courses.
	courseMap := make(map[string]bool)
	for _, event := range events {
		if event.Course == nil || *event.Course == "" {
			continue
		}
		courseName := *event.Course
		normCourse := text.Normalize(courseName)

		if keywords, hasFilter := normKeywordFilters[normCourse]; hasFilter && len(keywords) > 0 {
			titleLower := strings.ToLower(event.Title)
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

	// Convert map to sorted slice.
	courses := make([]string, 0, len(courseMap))
	for courseName := range courseMap {
		courses = append(courses, courseName)
	}
	for i := 0; i < len(courses); i++ {
		for j := i + 1; j < len(courses); j++ {
			if courses[i] > courses[j] {
				courses[i], courses[j] = courses[j], courses[i]
			}
		}
	}

	response := make([]CourseResponse, len(courses))
	for i, courseName := range courses {
		response[i] = CourseResponse{
			ID:   courseName,
			Name: courseName,
		}
	}

	c.JSON(http.StatusOK, gin.H{"courses": response})
}
