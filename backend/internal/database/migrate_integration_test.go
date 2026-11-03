package database

import (
	"os"
	"strings"
	"sync"
	"testing"

	"gorm.io/gorm"
)

// Integration tests for the migration runner. They need a real Postgres and
// are skipped unless MIGRATION_TEST_DATABASE_URL points at a scratch database
// the test is allowed to destroy.
//
//	$env:MIGRATION_TEST_DATABASE_URL="postgresql://user@127.0.0.1:5432/scratch?sslmode=disable"
//	go test ./internal/database -run Integration -v
//
// CI has no Postgres, so these are opt-in rather than part of `go test ./...`.
func integrationDB(t *testing.T) *gorm.DB {
	t.Helper()
	url := os.Getenv("MIGRATION_TEST_DATABASE_URL")
	if url == "" {
		t.Skip("MIGRATION_TEST_DATABASE_URL not set; skipping integration test")
	}
	db, err := Open(url)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	return db
}

// dropSchema empties the scratch database so each test starts from zero.
func dropSchema(t *testing.T, db *gorm.DB) {
	t.Helper()
	if err := db.Exec(`DROP SCHEMA public CASCADE`).Error; err != nil {
		t.Fatalf("drop schema: %v", err)
	}
	if err := db.Exec(`CREATE SCHEMA public`).Error; err != nil {
		t.Fatalf("create schema: %v", err)
	}
}

func TestIntegrationMigrateCreatesSchemaFromEmpty(t *testing.T) {
	db := integrationDB(t)
	dropSchema(t, db)

	if err := Migrate(db); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	var tables int64
	if err := db.Raw(`SELECT count(*) FROM information_schema.tables
		WHERE table_schema = 'public'
		  AND table_name IN ('users','refresh_tokens','events','courses','api_keys')`).Scan(&tables).Error; err != nil {
		t.Fatalf("count tables: %v", err)
	}
	if tables != 5 {
		t.Fatalf("expected 5 tables after migrate, got %d", tables)
	}

	if err := Verify(db); err != nil {
		t.Fatalf("verify after migrate: %v", err)
	}
}

func TestIntegrationMigrateIsIdempotent(t *testing.T) {
	db := integrationDB(t)
	dropSchema(t, db)

	if err := Migrate(db); err != nil {
		t.Fatalf("first migrate: %v", err)
	}
	var before int64
	if err := db.Raw(`SELECT count(*) FROM schema_migrations`).Scan(&before).Error; err != nil {
		t.Fatalf("count: %v", err)
	}

	if err := Migrate(db); err != nil {
		t.Fatalf("second migrate: %v", err)
	}
	var after int64
	if err := db.Raw(`SELECT count(*) FROM schema_migrations`).Scan(&after).Error; err != nil {
		t.Fatalf("count: %v", err)
	}

	if before != after {
		t.Fatalf("second run changed schema_migrations: %d -> %d", before, after)
	}
	if after != int64(len(migrations())) {
		t.Fatalf("expected %d applied migrations, got %d", len(migrations()), after)
	}
}

// Concurrent starters are the reason the advisory lock exists: without it two
// replicas race on CREATE TABLE and one dies with a duplicate pg_type error.
func TestIntegrationConcurrentMigrateIsSafe(t *testing.T) {
	db := integrationDB(t)
	dropSchema(t, db)

	const runners = 4
	var wg sync.WaitGroup
	errs := make([]error, runners)
	wg.Add(runners)
	for i := 0; i < runners; i++ {
		go func(i int) {
			defer wg.Done()
			errs[i] = Migrate(db)
		}(i)
	}
	wg.Wait()

	for i, err := range errs {
		if err != nil {
			t.Fatalf("runner %d failed: %v", i, err)
		}
	}

	var total, distinct int64
	if err := db.Raw(`SELECT count(*) FROM schema_migrations`).Scan(&total).Error; err != nil {
		t.Fatalf("count: %v", err)
	}
	if err := db.Raw(`SELECT count(DISTINCT version) FROM schema_migrations`).Scan(&distinct).Error; err != nil {
		t.Fatalf("count distinct: %v", err)
	}
	if total != distinct {
		t.Fatalf("duplicate rows in schema_migrations: total=%d distinct=%d", total, distinct)
	}
	if total != int64(len(migrations())) {
		t.Fatalf("expected %d rows, got %d", len(migrations()), total)
	}
}

// Verify must reject an empty database with an actionable message, because
// that is what a deploy with AUTO_MIGRATE=false and no release step produces.
func TestIntegrationVerifyRejectsEmptyDatabase(t *testing.T) {
	db := integrationDB(t)
	dropSchema(t, db)

	err := Verify(db)
	if err == nil {
		t.Fatal("expected Verify to fail on an empty database")
	}
	if !strings.Contains(err.Error(), "docker compose run --rm api migrate") {
		t.Fatalf("error message must tell the operator what to run, got: %v", err)
	}
}

// A database that already has the tables (the current production state) must
// record the baseline without re-running DDL over it.
func TestIntegrationBaselineNoOpOnExistingSchema(t *testing.T) {
	db := integrationDB(t)
	dropSchema(t, db)

	// Simulate an existing deployment: migrate once, then wipe the ledger so
	// the baseline looks unapplied against a populated schema.
	if err := Migrate(db); err != nil {
		t.Fatalf("seed migrate: %v", err)
	}
	if err := db.Exec(`DELETE FROM schema_migrations`).Error; err != nil {
		t.Fatalf("clear ledger: %v", err)
	}
	if err := db.Exec(`INSERT INTO users (id, email, created_at, updated_at) VALUES ('u1','a@b.c',now(),now())`).Error; err != nil {
		t.Fatalf("insert user: %v", err)
	}

	if err := Migrate(db); err != nil {
		t.Fatalf("re-migrate over existing schema: %v", err)
	}

	var users int64
	if err := db.Raw(`SELECT count(*) FROM users`).Scan(&users).Error; err != nil {
		t.Fatalf("count users: %v", err)
	}
	if users != 1 {
		t.Fatalf("baseline must not touch existing rows, found %d users", users)
	}
}
