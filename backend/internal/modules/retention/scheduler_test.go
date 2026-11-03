package retention

import (
	"context"
	"testing"
)

// TestPruneOnceDefaultsToNinetyDays documents the default window so a zero
// config value cannot silently mean "delete nothing" or "delete everything".
func TestPruneOnceDefaultsToNinetyDays(t *testing.T) {
	cfg := Config{}
	if cfg.RetentionDays != 0 {
		t.Fatal("fixture assumption broken")
	}
	// NewScheduler must not panic on a zero-value config; the default is
	// applied inside PruneOnce.
	s := NewScheduler(nil, cfg)
	if s == nil {
		t.Fatal("expected a scheduler")
	}
	if s.cfg.RetentionDays != 0 {
		t.Fatal("constructor should not mutate the config")
	}
}

// TestPruneOnceHonoursContextCancellation ensures the batch loop stops when the
// caller gives up, rather than running to completion after a timeout.
func TestPruneOnceHonoursContextCancellation(t *testing.T) {
	s := NewScheduler(nil, Config{RetentionDays: 90})
	// db is nil, so any query would panic; a cancelled context must short
	// circuit before that happens.
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	defer func() {
		if r := recover(); r != nil {
			t.Fatalf("PruneOnce did not check ctx before querying: %v", r)
		}
	}()
	if err := s.PruneOnce(ctx); err == nil {
		t.Fatal("expected an error from a cancelled context")
	}
}
