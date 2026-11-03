package calendar

import (
	"testing"
	"time"

	"github.com/jeremi16/ressist-api/internal/models"
)

func ptrTime(t time.Time) *time.Time { return &t }

// TestCooldownRemainingUsesLMSLastSyncedAt pins the field the cooldown is
// enforced against. calculateNextRefreshAt advertises LMSLastSyncedAt +
// syncCooldown to clients as nextRefreshAt; if enforcement read a different
// field the header would be a lie.
func TestCooldownRemainingUsesLMSLastSyncedAt(t *testing.T) {
	h := &Handler{}

	t.Run("never synced", func(t *testing.T) {
		u := &models.User{}
		if _, cooling := h.cooldownRemaining(u); cooling {
			t.Fatal("a user who never synced must not be cooling down")
		}
	})

	t.Run("just synced", func(t *testing.T) {
		now := time.Now().UTC()
		u := &models.User{LMSLastSyncedAt: ptrTime(now)}
		remaining, cooling := h.cooldownRemaining(u)
		if !cooling {
			t.Fatal("expected an active cooldown right after syncing")
		}
		if remaining <= 0 || remaining > syncCooldown {
			t.Fatalf("remaining = %v, want (0, %v]", remaining, syncCooldown)
		}
	})

	t.Run("synced longer ago than cooldown", func(t *testing.T) {
		old := time.Now().UTC().Add(-2 * syncCooldown)
		u := &models.User{LMSLastSyncedAt: ptrTime(old)}
		if _, cooling := h.cooldownRemaining(u); cooling {
			t.Fatal("expected no cooldown after the window elapsed")
		}
	})

	t.Run("nil user", func(t *testing.T) {
		if _, cooling := h.cooldownRemaining(nil); cooling {
			t.Fatal("nil user must not be cooling down")
		}
	})
}

// TestCalculateNextRefreshAtMatchesCooldown keeps the advertised value and the
// enforced value in agreement.
func TestCalculateNextRefreshAtMatchesCooldown(t *testing.T) {
	h := &Handler{}
	syncedAt := time.Now().UTC().Add(-10 * time.Minute)
	u := &models.User{LMSLastSyncedAt: ptrTime(syncedAt)}

	next := h.calculateNextRefreshAt(u)
	if next == nil {
		t.Fatal("expected a nextRefreshAt value")
	}
	if want := syncedAt.Add(syncCooldown); !next.Equal(want) {
		t.Fatalf("nextRefreshAt = %v, want %v", next, want)
	}

	remaining, cooling := h.cooldownRemaining(u)
	if !cooling {
		t.Fatal("expected active cooldown")
	}
	// remaining should be ~ next - now.
	if diff := time.Until(*next); (remaining - diff).Abs() > time.Second {
		t.Fatalf("remaining %v disagrees with nextRefreshAt %v", remaining, diff)
	}
}

func TestCalculateNextRefreshAtNilWhenNeverSynced(t *testing.T) {
	h := &Handler{}
	if got := h.calculateNextRefreshAt(&models.User{}); got != nil {
		t.Fatalf("expected nil, got %v", got)
	}
}
