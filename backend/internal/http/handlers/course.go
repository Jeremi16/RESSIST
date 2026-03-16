package handlers

import (
	"net/http"

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
	var courses []models.Course
	if err := h.db.Order("name ASC").Find(&courses).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch courses"})
		return
	}

	response := make([]CourseResponse, len(courses))
	for i, course := range courses {
		response[i] = CourseResponse{
			ID:   course.ID,
			Name: course.Name,
		}
	}

	c.JSON(http.StatusOK, gin.H{"courses": response})
}
