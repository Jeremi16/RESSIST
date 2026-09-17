package auth

import (
	"github.com/gin-gonic/gin"
	"github.com/jeremi16/ressist-api/internal/shared/middleware"
)

// RegisterRoutes registers auth routes onto the given router group.
// rateLimit may be nil (no rate limiting). parser is used for protected routes.
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup, parser middleware.TokenParser, rateLimit gin.HandlerFunc) {
	h.registerAuthRoutes(rg, parser, rateLimit)
}

func (h *Handler) registerAuthRoutes(rg *gin.RouterGroup, parser middleware.TokenParser, rateLimit gin.HandlerFunc) {
	// Public / rate-limited routes
	if rateLimit != nil {
		rg.GET("/google/login", rateLimit, h.GoogleLogin)
		rg.GET("/google/callback", rateLimit, h.GoogleCallback)
		rg.POST("/google/native", rateLimit, h.GoogleNative)
		rg.POST("/refresh", rateLimit, h.Refresh)
		rg.POST("/logout", rateLimit, h.Logout)
	} else {
		rg.GET("/google/login", h.GoogleLogin)
		rg.GET("/google/callback", h.GoogleCallback)
		rg.POST("/google/native", h.GoogleNative)
		rg.POST("/refresh", h.Refresh)
		rg.POST("/logout", h.Logout)
	}

	// Protected routes require access token
	protected := rg.Group("")
	if parser != nil {
		protected.Use(middleware.AccessToken(parser))
	}
	protected.GET("/me", h.Me)
	protected.POST("/sync", h.SyncAfterLogin)
}

// RegisterAuthRoutes is an exported helper that can be used externally to register
// auth routes without a Handler receiver (e.g., legacy router).
func RegisterAuthRoutes(rg *gin.RouterGroup, h *Handler, parser middleware.TokenParser, rateLimit gin.HandlerFunc) {
	h.registerAuthRoutes(rg, parser, rateLimit)
}
