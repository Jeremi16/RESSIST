package telegram

import (
	"github.com/gin-gonic/gin"
	"github.com/jeremi16/ressist-api/internal/shared/middleware"
)

// RegisterRoutes registers telegram routes onto the given router group.
// Deprecated: canonical routes live in router.go (/v1/telegram).
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup, parser middleware.TokenParser) {
	h.registerTelegramRoutes(rg, parser)
}

func (h *Handler) registerTelegramRoutes(rg *gin.RouterGroup, parser middleware.TokenParser) {
	protected := rg.Group("")
	if parser != nil {
		protected.Use(middleware.AccessToken(parser))
	}
	protected.POST("/test-reminder", h.SendTestReminder)
	protected.POST("/test-briefing", h.SendMorningBriefing)
}

// RegisterTelegramRoutes is an exported helper for external registration.
func RegisterTelegramRoutes(rg *gin.RouterGroup, h *Handler, parser middleware.TokenParser) {
	h.registerTelegramRoutes(rg, parser)
}
