package assignment

import (
	"github.com/gin-gonic/gin"
	"github.com/jeremi16/resisst-api/internal/shared/middleware"
)

// RegisterRoutes registers assignment routes onto the given router group.
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup, parser middleware.TokenParser) {
	h.registerAssignmentRoutes(rg, parser)
}

func (h *Handler) registerAssignmentRoutes(rg *gin.RouterGroup, parser middleware.TokenParser) {
	protected := rg.Group("")
	if parser != nil {
		protected.Use(middleware.AccessToken(parser))
	}
	protected.GET("", h.GetAssignments)
	protected.POST("/complete", h.CompleteAssignment)
}

// RegisterAssignmentRoutes is an exported helper for external registration.
func RegisterAssignmentRoutes(rg *gin.RouterGroup, h *Handler, parser middleware.TokenParser) {
	h.registerAssignmentRoutes(rg, parser)
}
