package config

import (
	"os"
	"strconv"
	"strings"
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
	return &Config{
		Env:                 getEnv("ENV", "development"),
		BotPort:             getEnv("BOT_PORT", "8081"),
		APIBaseURL:          strings.TrimSuffix(getEnv("API_BASE_URL", "http://localhost:8080"), "/"),
		BotServiceToken:     getEnv("BOT_SERVICE_TOKEN", ""),
		TelegramBotToken:    getEnv("TELEGRAM_BOT_TOKEN", ""),
		TelegramBotUsername: getEnv("TELEGRAM_BOT_USERNAME", "resisst_bot"),
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
