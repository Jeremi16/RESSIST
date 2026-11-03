package retention

import (
	"context"
	"log"
	"time"

	"github.com/jeremi16/ressist-api/internal/models"
	"github.com/robfig/cron/v3"
	"gorm.io/gorm"
)

// Config holds retention policy knobs.
type Config struct {
	Enabled       bool
	RetentionDays int
	Cron          string
	// BatchSize bounds how many rows one DELETE touches, so the job never
	// holds a long lock on the events table.
	BatchSize int
}

// Scheduler periodically prunes old event rows.
//
// Without retention, every query bound added elsewhere (LIMIT, deadline
// filters) only postpones growth: the table still accumulates one row per
// assignment per user forever, and index scans get slower every semester.
type Scheduler struct {
	db   *gorm.DB
	cfg  Config
	cron *cron.Cron
}

// NewScheduler creates a retention scheduler.
func NewScheduler(db *gorm.DB, cfg Config) *Scheduler {
	return &Scheduler{
		db:   db,
		cfg:  cfg,
		cron: cron.New(cron.WithLocation(time.FixedZone("WIB", 7*3600))),
	}
}

// Start registers the prune job and blocks until ctx is cancelled.
func (s *Scheduler) Start(ctx context.Context) error {
	if s.cfg.Cron == "" {
		s.cfg.Cron = "30 3 * * *" // 03:30 WIB, outside exam hours
	}
	if _, err := s.cron.AddFunc(s.cfg.Cron, func() {
		bgCtx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
		defer cancel()
		if err := s.PruneOnce(bgCtx); err != nil {
			log.Printf("[retention] prune failed: %v", err)
		}
	}); err != nil {
		return err
	}

	s.cron.Start()
	log.Printf("[retention] scheduler started (cron=%s, retention=%d days)", s.cfg.Cron, s.cfg.RetentionDays)

	<-ctx.Done()
	s.cron.Stop()
	return ctx.Err()
}

// PruneOnce deletes completed/missed events older than the retention window.
//
// Pending rows are deliberately never deleted: they are the user's live
// to-do list, and a task with a deadline 100 days ago that was never marked
// done is still something the user may care about.
func (s *Scheduler) PruneOnce(ctx context.Context) error {
	days := s.cfg.RetentionDays
	if days <= 0 {
		days = 90
	}
	batch := s.cfg.BatchSize
	if batch <= 0 {
		batch = 5000
	}

	cutoff := time.Now().UTC().AddDate(0, 0, -days)
	total := int64(0)

	for {
		if err := ctx.Err(); err != nil {
			return err
		}

		// Delete in bounded batches. Selecting the ids first keeps the DELETE
		// statement small and portable across drivers.
		var ids []string
		if err := s.db.WithContext(ctx).
			Model(&models.Event{}).
			Where("deadline < ?", cutoff).
			Where("(status IN ? OR completed = ?)", []string{"completed", "missed"}, true).
			Limit(batch).
			Pluck("id", &ids).Error; err != nil {
			return err
		}
		if len(ids) == 0 {
			break
		}

		res := s.db.WithContext(ctx).Where("id IN ?", ids).Delete(&models.Event{})
		if res.Error != nil {
			return res.Error
		}
		total += res.RowsAffected

		if len(ids) < batch {
			break
		}
	}

	if total > 0 {
		log.Printf("[retention] pruned %d events older than %s", total, cutoff.Format(time.RFC3339))
	}
	return nil
}
