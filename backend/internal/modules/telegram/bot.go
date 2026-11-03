package telegram

import (
	"fmt"
	"net/http"
	"time"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"github.com/jeremi16/ressist-api/internal/config"
	"gorm.io/gorm"
)

// telegramHTTPTimeout bounds every Bot API call.
//
// tgbotapi.NewBotAPI builds &http.Client{} with no Timeout, and its
// MakeRequest uses http.NewRequest without a context — so neither the request
// deadline from middleware.TimeoutContext nor a client disconnect can cancel
// an in-flight send. One hanging upstream would pin a goroutine and a socket
// indefinitely. Supplying our own client is the only way to bound it.
const telegramHTTPTimeout = 10 * time.Second

// Bot wraps telegram API with DB and config.
type Bot struct {
	api *tgbotapi.BotAPI
	db  *gorm.DB
	cfg *config.Config
}

// NewBot creates a new Telegram Bot instance.
func NewBot(cfg *config.Config, db *gorm.DB) (*Bot, error) {
	if cfg.TelegramBotToken == "" {
		return nil, fmt.Errorf("telegram bot token is missing")
	}
	api, err := tgbotapi.NewBotAPIWithClient(cfg.TelegramBotToken, tgbotapi.APIEndpoint, &http.Client{
		Timeout: telegramHTTPTimeout,
	})
	if err != nil {
		return nil, err
	}
	return &Bot{
		api: api,
		db:  db,
		cfg: cfg,
	}, nil
}

// Polling (/start, /help, in-chat code redemption) intentionally lives in the
// standalone ressist-bot service, not here. Running getUpdates from more than
// one process makes Telegram return "Conflict: terminated by other getUpdates
// request", and a second implementation of code verification meant two copies
// of the security rules that had to be patched in lockstep. The single
// authoritative redemption path is POST /internal/telegram/verify
// (botservice.VerifyTelegram).
