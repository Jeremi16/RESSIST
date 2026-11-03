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

// Start launches the reminder scheduler in the background. Returns immediately
// and respects ctx cancellation.
//
// Polling (getUpdates) is NOT started here and must never be: it belongs to the
// standalone ressist-bot service (replicas=1), otherwise Telegram returns
// "Conflict: terminated by other getUpdates request". Only the scheduler —
// which is a plain cron over our own DB — is safe to run in-process.
func (m *Module) Start(ctx context.Context) error {
	if m.Scheduler != nil {
		go func() {
			_ = m.Scheduler.Start(ctx)
		}()
	}
	return nil
}

// StartScheduler starts the cron scheduler (blocking).
func (m *Module) StartScheduler(ctx context.Context) error {
	if m.Scheduler == nil {
		return nil
	}
	return m.Scheduler.Start(ctx)
}
