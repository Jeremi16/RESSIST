package router

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jeremi16/ressist-api/internal/config"
	"github.com/jeremi16/ressist-api/internal/modules/apikey"
	"github.com/jeremi16/ressist-api/internal/modules/assignment"
	"github.com/jeremi16/ressist-api/internal/modules/auth"
	"github.com/jeremi16/ressist-api/internal/modules/calendar"
	"github.com/jeremi16/ressist-api/internal/modules/course"
	"github.com/jeremi16/ressist-api/internal/modules/botservice"
	"github.com/jeremi16/ressist-api/internal/modules/telegram"
	"github.com/jeremi16/ressist-api/internal/modules/user"
	"github.com/jeremi16/ressist-api/internal/shared/docs"
	"github.com/jeremi16/ressist-api/internal/shared/middleware"
	"gorm.io/gorm"
)

// maxRequestBodyBytes caps inbound request bodies. No endpoint in this API
// accepts a large payload, so 1 MiB is generous. Bodies larger than this
// produce a bind error and a 400 rather than unbounded allocation.
const maxRequestBodyBytes = 1 << 20 // 1 MiB

func maxBodyBytes(limit int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Body != nil {
			c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, limit)
		}
		c.Next()
	}
}

// noStoreForCredentialedResponses prevents shared caches from storing
// per-user responses. Vary on the credential headers so that even a cache
// which ignores no-store keys its entries by principal rather than by URL.
func noStoreForCredentialedResponses() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Cache-Control", "no-store")
		c.Header("Pragma", "no-cache")
		c.Header("Vary", "X-API-Key, Authorization")
		c.Next()
	}
}

func New(
	cfg *config.Config,
	db *gorm.DB,
	authModule *auth.Module,
	userModule *user.Module,
	calendarModule *calendar.Module,
	courseModule *course.Module,
	internalModule *botservice.Module,
	assignmentModule *assignment.Module,
	apiKeyModule *apikey.Module,
	telegramSender *telegram.Module,
) *gin.Engine {
	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.New()
	// TRUSTED_PROXIES controls whether X-Forwarded-For / X-Real-IP are
	// believed. Gin's default trusts every proxy, which makes ClientIP() equal
	// to whatever the client sent — that defeats every per-IP limiter below.
	// Empty config means "trust nobody" so ClientIP() is the TCP peer.
	if len(cfg.TrustedProxies) == 0 {
		_ = r.SetTrustedProxies(nil)
	} else if err := r.SetTrustedProxies(cfg.TrustedProxies); err != nil {
		// config.Load already validates these CIDRs; reaching here means the
		// two disagree, which should stop the process rather than silently
		// running with a trust model nobody chose.
		panic(fmt.Sprintf("invalid TRUSTED_PROXIES: %v", err))
	}
	r.Use(middleware.RequestID())
	// Cap request bodies before anything parses them. Without this every
	// ShouldBindJSON reads an unbounded body into memory.
	r.Use(maxBodyBytes(maxRequestBodyBytes))
	// Responses carry per-user secrets (Moodle calendar URL with its
	// authtoken, telegram chat id, phone number) and may be authenticated by
	// X-API-Key, which RFC 9111 does not treat as a caching blocker the way it
	// treats Authorization. Mark them uncacheable and vary on the credential.
	r.Use(noStoreForCredentialedResponses())
	r.Use(middleware.TimeoutContext(cfg.RequestTimeoutSeconds))
	r.Use(middleware.JSONAccessLogger())
	r.Use(gin.Recovery())
	r.Use(middleware.HTTPMetrics())
	// Custom-scheme origins (e.g. native WebView) cannot go into
	// AllowOrigins (gin-contrib/cors panics) — match them via AllowOriginFunc.
	customOriginSet := make(map[string]struct{}, len(cfg.AllowedCustomOrigins))
	for _, o := range cfg.AllowedCustomOrigins {
		customOriginSet[o] = struct{}{}
	}
	r.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.AllowedOrigins,
		AllowOriginFunc: func(origin string) bool {
			_, ok := customOriginSet[origin]
			return ok
		},
		AllowMethods:     []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodOptions},
		AllowHeaders:     []string{"Authorization", "Content-Type", "X-Request-ID", "X-API-Key", "X-Refresh-Token"},
		ExposeHeaders:    []string{"X-Request-ID"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))
	r.Use(middleware.Maintenance())

	r.GET("/livez", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok"}) })
	r.GET("/healthz", func(c *gin.Context) {
		if middleware.MaintenanceActive() {
			c.JSON(http.StatusOK, gin.H{"status": "maintenance", "message": middleware.MaintenanceMessage()})
			return
		}
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
	// Cheap per-IP gate that runs before any credential is parsed, so an
	// unauthenticated flood cannot force a token parse + DB lookup per request.
	preAuthRateLimit := middleware.IPRateLimit(cfg.PreAuthRateLimitPerMinute, cfg.PreAuthRateLimitBurst)
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

	// API Keys management (JWT only — create/list/revoke via website)
	if apiKeyModule != nil {
		apiKeyGroup := v1.Group("/api-keys")
		apikey.RegisterRoutes(apiKeyGroup, apiKeyModule.Handler, tokenParser)
	}

	// External read API — supports X-API-Key OR JWT (for programmatic access without website)
	apiKeyValidator := apiKeyModule.Service
	apiKeyRateLimit := middleware.ApiKeyRateLimit(cfg.ApiKeyRateLimitPerMinute, cfg.ApiKeyRateLimitBurst)

	// User — GET allows API key, mutations JWT only
	userGroup := v1.Group("/user")
	userGroup.GET("", preAuthRateLimit, middleware.APIKeyOrJWT(tokenParser, apiKeyValidator), apiKeyRateLimit, userModule.Handler.GetCurrentUser)
	userGroup.PUT("", middleware.AccessToken(tokenParser), userModule.Handler.UpdateCurrentUser)
	userGroup.POST("/google/disconnect", middleware.AccessToken(tokenParser), userModule.Handler.DisconnectGoogleClassroom)
	userGroup.GET("/course-aliases", middleware.AccessToken(tokenParser), userModule.Handler.GetCourseAliases)
	userGroup.POST("/course-aliases", middleware.AccessToken(tokenParser), userModule.Handler.AddCourseAlias)
	userGroup.DELETE("/course-aliases", middleware.AccessToken(tokenParser), userModule.Handler.DeleteCourseAlias)
	userGroup.POST("/telegram/verify-code", middleware.AccessToken(tokenParser), userModule.Handler.GenerateTelegramVerifyCode)

	// Calendar
	calendarGroup := v1.Group("/calendar")
	calendarGroup.Use(preAuthRateLimit, middleware.APIKeyOrJWT(tokenParser, apiKeyValidator), apiKeyRateLimit)
	calendarGroup.GET("/preview", calendarModule.Handler.GetPreview)
	calendarGroup.GET("/raw", calendarModule.Handler.GetRaw)
	calendarGroup.POST("/test", calendarModule.Handler.TestPreview)

	// Courses
	courseGroup := v1.Group("/courses")
	courseGroup.Use(preAuthRateLimit, middleware.APIKeyOrJWT(tokenParser, apiKeyValidator), apiKeyRateLimit)
	courseGroup.GET("", courseModule.Handler.GetAllCourses)

	// Service-to-service endpoints for standalone ressist-bot (100% via API).
	// Guarded by X-Bot-Token. No JWT needed. Bot impersonates users via
	// X-Act-As-User on /v1/* below.
	if internalModule != nil {
		internalGroup := r.Group("/internal")
		internalGroup.Use(middleware.RequireBotService(cfg.BotServiceToken))
		botservice.RegisterRoutes(internalGroup, internalModule.Handler)
	}

	// Telegram test endpoints (sender-only, JWT). Used by the dashboard
	// "test notification" buttons. Sending via Bot API is safe from N
	// processes; only getUpdates polling (ressist-bot, replicas=1) is exclusive.
	if telegramSender != nil {
		telegramGroup := v1.Group("/telegram")
		telegramGroup.Use(
			middleware.AccessToken(tokenParser),
			// These buttons spend a shared operator quota (one bot token for
			// every user), so they need their own per-principal budget.
			middleware.PrincipalRateLimit(cfg.TelegramTestRateLimitPerMinute, cfg.TelegramTestRateLimitBurst),
		)
		telegramGroup.POST("/test-reminder", telegramSender.Handler.SendTestReminder)
		telegramGroup.POST("/test-briefing", telegramSender.Handler.SendMorningBriefing)
	}

	// Assignments — GET via API key / JWT / bot service, complete via JWT / bot service
	assignmentGroup := v1.Group("/assignments")
	assignmentGroup.GET("", preAuthRateLimit, middleware.BotOrAPIKeyOrJWT(tokenParser, apiKeyValidator, cfg.BotServiceToken), apiKeyRateLimit, assignmentModule.Handler.GetAssignments)
	assignmentGroup.POST("/complete", middleware.BotOrAccessToken(tokenParser, cfg.BotServiceToken), assignmentModule.Handler.CompleteAssignment)

	// Cheap terminal 404. Keeping this explicit means unmatched requests do
	// not fall through to a full handler chain, and the metrics middleware
	// labels them "unmatched" instead of by raw path.
	r.NoRoute(func(c *gin.Context) {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found", "request_id": middleware.GetRequestID(c)})
	})

	return r
}

func registerAuthRoutes(group *gin.RouterGroup, h *auth.Handler, parser middleware.TokenParser, authRateLimit gin.HandlerFunc) {
	group.GET("/google/login", authRateLimit, h.GoogleLogin)
	group.GET("/google/callback", authRateLimit, h.GoogleCallback)
	group.POST("/google/native", authRateLimit, h.GoogleNative)
	group.POST("/refresh", authRateLimit, h.Refresh)
	group.POST("/logout", authRateLimit, h.Logout)
	group.GET("/me", middleware.AccessToken(parser), h.Me)
	group.POST("/sync", middleware.AccessToken(parser), h.SyncAfterLogin)
}
