package auth

import (
	"github.com/jeremi16/ressist-api/internal/config"
	"gorm.io/gorm"
)

// Module aggregates auth layer components.
type Module struct {
	Service      *Service
	Handler      *Handler
	TokenService *TokenService
}

// New creates a new auth Module.
func New(db *gorm.DB, cfg *config.Config) (*Module, error) {
	tokenSvc, err := NewTokenService(cfg.JWTAccessSecret, cfg.AccessTokenTTLMinute, "ressist-api", "ressist-frontend")
	if err != nil {
		return nil, err
	}

	authSvc, err := NewService(db, cfg, tokenSvc)
	if err != nil {
		return nil, err
	}

	handler := NewHandler(cfg, authSvc, db, nil)

	return &Module{
		Service:      authSvc,
		Handler:      handler,
		TokenService: tokenSvc,
	}, nil
}

// SetCalendarProvider injects the calendar provider into the handler.
func (m *Module) SetCalendarProvider(p CalendarProvider) {
	m.Handler.SetCalendarProvider(p)
}

// SetSyncService injects a custom sync service into the handler.
func (m *Module) SetSyncService(s CalendarSyncService) {
	m.Handler.SetSyncService(s)
}
