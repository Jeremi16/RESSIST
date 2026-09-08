package telegram

import (
	"context"

	"github.com/jeremi16/ressist-api/internal/config"
	"gorm.io/gorm"
)

// Module aggregates telegram layer components.
type Module struct {
	Bot       *Bot
	Scheduler *Scheduler
	Handler   *Handler
	cfg       *config.Config
	db        *gorm.DB
}

// New creates a new telegram Module.
// Returns nil Bot/Scheduler if telegram is not configured, but still provides Handler.
func New(cfg *config.Config, db *gorm.DB) (*Module, error) {
	bot, err := NewBot(cfg, db)
	if err != nil {
		// Bot not configured; still create handler with nil bot for graceful degradation
		handler := NewHandler(db, nil)
		return &Module{
			Bot:       nil,
			Scheduler: nil,
			Handler:   handler,
			cfg:       cfg,
			db:        db,
		}, nil
	}
	scheduler := NewScheduler(bot)
	handler := NewHandler(db, bot)
	return &Module{
		Bot:       bot,
		Scheduler: scheduler,
		Handler:   handler,
		cfg:       cfg,
		db:        db,
	}, nil
}

// Start launches bot and scheduler in background. Returns immediately.
// Both respect ctx cancellation.
//
// DEPRECATED: do NOT call from ressist-api. Polling must run only in the
// standalone ressist-bot service (replicas=1), otherwise Telegram returns
// "Conflict: terminated by other getUpdates request". Kept for reference.
func (m *Module) Start(ctx context.Context) error {
	if m.Bot != nil {
		go func() {
			_ = m.Bot.Start(ctx)
		}()
	}
	if m.Scheduler != nil {
		go func() {
			_ = m.Scheduler.Start(ctx)
		}()
	}
	return nil
}

// StartBot starts the bot polling (blocking).
func (m *Module) StartBot(ctx context.Context) error {
	if m.Bot == nil {
		return nil
	}
	return m.Bot.Start(ctx)
}

// StartScheduler starts the cron scheduler (blocking).
func (m *Module) StartScheduler(ctx context.Context) error {
	if m.Scheduler == nil {
		return nil
	}
	return m.Scheduler.Start(ctx)
}
