package assignment

import "gorm.io/gorm"

// Module aggregates assignment layer components.
type Module struct {
	Handler *Handler
}

// New creates a new assignment Module.
func New(db *gorm.DB) (*Module, error) {
	handler := NewHandler(db)
	return &Module{
		Handler: handler,
	}, nil
}
