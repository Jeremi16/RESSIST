package lmssync

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/jeremi16/ressist-api/internal/config"
	"github.com/jeremi16/ressist-api/internal/models"
	"github.com/jeremi16/ressist-api/internal/modules/calendar"
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

	// Claim users atomically, then do the work outside any transaction.
	//
	// The previous statement was a bare SELECT ... FOR UPDATE SKIP LOCKED. The
	// row locks were released the moment that statement finished, but all the
	// real work (HTTP calls to Google/Moodle) happens after it — so two
	// replicas ticking at the same minute claimed the same users and did the
	// work twice. A claim column holds no lock and still dedups across
	// replicas: a claimed user is invisible until the claim expires.
	//
	// The claim is 15 minutes, comfortably longer than the 10-minute cron
	// timeout, so a replica that dies mid-batch releases its users
	// automatically on the next tick.
	claimMinutes := 15
	var users []models.User
	err := s.db.WithContext(ctx).Raw(`
			UPDATE users SET sync_claimed_until = NOW() + make_interval(mins => ?)
			WHERE id IN (
				SELECT id FROM users
				WHERE (moodle_enabled = true OR google_classroom_enabled = true)
				  AND (sync_claimed_until IS NULL OR sync_claimed_until < NOW())
				  AND (
				        (moodle_enabled = true AND (moodle_last_synced_at IS NULL OR moodle_last_synced_at < NOW() - INTERVAL '24 hours'))
				     OR (google_classroom_enabled = true AND (google_classroom_last_synced_at IS NULL OR google_classroom_last_synced_at < NOW() - INTERVAL '24 hours'))
				     OR (lms_last_synced_at IS NULL AND moodle_last_synced_at IS NULL AND google_classroom_last_synced_at IS NULL)
				  )
				ORDER BY COALESCE(LEAST(moodle_last_synced_at, google_classroom_last_synced_at), lms_last_synced_at) ASC NULLS FIRST
				LIMIT ? FOR UPDATE SKIP LOCKED
			)
			RETURNING *`, claimMinutes, batchSize).Scan(&users).Error
	if err != nil {
		log.Printf("[lmssync] claim batch failed: %v", err)
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
			// Release the claim once this user's work is over, whether it
			// succeeded or failed, so a failed user can be retried on the next
			// tick instead of waiting out the full claim window.
			defer func() {
				s.db.Model(&models.User{}).Where("id = ?", user.ID).
					Update("sync_claimed_until", nil)
			}()
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
