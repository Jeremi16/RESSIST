package config

import (
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Env string

	BotPort string

	APIBaseURL      string
	BotServiceToken string

	TelegramBotToken    string
	TelegramBotUsername string
	PollTimeout         int
}

func Load() *Config {
	// Load bot/.env when running from repo root (go run ./bot/cmd/bot)
	// and when running from bot/ itself. Both calls are safe if file missing.
	_ = godotenv.Load()
	_ = godotenv.Load("bot/.env")
	_ = godotenv.Load("../bot/.env")
	return &Config{
		Env:                 getEnv("ENV", "development"),
		BotPort:             getEnv("BOT_PORT", "8081"),
		APIBaseURL:          strings.TrimSuffix(getEnv("API_BASE_URL", "http://localhost:8080"), "/"),
		BotServiceToken:     getEnv("BOT_SERVICE_TOKEN", ""),
		TelegramBotToken:    getEnv("TELEGRAM_BOT_TOKEN", ""),
		TelegramBotUsername: getEnv("TELEGRAM_BOT_USERNAME", "ressist_bot"),
		PollTimeout:         getEnvAsInt("BOT_POLL_TIMEOUT", 60),
	}
}

func getEnv(key, fallback string) string {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback
	}
	return v
}

func getEnvAsInt(key string, fallback int) int {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}
