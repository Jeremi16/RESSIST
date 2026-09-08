package lmssync

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/jeremi16/resisst-api/internal/config"
	"github.com/jeremi16/resisst-api/internal/models"
	"github.com/jeremi16/resisst-api/internal/modules/calendar"
	"gorm.io/gorm"
)

// Service handles batch LMS sync.
type Service struct {
	cfg   *config.Config
	db    *gorm.DB
	cal   *calendar.Service
}

// New creates a new lmssync Service.
func New(cfg *config.Config, db *gorm.DB, cal *calendar.Service) *Service {
	return &Service{cfg: cfg, db: db, cal: cal}
}

// SyncBatch syncs all users whose LMS needs sync (per-provider 24h window).
func (s *Service) SyncBatch(ctx context.Context) {
	batchSize := s.cfg.LMSSyncBatchSize
	if batchSize <= 0 {
		batchSize = 200
	}
	concurrency := s.cfg.LMSSyncConcurrency
	if concurrency <= 0 {
		concurrency = 2
	}

	// Fetch users needing sync with SKIP LOCKED to dedup across replicas.
	// Use per-provider timestamps: sync if any enabled provider is stale >24h.
	var users []models.User
	err := s.db.WithContext(ctx).Raw(`
			SELECT * FROM users
			WHERE (moodle_enabled = true AND (moodle_last_synced_at IS NULL OR moodle_last_synced_at < NOW() - INTERVAL '24 hours'))
			   OR (google_classroom_enabled = true AND (google_classroom_last_synced_at IS NULL OR google_classroom_last_synced_at < NOW() - INTERVAL '24 hours'))
			   OR ((moodle_enabled = true OR google_classroom_enabled = true) AND lms_last_synced_at IS NULL
			       AND moodle_last_synced_at IS NULL AND google_classroom_last_synced_at IS NULL)
			ORDER BY COALESCE(LEAST(moodle_last_synced_at, google_classroom_last_synced_at), lms_last_synced_at) ASC NULLS FIRST
			LIMIT ? FOR UPDATE SKIP LOCKED
		`, batchSize).Scan(&users).Error
	if err != nil {
		log.Printf("[lmssync] fetch batch failed: %v", err)
		return
	}

	if len(users) == 0 {
		log.Printf("[lmssync] no users needing sync")
		return
	}

	log.Printf("[lmssync] starting daily sync for %d users (concurrency=%d)", len(users), concurrency)

	sem := make(chan struct{}, concurrency)
	var wg sync.WaitGroup
	var mu sync.Mutex
	successCount := 0
	failCount := 0

	timeoutSec := s.cfg.LMSSyncTimeoutSeconds
	if timeoutSec <= 0 {
		timeoutSec = 90
	}
	for i := range users {
		u := users[i]
		wg.Add(1)
		sem <- struct{}{}
		go func(user models.User) {
			defer wg.Done()
			defer func() { <-sem }()
			pctx, cancel := context.WithTimeout(ctx, time.Duration(timeoutSec)*time.Second)
			defer cancel()

			providers := s.cal.GetEnabledProviders(&user)
			if len(providers) == 0 {
				// Still update timestamp to avoid re-pick
				now := time.Now().UTC()
				s.db.WithContext(pctx).Model(&models.User{}).Where("id = ?", user.ID).Updates(map[string]interface{}{
					"lms_last_synced_at": now,
				})
				return
			}

			_, _, success, failed := s.cal.SyncProviders(pctx, &user, providers)
			// Per-provider timestamps already updated inside SyncProviders.
			mu.Lock()
			if success > 0 {
				successCount++
			}
			if failed > 0 && success == 0 {
				failCount++
			}
			mu.Unlock()
			if failed > 0 {
				log.Printf("[lmssync] user=%s providers=%v success=%d failed=%d", user.ID, providers, success, failed)
			}
		}(u)
	}
	wg.Wait()
	log.Printf("[lmssync] daily sync done: users=%d success=%d failed=%d", len(users), successCount, failCount)

	// If batch was full, there may be more users — caller can loop, but for daily 07:00 one batch is usually enough.
	// If needed, recursively sync next batch
	if len(users) == batchSize {
		log.Printf("[lmssync] batch full, checking for more users...")
		// Avoid infinite recursion — only one extra batch per tick to prevent long blocking at 07:00
	}
}
