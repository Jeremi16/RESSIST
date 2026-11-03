package database

import (
	"fmt"
	"log"
	"sort"
	"time"

	"github.com/jeremi16/ressist-api/internal/models"
	"gorm.io/gorm"
)

// migrationLockKey is the advisory-lock key that serialises migration runs
// across processes. It must never change: a different value would let two
// replicas migrate concurrently, which is exactly the race this guards against.
const migrationLockKey int64 = 0x7265_7373_6973_7401

// Migration is one numbered, forward-only schema step.
//
// Up runs inside a transaction together with the schema_migrations insert, so
// a step either applies and is recorded, or neither happens. That means every
// Up must be transactional — no CREATE INDEX CONCURRENTLY (see the note on
// migration 5 below).
type Migration struct {
	Version int
	Name    string
	Up      func(tx *gorm.DB) error

	// Tolerant turns a failure into a warning and leaves the version
	// unapplied, so it is retried on the next start. Only for steps that are
	// safe to skip (the telegram unique index cannot be created while
	// duplicate rows still exist) — never for steps the code depends on.
	Tolerant bool
}

// Migrate applies every pending migration in version order, exactly once.
//
// Why this exists: the schema used to be created by GORM AutoMigrate, which
// ran on every boot when AUTO_MIGRATE was true and did nothing at all when it
// was false. Production runs with AUTO_MIGRATE=false, so a brand-new database
// ended up with zero tables and the API failed on its first query. Numbered
// migrations remove that dependency:
//
//   - the version list lives in code, so a deploy cannot "forget" a step;
//   - each step is recorded in schema_migrations, so it runs once, not on
//     every restart (AutoMigrate re-ran its UPDATE backfills each boot);
//   - an advisory lock serialises concurrent starters, so N replicas no longer
//     race and leave a half-applied schema.
//
// Locking uses pg_advisory_xact_lock (transaction-scoped) rather than
// pg_advisory_lock (session-scoped). Session locks are unreliable through a
// transaction-mode connection pooler such as pgbouncer or Neon's "-pooler"
// endpoint: the lock is taken on a server connection that is returned to the
// pool, so a second client can acquire the same key on a different server
// connection and both migrate at once. A transaction-scoped lock lives exactly
// as long as the transaction that holds it, which is well-defined under any
// pooler.
func Migrate(db *gorm.DB) error {
	if err := ensureMigrationsTable(db); err != nil {
		return err
	}

	all := migrations()
	if err := validateMigrations(all); err != nil {
		return err
	}

	known := make(map[int]bool, len(all))
	for _, m := range all {
		known[m.Version] = true
	}

	applied, err := appliedVersions(db)
	if err != nil {
		return err
	}
	for version := range applied {
		if !known[version] {
			// An older binary against a newer schema. Rollback must still be
			// possible, so warn instead of refusing to start.
			log.Printf("[db] WARNING: database has migration %04d applied but this binary does not know it (binary is older than the schema)", version)
		}
	}

	pending := pendingMigrations(all, applied)
	if len(pending) == 0 {
		log.Printf("[db] schema up to date (%d migrations applied)", len(applied))
		return nil
	}

	for _, m := range pending {
		if err := applyMigration(db, m); err != nil {
			return err
		}
	}
	return nil
}

// Status returns the applied migrations, oldest first. Used by the release
// job to print what it did, and by operators to confirm a deploy.
func Status(db *gorm.DB) ([]AppliedMigration, error) {
	if err := ensureMigrationsTable(db); err != nil {
		return nil, err
	}

	var rows []AppliedMigration
	if err := db.Table("schema_migrations").Order("version").Find(&rows).Error; err != nil {
		return nil, fmt.Errorf("read schema_migrations: %w", err)
	}
	return rows, nil
}

// AppliedMigration is one row of schema_migrations.
type AppliedMigration struct {
	Version   int       `gorm:"column:version"`
	Name      string    `gorm:"column:name"`
	AppliedAt time.Time `gorm:"column:applied_at"`
}

// Verify fails when the database is missing tables or columns that this
// binary writes to. Called on every start, including AUTO_MIGRATE=false, so a
// skipped migration step is reported at boot instead of surfacing later as
// "relation does not exist" in the middle of a user request.
func Verify(db *gorm.DB) error {
	var tableCount int64
	if err := db.Raw(`SELECT count(*) FROM information_schema.tables
		WHERE table_schema = current_schema()
		  AND table_name IN ('users','refresh_tokens','events','courses','api_keys')`).Scan(&tableCount).Error; err != nil {
		return fmt.Errorf("verify schema: %w", err)
	}
	if tableCount < 5 {
		return fmt.Errorf("database schema is not initialised (found %d of 5 tables): run the migration step first — `docker compose run --rm api migrate`, or start once with AUTO_MIGRATE=true", tableCount)
	}

	// Columns added by migrations after the baseline. Each is written by code
	// that would otherwise fail on the first write, so a missing one must be
	// a startup error rather than a runtime 500.
	required := []struct{ table, column string }{
		{"refresh_tokens", "session_started_at"},
		{"refresh_tokens", "revoked_reason"},
		{"users", "sync_claimed_until"},
	}
	for _, c := range required {
		var exists bool
		if err := db.Raw(`SELECT EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_schema = current_schema()
			  AND table_name = ? AND column_name = ?
		)`, c.table, c.column).Scan(&exists).Error; err != nil {
			return fmt.Errorf("verify schema %s.%s: %w", c.table, c.column, err)
		}
		if !exists {
			return fmt.Errorf("database schema is out of date: %s.%s is missing — run the migration step (`docker compose run --rm api migrate`)", c.table, c.column)
		}
	}

	return nil
}

// ensureMigrationsTable creates schema_migrations exactly once, safely under
// concurrency.
//
// CREATE TABLE IF NOT EXISTS is NOT safe against a concurrent CREATE: both
// processes pass the "not exists" check and the loser fails with
//
//	duplicate key value violates unique constraint "pg_type_typname_nsp_index"
//
// The advisory lock below is transaction-scoped, so it is released on commit
// and cannot leak if the process dies.
func ensureMigrationsTable(db *gorm.DB) error {
	return db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec(`SELECT pg_advisory_xact_lock($1)`, migrationLockKey).Error; err != nil {
			return fmt.Errorf("lock for schema_migrations bootstrap: %w", err)
		}
		if err := tx.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
			version    integer PRIMARY KEY,
			name       text NOT NULL,
			applied_at timestamptz NOT NULL DEFAULT now()
		)`).Error; err != nil {
			return fmt.Errorf("create schema_migrations: %w", err)
		}
		return nil
	})
}

func appliedVersions(db *gorm.DB) (map[int]bool, error) {
	var versions []int
	if err := db.Table("schema_migrations").Pluck("version", &versions).Error; err != nil {
		return nil, fmt.Errorf("read applied migrations: %w", err)
	}
	applied := make(map[int]bool, len(versions))
	for _, v := range versions {
		applied[v] = true
	}
	return applied, nil
}

// validateMigrations rejects a malformed catalogue before anything is applied.
func validateMigrations(all []Migration) error {
	seen := make(map[int]bool, len(all))
	for _, m := range all {
		if m.Version <= 0 {
			return fmt.Errorf("migration %q has invalid version %d (must be >= 1)", m.Name, m.Version)
		}
		if m.Name == "" {
			return fmt.Errorf("migration %d has no name", m.Version)
		}
		if m.Up == nil {
			return fmt.Errorf("migration %d (%s) has no Up func", m.Version, m.Name)
		}
		if seen[m.Version] {
			return fmt.Errorf("duplicate migration version %d (%s)", m.Version, m.Name)
		}
		seen[m.Version] = true
	}
	return nil
}

// pendingMigrations returns the steps that have not been applied yet, in
// ascending version order.
func pendingMigrations(all []Migration, applied map[int]bool) []Migration {
	pending := make([]Migration, 0, len(all))
	for _, m := range all {
		if !applied[m.Version] {
			pending = append(pending, m)
		}
	}
	sort.Slice(pending, func(i, j int) bool { return pending[i].Version < pending[j].Version })
	return pending
}

// applyMigration runs one step and records it in the same transaction.
//
// The advisory lock is re-acquired per migration and the applied set is
// re-read inside the lock: if two processes start at once, the loser waits,
// then sees the step already recorded and skips it instead of applying it
// twice.
func applyMigration(db *gorm.DB, m Migration) error {
	label := fmt.Sprintf("%04d_%s", m.Version, m.Name)
	started := time.Now()
	skipped := false

	err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec(`SELECT pg_advisory_xact_lock($1)`, migrationLockKey).Error; err != nil {
			return fmt.Errorf("acquire migration lock: %w", err)
		}

		var already bool
		if err := tx.Raw(`SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE version = ?)`, m.Version).Scan(&already).Error; err != nil {
			return fmt.Errorf("check migration state: %w", err)
		}
		if already {
			skipped = true
			return nil
		}

		if err := m.Up(tx); err != nil {
			return err
		}
		return tx.Exec(`INSERT INTO schema_migrations (version, name) VALUES (?, ?)`, m.Version, m.Name).Error
	})

	if err != nil {
		if m.Tolerant {
			log.Printf("[db] WARNING: migration %s could not be applied and will be retried on next start (%v); see SECURITY-MIGRATIONS.md", label, err)
			return nil
		}
		return fmt.Errorf("migration %s: %w", label, err)
	}

	if skipped {
		// Another process applied it while we waited for the lock.
		log.Printf("[db] migration %s was applied by another process", label)
		return nil
	}

	log.Printf("[db] applied migration %s in %s", label, time.Since(started).Round(time.Millisecond))
	return nil
}

// migrations is the ordered catalogue of schema steps. Append only: an
// existing entry may never be edited or removed, because databases that
// already recorded it will never run it again.
func migrations() []Migration {
	return []Migration{
		{
			// Baseline: create the tables that already exist in production.
			//
			// Guarded by an existence check instead of running DDL
			// unconditionally. models.User carries a unique index tag for
			// telegram_chat_id, so AutoMigrate would try to CREATE that index
			// — and on a database that still has duplicate bindings it would
			// fail, aborting this migration and preventing the API from
			// starting at all. That is exactly the database the operator has
			// to fix by hand (SECURITY-MIGRATIONS.md), so it must not be a
			// boot blocker.
			//
			// Existing schema -> no-op, just record the version.
			// Empty database  -> AutoMigrate builds the tables from the
			//                    models, so the baseline cannot drift. A fresh
			//                    database cannot contain duplicate users.
			Version: 1,
			Name:    "baseline_schema",
			Up: func(tx *gorm.DB) error {
				var existing int64
				if err := tx.Raw(`SELECT count(*) FROM information_schema.tables
					WHERE table_schema = current_schema()
					  AND table_name IN ('users','refresh_tokens','events','courses','api_keys')`).Scan(&existing).Error; err != nil {
					return err
				}
				if existing == 5 {
					return nil
				}
				return tx.AutoMigrate(
					&models.User{},
					&models.RefreshToken{},
					&models.Event{},
					&models.Course{},
					&models.ApiKey{},
				)
			},
		},
		{
			Version: 2,
			Name:    "refresh_tokens_session_started_at",
			Up: func(tx *gorm.DB) error {
				if err := tx.Exec(`ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS session_started_at timestamptz`).Error; err != nil {
					return err
				}
				return tx.Exec(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_session_started_at ON refresh_tokens (session_started_at)`).Error
			},
		},
		{
			// Distinguishes rotation (grace allowed) from logout/reuse (never).
			// Old rows get NULL and are treated as non-grace — fail-closed.
			Version: 3,
			Name:    "refresh_tokens_revoked_reason",
			Up: func(tx *gorm.DB) error {
				if err := tx.Exec(`ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS revoked_reason varchar(16)`).Error; err != nil {
					return err
				}
				return tx.Exec(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked_reason ON refresh_tokens (revoked_reason)`).Error
			},
		},
		{
			// Per-user claim so two replicas never sync the same user at once.
			Version: 4,
			Name:    "users_sync_claimed_until",
			Up: func(tx *gorm.DB) error {
				if err := tx.Exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS sync_claimed_until timestamptz`).Error; err != nil {
					return err
				}
				return tx.Exec(`CREATE INDEX IF NOT EXISTS idx_users_sync_claimed_until ON users (sync_claimed_until)`).Error
			},
		},
		{
			// Partial unique index on telegram_chat_id.
			//
			// Deliberately NOT CREATE INDEX CONCURRENTLY: a transaction cannot
			// contain CONCURRENTLY, and running it outside the transaction
			// would lose the atomicity that guarantees "applied exactly once".
			// A plain CREATE INDEX takes a write lock on users for the
			// duration — acceptable because the table holds one row per
			// student and this runs once. If users is ever large, run the
			// CONCURRENTLY form manually first (SECURITY-MIGRATIONS.md); this
			// step then no-ops thanks to IF NOT EXISTS.
			//
			// Tolerant because it cannot succeed while duplicate bindings
			// exist. Startup logs a warning and the step is retried on the
			// next start; the API stays correct meanwhile because binding
			// resolution already rejects ambiguity with 409.
			Version:  5,
			Name:     "users_telegram_chat_id_unique",
			Tolerant: true,
			Up: func(tx *gorm.DB) error {
				return tx.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_telegram_chat_id
					ON users (telegram_chat_id) WHERE telegram_chat_id IS NOT NULL`).Error
			},
		},
		{
			// One-time data backfill, previously re-executed on every restart
			// inside the AUTO_MIGRATE block.
			Version: 6,
			Name:    "backfill_event_status_and_reminder_hours",
			Up: func(tx *gorm.DB) error {
				if err := tx.Exec(`UPDATE events
					SET status = CASE WHEN completed = true THEN 'completed' ELSE 'pending' END
					WHERE status IS NULL OR status = ''`).Error; err != nil {
					return err
				}
				// Users who explicitly chose "[24]" are left alone.
				return tx.Exec(`UPDATE users SET reminder_hours = '[24,12,6,1]'
					WHERE reminder_hours IS NULL OR TRIM(reminder_hours) = '' OR TRIM(reminder_hours) = '[]'`).Error
			},
		},
	}
}
