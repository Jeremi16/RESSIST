package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jeremi16/resisst-api/internal/models"
	"gorm.io/gorm"
)

type CourseHandler struct {
	db *gorm.DB
}

func NewCourseHandler(db *gorm.DB) *CourseHandler {
	return &CourseHandler{db: db}
}

type CourseResponse struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

func (h *CourseHandler) GetAllCourses(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var user models.User
	if err := h.db.Where("id = ?", userID).First(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user data"})
		return
	}

	// Parse keyword filters
	keywordFilters := make(map[string][]string)
	if user.CourseKeywordFilters != "" && user.CourseKeywordFilters != "{}" {
		if err := json.Unmarshal([]byte(user.CourseKeywordFilters), &keywordFilters); err != nil {
			keywordFilters = make(map[string][]string)
		}
	}

	// Get all events for this user
	var events []models.Event
	if err := h.db.Where("user_id = ?", userID).Find(&events).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch events"})
		return
	}

	// Filter events by keyword filters and collect unique courses
	courseMap := make(map[string]bool)
	for _, event := range events {
		if event.Course == nil || *event.Course == "" {
			continue
		}

		courseName := *event.Course

		// Check if this course has keyword filters
		if keywords, hasFilter := keywordFilters[courseName]; hasFilter && len(keywords) > 0 {
			// Course has keyword filter - check if event title matches any keyword
			titleLower := strings.ToLower(event.Title)
			matched := false
			for _, keyword := range keywords {
				if strings.Contains(titleLower, strings.ToLower(keyword)) {
					matched = true
					break
				}
			}
			// Only include course if at least one event matches the keywords
			if matched {
				courseMap[courseName] = true
			}
		} else {
			// No keyword filter for this course - include it
			courseMap[courseName] = true
		}
	}

	// Convert map to sorted slice
	courses := make([]string, 0, len(courseMap))
	for courseName := range courseMap {
		courses = append(courses, courseName)
	}

	// Sort alphabetically
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
