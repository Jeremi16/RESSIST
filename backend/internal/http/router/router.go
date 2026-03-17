package router

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jeremi16/resisst-api/internal/auth"
	"github.com/jeremi16/resisst-api/internal/bot"
	"github.com/jeremi16/resisst-api/internal/config"
	"github.com/jeremi16/resisst-api/internal/http/docs"
	"github.com/jeremi16/resisst-api/internal/http/handlers"
	"github.com/jeremi16/resisst-api/internal/http/middleware"
	"gorm.io/gorm"
)

func New(
	cfg *config.Config,
	authHandler *handlers.AuthHandler,
	userHandler *handlers.UserHandler,
	calendarHandler *handlers.CalendarHandler,
	courseHandler *handlers.CourseHandler,
	telegramHandler *handlers.TelegramHandler,
	assignmentHandler *handlers.AssignmentHandler,
	authSvc *auth.Service,
	db *gorm.DB,
	telegramBot *bot.Bot,
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

	r.GET("/livez", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
	r.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
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

	legacyAuthGroup := r.Group("/auth")
	registerAuthRoutes(legacyAuthGroup, authHandler, authSvc, authRateLimit)

	v1 := r.Group("/v1")
	v1.GET("/openapi.json", func(c *gin.Context) {
		c.Data(http.StatusOK, "application/json; charset=utf-8", docs.OpenAPI)
	})
	v1AuthGroup := v1.Group("/auth")
	registerAuthRoutes(v1AuthGroup, authHandler, authSvc, authRateLimit)

	userGroup := v1.Group("/user")
	userGroup.Use(middleware.AccessToken(authSvc))
	userGroup.GET("", userHandler.GetCurrentUser)
	userGroup.PUT("", userHandler.UpdateCurrentUser)
	userGroup.POST("/google/disconnect", userHandler.DisconnectGoogleClassroom)
	userGroup.GET("/course-aliases", userHandler.GetCourseAliases)
	userGroup.POST("/course-aliases", userHandler.AddCourseAlias)
	userGroup.DELETE("/course-aliases", userHandler.DeleteCourseAlias)
	userGroup.POST("/telegram/verify-code", userHandler.GenerateTelegramVerifyCode)

	calendarGroup := v1.Group("/calendar")
	calendarGroup.Use(middleware.AccessToken(authSvc))
	calendarGroup.GET("/preview", calendarHandler.GetPreview)
	calendarGroup.POST("/test", calendarHandler.TestPreview)

	courseGroup := v1.Group("/courses")
	courseGroup.Use(middleware.AccessToken(authSvc))
	courseGroup.GET("", courseHandler.GetAllCourses)

	if telegramBot != nil {
		telegramGroup := v1.Group("/telegram")
		telegramGroup.Use(middleware.AccessToken(authSvc))
		telegramGroup.POST("/test-reminder", telegramHandler.SendTestReminder)
		telegramGroup.POST("/test-briefing", telegramHandler.SendMorningBriefing)
	}

	assignmentGroup := v1.Group("/assignments")
	assignmentGroup.Use(middleware.AccessToken(authSvc))
	assignmentGroup.GET("", assignmentHandler.GetAssignments)
	assignmentGroup.POST("/complete", assignmentHandler.CompleteAssignment)

		return r
}

func registerAuthRoutes(group *gin.RouterGroup, authHandler *handlers.AuthHandler, authSvc *auth.Service, authRateLimit gin.HandlerFunc) {
	group.GET("/google/login", authRateLimit, authHandler.GoogleLogin)
	group.GET("/google/callback", authRateLimit, authHandler.GoogleCallback)
	group.POST("/refresh", authRateLimit, authHandler.Refresh)
	group.POST("/logout", authRateLimit, authHandler.Logout)
	group.GET("/me", middleware.AccessToken(authSvc), authHandler.Me)
	group.POST("/sync", middleware.AccessToken(authSvc), authHandler.SyncAfterLogin)
}
