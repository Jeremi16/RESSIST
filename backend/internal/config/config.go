package config

import (
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Env string

	Port string

	DatabaseURL string
	AutoMigrate bool

	RequestTimeoutSeconds  int
	ShutdownTimeoutSeconds int

	AuthRateLimitPerMinute int
	AuthRateLimitBurst     int

	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string
	AllowedEmailDomain string

	JWTAccessSecret      string
	AccessTokenTTLMinute int
	RefreshTokenTTLHour  int
	// MobileRefreshTokenTTLHour is used for native Android (Capacitor)
	// refresh tokens issued via POST /v1/auth/google/native.
	// Web keeps RefreshTokenTTLHour (72h), mobile defaults to 720h (30 days).
	MobileRefreshTokenTTLHour int
	// RefreshTokenAbsoluteMaxDays caps sliding refresh forever.
	// Even with sliding rotation, a token chain older than this forces re-login.
	RefreshTokenAbsoluteMaxDays int

	FrontendURL         string
	FrontendSuccessPath string
	FrontendErrorPath   string

	CookieDomain string
	CookieSecure bool

	TelegramBotToken    string
	TelegramBotUsername string

	AllowedOrigins []string

	// BotServiceToken authenticates the standalone ressist-bot service.
	// Bot calls /internal/* with X-Bot-Token and /v1/* with
	// X-Bot-Token + X-Act-As-User. Empty = bot integration disabled.
	BotServiceToken string

	ApiKeyPrefix           string
	ApiKeyMaxPerUser       int
	ApiKeyRateLimitPerMinute int
	ApiKeyRateLimitBurst     int

	LMSSyncEnabled    bool
	LMSSyncCron       string
	LMSSyncBatchSize  int
	LMSSyncConcurrency int
	LMSSyncTimeoutSeconds int
}

func Load() (*Config, error) {
	_ = godotenv.Load()
	env := getEnv("ENV", "development")

	cfg := &Config{
		Env: env,

		Port: getEnv("PORT", "8080"),

		DatabaseURL: getEnv("DATABASE_URL", ""),
		AutoMigrate: getEnvAsBool("AUTO_MIGRATE", env != "production"),

		RequestTimeoutSeconds:  getEnvAsInt("REQUEST_TIMEOUT_SECONDS", 15),
		ShutdownTimeoutSeconds: getEnvAsInt("SHUTDOWN_TIMEOUT_SECONDS", 20),

		AuthRateLimitPerMinute: getEnvAsInt("AUTH_RATE_LIMIT_PER_MINUTE", 30),
		AuthRateLimitBurst:     getEnvAsInt("AUTH_RATE_LIMIT_BURST", 10),

		GoogleClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
		GoogleRedirectURL:  getEnv("GOOGLE_REDIRECT_URL", ""),
		AllowedEmailDomain: getEnv("ALLOWED_EMAIL_DOMAIN", "student.itera.ac.id"),

		JWTAccessSecret:      getEnv("JWT_ACCESS_SECRET", ""),
		// Access token 60 menit: BFF me-refresh otomatis, user tidak merasakan.
		// Refresh token 72 jam (3 hari) + sliding: tiap rotasi expiry diperpanjang.
		AccessTokenTTLMinute: getEnvAsInt("ACCESS_TOKEN_TTL_MINUTES", 60),
		RefreshTokenTTLHour:  getEnvAsInt("REFRESH_TOKEN_TTL_HOURS", 72),
		MobileRefreshTokenTTLHour: getEnvAsInt("MOBILE_REFRESH_TOKEN_TTL_HOURS", 720),
		RefreshTokenAbsoluteMaxDays: getEnvAsInt("REFRESH_TOKEN_ABSOLUTE_MAX_DAYS", 90),

		FrontendURL:         getEnv("FRONTEND_URL", "http://localhost:3000"),
		FrontendSuccessPath: getEnv("FRONTEND_SUCCESS_PATH", "/login?auth=success"),
		FrontendErrorPath:   getEnv("FRONTEND_ERROR_PATH", "/login"),

		CookieDomain: getEnv("COOKIE_DOMAIN", ""),
		CookieSecure: getEnvAsBool("COOKIE_SECURE", env == "production"),

		TelegramBotToken:    getEnv("TELEGRAM_BOT_TOKEN", ""),
		TelegramBotUsername: getEnv("TELEGRAM_BOT_USERNAME", "ressist_bot"),

		AllowedOrigins: getEnvAsList("ALLOWED_ORIGINS", "http://localhost:3000"),

		BotServiceToken: getEnv("BOT_SERVICE_TOKEN", ""),

		ApiKeyPrefix:             getEnv("API_KEY_PREFIX", "rsk_"),
		ApiKeyMaxPerUser:         getEnvAsInt("API_KEY_MAX_PER_USER", 5),
		ApiKeyRateLimitPerMinute: getEnvAsInt("API_KEY_RATE_LIMIT_PER_MINUTE", 60),
		ApiKeyRateLimitBurst:     getEnvAsInt("API_KEY_RATE_LIMIT_BURST", 20),

		LMSSyncEnabled:         getEnvAsBool("LMS_SYNC_ENABLED", true),
		LMSSyncCron:            getEnv("LMS_SYNC_CRON", "0 7 * * *"),
		LMSSyncBatchSize:       getEnvAsInt("LMS_SYNC_BATCH_SIZE", 200),
		LMSSyncConcurrency:     getEnvAsInt("LMS_SYNC_CONCURRENCY", 2),
		LMSSyncTimeoutSeconds:  getEnvAsInt("LMS_SYNC_TIMEOUT_SECONDS", 90),
	}

	return cfg, nil
}

func getEnv(key string, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func getEnvAsInt(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	num, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return num
}

func getEnvAsBool(key string, fallback bool) bool {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	ok, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}
	return ok
}

func getEnvAsList(key string, fallback string) []string {
	value := getEnv(key, fallback)
	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))
	for _, p := range parts {
		v := strings.TrimSpace(p)
		if v != "" {
			result = append(result, v)
		}
	}
	return result
}
