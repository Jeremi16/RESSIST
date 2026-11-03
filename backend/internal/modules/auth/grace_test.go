package auth

import (
	"testing"
	"time"

	"github.com/jeremi16/ressist-api/internal/models"
)

// TestGraceEligibleOnlyForRotation is the regression test for lead #6: the
// grace window previously applied to ANY revoked token, so a token revoked by
// logout (or by an earlier reuse detection) could be exchanged for a fresh
// session simply by presenting it within the window.
func TestGraceEligibleOnlyForRotation(t *testing.T) {
	tests := []struct {
		reason string
		want   bool
	}{
		{RevokeReasonRotated, true},
		{RevokeReasonLogout, false},
		{RevokeReasonReuse, false},
		{RevokeReasonExpired, false},
		// Legacy rows predate the column. We cannot prove they were benign
		// rotations, so they must not receive grace (fail closed).
		{"", false},
	}

	for _, tc := range tests {
		t.Run("reason="+tc.reason, func(t *testing.T) {
			tok := &models.RefreshToken{
				RevokedAt:     ptrTime(time.Now().UTC()),
				RevokedReason: tc.reason,
			}
			if got := graceEligible(tok); got != tc.want {
				t.Fatalf("graceEligible(%q) = %v, want %v", tc.reason, got, tc.want)
			}
		})
	}
}

// TestReuseGraceDefaultIsThirtySeconds pins the code default. The .env.example
// previously advertised 300 while the code used 30, which meant operators
// reasoned about a window five times larger than the one actually enforced.
func TestReuseGraceDefaultIsThirtySeconds(t *testing.T) {
	s := &Service{cfg: nil}
	if got := s.reuseGrace(); got != 30*time.Second {
		t.Fatalf("reuseGrace() with nil cfg = %v, want 30s", got)
	}
}

func ptrTime(t time.Time) *time.Time { return &t }
