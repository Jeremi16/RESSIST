package app

import (
	"github.com/jeremi16/resisst-api/internal/config"
	"github.com/jeremi16/resisst-api/internal/modules/assignment"
	"github.com/jeremi16/resisst-api/internal/modules/auth"
	"github.com/jeremi16/resisst-api/internal/modules/calendar"
	"github.com/jeremi16/resisst-api/internal/modules/course"
	"github.com/jeremi16/resisst-api/internal/modules/telegram"
	"github.com/jeremi16/resisst-api/internal/modules/user"
	"gorm.io/gorm"
)

type Container struct {
	Config           *config.Config
	DB               *gorm.DB
	Auth             *auth.Module
	User             *user.Module
	Calendar         *calendar.Module
	Course           *course.Module
	Telegram         *telegram.Module
	Assignment       *assignment.Module
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
	telegramMod, err := telegram.New(cfg, db)
	if err != nil {
		return nil, err
	}
	assignmentMod, err := assignment.New(db)
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
		Telegram:   telegramMod,
		Assignment: assignmentMod,
	}, nil
}
