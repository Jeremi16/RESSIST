package calendar

import (
	"github.com/jeremi16/resisst-api/internal/config"
	"github.com/jeremi16/resisst-api/internal/modules/calendar/google"
	"github.com/jeremi16/resisst-api/internal/modules/calendar/moodle"
	"github.com/jeremi16/resisst-api/internal/modules/calendar/sync"
	"gorm.io/gorm"
)

// Module aggregates calendar layer components.
type Module struct {
	Service      *Service
	Handler      *Handler
	SyncService  *sync.SyncService
	GoogleClient *google.Client
	MoodleClient *moodle.Client
}

// New creates a new calendar Module.
func New(db *gorm.DB, cfg *config.Config) (*Module, error) {
	svc := NewService(db, cfg)
	handler := NewHandlerWithService(db, cfg, svc)

	return &Module{
		Service:      svc,
		Handler:      handler,
		SyncService:  svc.SyncService(),
		GoogleClient: svc.GoogleClient(),
		MoodleClient: svc.MoodleClient(),
	}, nil
}

// SyncProviders delegates to Service for external use.
func (m *Module) SyncProviders() *Service { return m.Service }
