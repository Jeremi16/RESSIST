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

	FrontendURL         string
	FrontendSuccessPath string
	FrontendErrorPath   string

	CookieDomain string
	CookieSecure bool

	AllowedOrigins []string
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
		AccessTokenTTLMinute: getEnvAsInt("ACCESS_TOKEN_TTL_MINUTES", 15),
		RefreshTokenTTLHour:  getEnvAsInt("REFRESH_TOKEN_TTL_HOURS", 720),

		FrontendURL:         getEnv("FRONTEND_URL", "http://localhost:3000"),
		FrontendSuccessPath: getEnv("FRONTEND_SUCCESS_PATH", "/login?auth=success"),
		FrontendErrorPath:   getEnv("FRONTEND_ERROR_PATH", "/login"),

		CookieDomain: getEnv("COOKIE_DOMAIN", ""),
		CookieSecure: getEnvAsBool("COOKIE_SECURE", false),

		AllowedOrigins: getEnvAsList("ALLOWED_ORIGINS", "http://localhost:3000"),
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
