package app

import (
	"github.com/jeremi16/ressist-api/internal/config"
	"github.com/jeremi16/ressist-api/internal/modules/apikey"
	"github.com/jeremi16/ressist-api/internal/modules/assignment"
	"github.com/jeremi16/ressist-api/internal/modules/auth"
	"github.com/jeremi16/ressist-api/internal/modules/calendar"
	"github.com/jeremi16/ressist-api/internal/modules/course"
	"github.com/jeremi16/ressist-api/internal/modules/botservice"
	"github.com/jeremi16/ressist-api/internal/modules/telegram"
	"github.com/jeremi16/ressist-api/internal/modules/user"
	"gorm.io/gorm"
)

type Container struct {
	Config           *config.Config
	DB               *gorm.DB
	Auth             *auth.Module
	User             *user.Module
	Calendar         *calendar.Module
	Course           *course.Module
	Internal         *botservice.Module
	// TelegramSender is sender-only (SendMessage for /v1/telegram/test-*).
	// It NEVER polls: polling lives in ressist-bot. Sending via Bot API
	// from multiple processes is allowed; only getUpdates is exclusive.
	TelegramSender   *telegram.Module
	Assignment       *assignment.Module
	ApiKey           *apikey.Module
}

func New(cfg *config.Config, db *gorm.DB) (*Container, error) {
	calendarMod, err := calendar.New(db, cfg)
	if err != nil {
		return nil, err
	}
	authMod, err := auth.New(db, cfg)
	if err != nil {
		return nil, err
	}
	// Inject calendar provider into auth handler to enable SyncAfterLogin
	authMod.SetCalendarProvider(calendarMod.Service)

	userMod, err := user.New(db)
	if err != nil {
		return nil, err
	}
	courseMod, err := course.New(db)
	if err != nil {
		return nil, err
	}
	botSvcMod, err := botservice.New(db)
	if err != nil {
		return nil, err
	}
	// Sender-only: graceful nil Bot when TELEGRAM_BOT_TOKEN is empty.
	telegramSender, err := telegram.New(cfg, db)
	if err != nil {
		return nil, err
	}
	assignmentMod, err := assignment.New(db)
	if err != nil {
		return nil, err
	}
	apiKeyMod, err := apikey.New(db, cfg)
	if err != nil {
		return nil, err
	}

	return &Container{
		Config:     cfg,
		DB:         db,
		Auth:       authMod,
		User:       userMod,
		Calendar:   calendarMod,
		Course:     courseMod,
		Internal:   botSvcMod,
		TelegramSender: telegramSender,
		Assignment: assignmentMod,
		ApiKey:     apiKeyMod,
	}, nil
}
