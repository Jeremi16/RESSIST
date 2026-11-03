package database

import (
	"fmt"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Open connects and tunes the pool without touching the schema or asserting
// anything about it. Used by the migrate command, which must be able to open a
// completely empty database.
func Open(databaseURL string) (*gorm.DB, error) {
	if databaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}

	db, err := gorm.Open(postgres.New(postgres.Config{
		DSN:                  databaseURL,
		PreferSimpleProtocol: true,
	}), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("get sql db: %w", err)
	}

	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)
	sqlDB.SetConnMaxIdleTime(10 * time.Minute)

	return db, nil
}

// New opens the pool and enforces the schema contract.
//
// It no longer creates tables itself. Schema changes live in numbered
// migrations (see migrate.go) for two reasons:
//
//   - When autoMigrate was false nothing created the schema at all, so a
//     brand-new database came up with zero tables and the API failed on its
//     first query. Production runs with AUTO_MIGRATE=false.
//   - When autoMigrate was true it ran on every single boot, re-executing two
//     UPDATE backfills over every row of events and users on each restart.
//
// autoMigrate=true now means "apply pending migrations at startup". That is
// safe for several replicas because Migrate takes a Postgres advisory lock and
// records each step in schema_migrations. autoMigrate=false means the release
// job is responsible (`docker compose run --rm api migrate`), and startup fails
// fast with an actionable message if that step was skipped.
func New(databaseURL string, autoMigrate bool) (*gorm.DB, error) {
	db, err := Open(databaseURL)
	if err != nil {
		return nil, err
	}

	if autoMigrate {
		if err := Migrate(db); err != nil {
			return nil, fmt.Errorf("migrate: %w", err)
		}
	}

	// Refuse to serve on a schema that is missing steps this binary needs.
	// Without this check the failure surfaces later as "relation does not
	// exist" on a random request instead of at startup.
	if err := Verify(db); err != nil {
		return nil, err
	}

	return db, nil
}
