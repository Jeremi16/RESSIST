package router

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jeremi16/resisst-api/internal/config"
	"github.com/jeremi16/resisst-api/internal/modules/assignment"
	"github.com/jeremi16/resisst-api/internal/modules/auth"
	"github.com/jeremi16/resisst-api/internal/modules/calendar"
	"github.com/jeremi16/resisst-api/internal/modules/course"
	"github.com/jeremi16/resisst-api/internal/modules/telegram"
	"github.com/jeremi16/resisst-api/internal/modules/user"
	"github.com/jeremi16/resisst-api/internal/shared/docs"
	"github.com/jeremi16/resisst-api/internal/shared/middleware"
	"gorm.io/gorm"
)

func New(
	cfg *config.Config,
	db *gorm.DB,
	authModule *auth.Module,
	userModule *user.Module,
	calendarModule *calendar.Module,
	courseModule *course.Module,
	telegramModule *telegram.Module,
	assignmentModule *assignment.Module,
) *gin.Engine {
	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.New()
	r.Use(middleware.RequestID())
	r.Use(middleware.TimeoutContext(cfg.RequestTimeoutSeconds))
	r.Use(middleware.JSONAccessLogger())
	r.Use(gin.Recovery())
	r.Use(middleware.HTTPMetrics())
	r.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.AllowedOrigins,
		AllowMethods:     []string{http.MethodGet, http.MethodPost, http.MethodOptions},
		AllowHeaders:     []string{"Authorization", "Content-Type", "X-Request-ID"},
		ExposeHeaders:    []string{"X-Request-ID"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	r.GET("/livez", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok"}) })
	r.GET("/healthz", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok"}) })
	r.GET("/readyz", func(c *gin.Context) {
		sqlDB, err := db.DB()
		if err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "not_ready", "error": "db_unavailable"})
			return
		}
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()
		if err := sqlDB.PingContext(ctx); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "not_ready", "error": "db_ping_failed"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ready"})
	})
	r.GET("/metrics", middleware.PrometheusHandler())
	r.GET("/openapi.json", func(c *gin.Context) {
		c.Data(http.StatusOK, "application/json; charset=utf-8", docs.OpenAPI)
	})

	authRateLimit := middleware.AuthRateLimit(cfg.AuthRateLimitPerMinute, cfg.AuthRateLimitBurst)
	tokenParser := authModule.TokenService

	// Legacy auth group
	legacyAuthGroup := r.Group("/auth")
	registerAuthRoutes(legacyAuthGroup, authModule.Handler, tokenParser, authRateLimit)

	v1 := r.Group("/v1")
	v1.GET("/openapi.json", func(c *gin.Context) {
		c.Data(http.StatusOK, "application/json; charset=utf-8", docs.OpenAPI)
	})
	v1AuthGroup := v1.Group("/auth")
	registerAuthRoutes(v1AuthGroup, authModule.Handler, tokenParser, authRateLimit)

	// User
	userGroup := v1.Group("/user")
	userGroup.Use(middleware.AccessToken(tokenParser))
	userGroup.GET("", userModule.Handler.GetCurrentUser)
	userGroup.PUT("", userModule.Handler.UpdateCurrentUser)
	userGroup.POST("/google/disconnect", userModule.Handler.DisconnectGoogleClassroom)
	userGroup.GET("/course-aliases", userModule.Handler.GetCourseAliases)
	userGroup.POST("/course-aliases", userModule.Handler.AddCourseAlias)
	userGroup.DELETE("/course-aliases", userModule.Handler.DeleteCourseAlias)
	userGroup.POST("/telegram/verify-code", userModule.Handler.GenerateTelegramVerifyCode)

	// Calendar
	calendarGroup := v1.Group("/calendar")
	calendarGroup.Use(middleware.AccessToken(tokenParser))
	calendarGroup.GET("/preview", calendarModule.Handler.GetPreview)
	calendarGroup.POST("/test", calendarModule.Handler.TestPreview)

	// Courses
	courseGroup := v1.Group("/courses")
	courseGroup.Use(middleware.AccessToken(tokenParser))
	courseGroup.GET("", courseModule.Handler.GetAllCourses)

	// Telegram
	telegramGroup := v1.Group("/telegram")
	telegramGroup.Use(middleware.AccessToken(tokenParser))
	telegramGroup.POST("/test-reminder", telegramModule.Handler.SendTestReminder)
	telegramGroup.POST("/test-briefing", telegramModule.Handler.SendMorningBriefing)

	// Assignments
	assignmentGroup := v1.Group("/assignments")
	assignmentGroup.Use(middleware.AccessToken(tokenParser))
	assignmentGroup.GET("", assignmentModule.Handler.GetAssignments)
	assignmentGroup.POST("/complete", assignmentModule.Handler.CompleteAssignment)

	return r
}

func registerAuthRoutes(group *gin.RouterGroup, h *auth.Handler, parser middleware.TokenParser, authRateLimit gin.HandlerFunc) {
	group.GET("/google/login", authRateLimit, h.GoogleLogin)
	group.GET("/google/callback", authRateLimit, h.GoogleCallback)
	group.POST("/refresh", authRateLimit, h.Refresh)
	group.POST("/logout", authRateLimit, h.Logout)
	group.GET("/me", middleware.AccessToken(parser), h.Me)
	group.POST("/sync", middleware.AccessToken(parser), h.SyncAfterLogin)
}
