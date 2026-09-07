package botservice

import "gorm.io/gorm"

// Module aggregates internal service-to-service components for resisst-bot.
type Module struct {
	Handler *Handler
}

// New creates a new internal Module.
func New(db *gorm.DB) (*Module, error) {
	return &Module{Handler: NewHandler(db)}, nil
}
