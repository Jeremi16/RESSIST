package apikey

import (
	"github.com/gin-gonic/gin"
	"github.com/jeremi16/resisst-api/internal/shared/middleware"
)

func RegisterRoutes(group *gin.RouterGroup, h *Handler, parser middleware.TokenParser) {
	group.Use(middleware.AccessToken(parser))
	group.GET("", h.List)
	group.POST("", h.Create)
	group.DELETE("/:id", h.Delete)
}
