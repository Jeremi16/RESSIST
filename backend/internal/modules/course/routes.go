package course

import (
	"github.com/gin-gonic/gin"
	"github.com/jeremi16/resisst-api/internal/shared/middleware"
)

// RegisterRoutes registers course routes onto the given router group.
// Deprecated: canonical routes live in router.go (/v1/courses) with APIKeyOrJWT.
// This helper stays JWT-only for isolated use.
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup, parser middleware.TokenParser) {
	h.registerCourseRoutes(rg, parser)
}

func (h *Handler) registerCourseRoutes(rg *gin.RouterGroup, parser middleware.TokenParser) {
	protected := rg.Group("")
	if parser != nil {
		protected.Use(middleware.AccessToken(parser))
	}
	protected.GET("", h.GetAllCourses)
}

// RegisterCourseRoutes is an exported helper for external registration.
func RegisterCourseRoutes(rg *gin.RouterGroup, h *Handler, parser middleware.TokenParser) {
	h.registerCourseRoutes(rg, parser)
}
