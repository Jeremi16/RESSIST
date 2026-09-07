package user

import (
	"github.com/gin-gonic/gin"
	"github.com/jeremi16/resisst-api/internal/shared/middleware"
)

// RegisterRoutes registers user routes onto the given router group.
// Deprecated: canonical routes live in router.go (/v1/user, GET supports API key).
// This helper stays JWT-only for isolated use. The group is expected to already
// have authentication middleware applied; if parser is provided, it will be applied here as well.
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup, parser ...middleware.TokenParser) {
	if len(parser) > 0 && parser[0] != nil {
		rg.Use(middleware.AccessToken(parser[0]))
	}
	h.registerUserRoutes(rg)
}

func (h *Handler) registerUserRoutes(rg *gin.RouterGroup) {
	rg.GET("", h.GetCurrentUser)
	rg.PUT("", h.UpdateCurrentUser)
	rg.POST("/google/disconnect", h.DisconnectGoogleClassroom)
	rg.GET("/course-aliases", h.GetCourseAliases)
	rg.POST("/course-aliases", h.AddCourseAlias)
	rg.DELETE("/course-aliases", h.DeleteCourseAlias)
	rg.POST("/telegram/verify-code", h.GenerateTelegramVerifyCode)
}

// RegisterUserRoutes is an exported helper for external registration.
func RegisterUserRoutes(rg *gin.RouterGroup, h *Handler, parser middleware.TokenParser) {
	if parser != nil {
		rg.Use(middleware.AccessToken(parser))
	}
	h.registerUserRoutes(rg)
}
