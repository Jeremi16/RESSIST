package course

import "gorm.io/gorm"

// Module aggregates course layer components.
type Module struct {
	Handler *Handler
}

// New creates a new course Module.
func New(db *gorm.DB) (*Module, error) {
	handler := NewHandler(db)
	return &Module{
		Handler: handler,
	}, nil
}
