package apikey

import (
	"github.com/jeremi16/resisst-api/internal/config"
	"gorm.io/gorm"
)

type Module struct {
	Service *Service
	Handler *Handler
}

func New(db *gorm.DB, cfg *config.Config) (*Module, error) {
	svc := NewService(db, cfg)
	handler := NewHandler(svc)
	return &Module{
		Service: svc,
		Handler: handler,
	}, nil
}
