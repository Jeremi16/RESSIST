package user

import "gorm.io/gorm"

// Module aggregates user layer components.
type Module struct {
	Handler *Handler
}

// New creates a new user Module.
func New(db *gorm.DB) (*Module, error) {
	handler := NewHandler(db)
	return &Module{
		Handler: handler,
	}, nil
}

// NewWithConfig creates a new user Module with injected telegram username.
func NewWithConfig(db *gorm.DB, telegramBotUsername string) (*Module, error) {
	handler := NewHandlerWithConfig(db, telegramBotUsername)
	return &Module{
		Handler: handler,
	}, nil
}
