package database

import (
	"testing"

	"gorm.io/gorm"
)

// The migration catalogue is the only record of what has been applied to a
// production database. A duplicate or out-of-order version would be skipped
// silently or applied twice, so these invariants are enforced by test rather
// than left to review.

func TestMigrationCatalogueIsWellFormed(t *testing.T) {
	all := migrations()
	if len(all) == 0 {
		t.Fatal("migration catalogue is empty")
	}
	if err := validateMigrations(all); err != nil {
		t.Fatalf("catalogue is invalid: %v", err)
	}
}

func TestMigrationVersionsAreStrictlyIncreasing(t *testing.T) {
	all := migrations()
	for i := 1; i < len(all); i++ {
		if all[i].Version <= all[i-1].Version {
			t.Fatalf("migration versions must increase: %04d (%s) follows %04d (%s)",
				all[i].Version, all[i].Name, all[i-1].Version, all[i-1].Name)
		}
	}
}

func TestMigrationNamesAreUnique(t *testing.T) {
	seen := map[string]int{}
	for _, m := range migrations() {
		if prev, ok := seen[m.Name]; ok {
			t.Fatalf("duplicate migration name %q (versions %d and %d)", m.Name, prev, m.Version)
		}
		seen[m.Name] = m.Version
	}
}

// Versions must never be reused or renumbered. 1..6 are already applied on the
// deployment database; inserting a step in the middle would make existing
// databases skip it forever, because a recorded version is never re-run.
func TestMigrationVersionsStartAtOneAndAreContiguous(t *testing.T) {
	all := migrations()
	for i, m := range all {
		want := i + 1
		if m.Version != want {
			t.Fatalf("expected contiguous versions starting at 1; position %d has version %d (%s) — append new migrations instead of renumbering", i, m.Version, m.Name)
		}
	}
}

func TestPendingMigrationsSkipsApplied(t *testing.T) {
	all := migrations()
	applied := map[int]bool{all[0].Version: true}

	pending := pendingMigrations(all, applied)
	if len(pending) != len(all)-1 {
		t.Fatalf("expected %d pending, got %d", len(all)-1, len(pending))
	}
	for _, m := range pending {
		if applied[m.Version] {
			t.Fatalf("migration %04d was already applied but is still pending", m.Version)
		}
	}
}

func TestPendingMigrationsIsOrdered(t *testing.T) {
	pending := pendingMigrations(migrations(), map[int]bool{})
	for i := 1; i < len(pending); i++ {
		if pending[i].Version < pending[i-1].Version {
			t.Fatalf("pending migrations are not ordered: %d before %d", pending[i-1].Version, pending[i].Version)
		}
	}
}

func TestPendingMigrationsAllAppliedIsEmpty(t *testing.T) {
	all := migrations()
	applied := make(map[int]bool, len(all))
	for _, m := range all {
		applied[m.Version] = true
	}
	if pending := pendingMigrations(all, applied); len(pending) != 0 {
		t.Fatalf("expected no pending migrations, got %d", len(pending))
	}
}

func TestValidateRejectsMalformedCatalogue(t *testing.T) {
	noop := func(*gorm.DB) error { return nil }

	cases := []struct {
		name string
		all  []Migration
	}{
		{"zero version", []Migration{{Version: 0, Name: "x", Up: noop}}},
		{"negative version", []Migration{{Version: -1, Name: "x", Up: noop}}},
		{"empty name", []Migration{{Version: 1, Name: "", Up: noop}}},
		{"nil up", []Migration{{Version: 1, Name: "x"}}},
		{"duplicate version", []Migration{{Version: 1, Name: "a", Up: noop}, {Version: 1, Name: "b", Up: noop}}},
	}
	for _, c := range cases {
		if err := validateMigrations(c.all); err == nil {
			t.Fatalf("%s: expected an error, got nil", c.name)
		}
	}
}

func TestValidateAcceptsValidCatalogue(t *testing.T) {
	noop := func(*gorm.DB) error { return nil }
	if err := validateMigrations([]Migration{
		{Version: 1, Name: "a", Up: noop},
		{Version: 2, Name: "b", Up: noop},
	}); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

// The telegram index must stay tolerant: a database with duplicate bindings
// cannot create it, and that must warn instead of blocking startup.
func TestTelegramUniqueIndexIsTolerant(t *testing.T) {
	var found bool
	for _, m := range migrations() {
		if m.Name == "users_telegram_chat_id_unique" {
			found = true
			if !m.Tolerant {
				t.Fatal("telegram unique index must be Tolerant: duplicates must not prevent the API from starting")
			}
		}
	}
	if !found {
		t.Fatal("migration users_telegram_chat_id_unique is missing")
	}
}

// Every column Verify requires must be created by a migration, otherwise a
// correctly-migrated database would still fail the startup gate.
func TestVerifyRequiredColumnsAreCreatedByMigrations(t *testing.T) {
	// Columns Verify insists on, each owned by the migration that adds it.
	owned := map[string]string{
		"refresh_tokens.session_started_at": "refresh_tokens_session_started_at",
		"refresh_tokens.revoked_reason":     "refresh_tokens_revoked_reason",
		"users.sync_claimed_until":          "users_sync_claimed_until",
	}
	names := map[string]bool{}
	for _, m := range migrations() {
		names[m.Name] = true
	}
	for column, migration := range owned {
		if !names[migration] {
			t.Fatalf("Verify requires %s but migration %q does not exist", column, migration)
		}
	}
}
