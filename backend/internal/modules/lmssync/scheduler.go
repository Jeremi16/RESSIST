package lmssync

import (
	"context"
	"log"
	"time"

	"github.com/robfig/cron/v3"
)

type Scheduler struct {
	svc  *Service
	cron *cron.Cron
}

func NewScheduler(svc *Service) *Scheduler {
	return &Scheduler{
		svc:  svc,
		cron: cron.New(cron.WithLocation(time.FixedZone("WIB", 7*3600))),
	}
}

func (s *Scheduler) Start(ctx context.Context) error {
	spec := s.svc.cfg.LMSSyncCron
	if spec == "" {
		spec = "0 7 * * *"
	}

	if _, err := s.cron.AddFunc(spec, func() {
		log.Printf("[lmssync] cron tick (%s) — starting sync", spec)
		bgCtx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
		defer cancel()
		s.svc.SyncBatch(bgCtx)
	}); err != nil {
		return err
	}

	// Also allow immediate sync on startup if no users have ever synced? No — rely on cron to avoid burst on deploy.

	s.cron.Start()
	log.Printf("[lmssync] scheduler started (cron=%s, enabled=%v)", spec, s.svc.cfg.LMSSyncEnabled)

	<-ctx.Done()
	s.cron.Stop()
	log.Printf("[lmssync] scheduler stopped")
	return nil
}
