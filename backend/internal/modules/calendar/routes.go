package calendar

import (
	"github.com/gin-gonic/gin"
	"github.com/jeremi16/resisst-api/internal/shared/middleware"
)

// RegisterRoutes registers calendar routes onto the given router group.
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup, parser middleware.TokenParser) {
	h.registerCalendarRoutes(rg, parser)
}

func (h *Handler) registerCalendarRoutes(rg *gin.RouterGroup, parser middleware.TokenParser) {
	protected := rg.Group("")
	if parser != nil {
		protected.Use(middleware.AccessToken(parser))
	}
	protected.GET("/preview", h.GetPreview)
	protected.POST("/preview/test", h.TestPreview)
}

// RegisterCalendarRoutes is an exported helper for external registration.
func RegisterCalendarRoutes(rg *gin.RouterGroup, h *Handler, parser middleware.TokenParser) {
	h.registerCalendarRoutes(rg, parser)
}
