package botservice

import "github.com/gin-gonic/gin"

// RegisterRoutes mounts service-to-service endpoints.
// The group must already use middleware.RequireBotService.
func RegisterRoutes(rg *gin.RouterGroup, h *Handler) {
	rg.GET("/users/by-telegram/:chatID", h.GetUserByTelegram)
	rg.GET("/users/:id", h.GetUser)
	rg.POST("/telegram/verify", h.VerifyTelegram)
	rg.GET("/scheduler/due", h.GetDueAssignments)
	rg.POST("/scheduler/mark-sent", h.MarkReminderSent)
	rg.GET("/scheduler/briefing-candidates", h.GetBriefingCandidates)
}
