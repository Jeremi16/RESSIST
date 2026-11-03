package main

import (
	"fmt"
	"log"

	"github.com/jeremi16/ressist-api/internal/config"
	"github.com/jeremi16/ressist-api/internal/database"
)

// runMigrate applies pending schema migrations and exits. It is the release
// step that must run before a deploy when AUTO_MIGRATE=false, and it is safe
// to run from a job because database.Migrate holds a Postgres advisory lock:
// concurrent invocations serialise instead of racing.
func runMigrate(args []string) error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}
	if cfg.DatabaseURL == "" {
		return fmt.Errorf("DATABASE_URL is required")
	}

	// Open without verification: this command exists to initialise a database
	// that Verify would (correctly) reject as empty.
	db, err := database.Open(cfg.DatabaseURL)
	if err != nil {
		return err
	}

	if len(args) > 0 && args[0] == "status" {
		rows, err := database.Status(db)
		if err != nil {
			return err
		}
		if len(rows) == 0 {
			fmt.Println("no migrations applied yet")
			return nil
		}
		for _, r := range rows {
			fmt.Printf("%04d  %-45s  %s\n", r.Version, r.Name, r.AppliedAt.Format("2006-01-02 15:04:05 MST"))
		}
		return nil
	}
	if len(args) > 0 {
		return fmt.Errorf("unknown argument %q (supported: status)", args[0])
	}

	if err := database.Migrate(db); err != nil {
		return err
	}

	// Prove the result instead of assuming it: the same gate the server
	// applies on boot.
	if err := database.Verify(db); err != nil {
		return err
	}
	log.Printf("[migrate] schema verified")
	return nil
}
