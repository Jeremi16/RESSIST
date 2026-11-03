package botservice

import (
	"testing"
	"time"
)

// TestVerifyAttemptLimiterLocksAfterThreshold covers the missing attempt
// counter: before this, a wrong code returned 404 without costing anything, so
// the code space could be swept silently.
func TestVerifyAttemptLimiterLocksAfterThreshold(t *testing.T) {
	l := &verifyAttemptLimiter{entries: make(map[string]*attemptEntry)}
	now := time.Now()

	for i := 0; i < maxTelegramAttempts-1; i++ {
		if lock := l.fail("chat-1", now); lock != 0 {
			t.Fatalf("attempt %d: unexpected lockout", i+1)
		}
		if ok, _ := l.allow("chat-1", now); !ok {
			t.Fatalf("attempt %d: should still be allowed", i+1)
		}
	}

	// The threshold attempt triggers the lockout.
	if lock := l.fail("chat-1", now); lock == 0 {
		t.Fatalf("attempt %d should trigger a lockout", maxTelegramAttempts)
	}

	ok, wait := l.allow("chat-1", now)
	if ok {
		t.Fatal("chat must be blocked once locked out")
	}
	if wait <= 0 || wait > telegramAttemptWindow {
		t.Fatalf("wait = %v, want (0, %v]", wait, telegramAttemptWindow)
	}
}

// TestVerifyAttemptLimiterIsolatesChats ensures one chat's failures do not lock
// out another.
func TestVerifyAttemptLimiterIsolatesChats(t *testing.T) {
	l := &verifyAttemptLimiter{entries: make(map[string]*attemptEntry)}
	now := time.Now()

	for i := 0; i < maxTelegramAttempts; i++ {
		l.fail("chat-bad", now)
	}
	if ok, _ := l.allow("chat-bad", now); ok {
		t.Fatal("chat-bad should be locked out")
	}
	if ok, _ := l.allow("chat-good", now); !ok {
		t.Fatal("chat-good must be unaffected")
	}
}

// TestVerifyAttemptLimiterExpires ensures the window does not block forever.
func TestVerifyAttemptLimiterExpires(t *testing.T) {
	l := &verifyAttemptLimiter{entries: make(map[string]*attemptEntry)}
	now := time.Now()

	for i := 0; i < maxTelegramAttempts; i++ {
		l.fail("chat-1", now)
	}
	later := now.Add(telegramAttemptWindow + time.Second)
	if ok, _ := l.allow("chat-1", later); !ok {
		t.Fatal("lockout must expire after the window")
	}
}

// TestVerifyAttemptLimiterResetOnSuccess makes sure a successful redemption
// clears prior failures for that chat.
func TestVerifyAttemptLimiterResetOnSuccess(t *testing.T) {
	l := &verifyAttemptLimiter{entries: make(map[string]*attemptEntry)}
	now := time.Now()

	for i := 0; i < maxTelegramAttempts-1; i++ {
		l.fail("chat-1", now)
	}
	l.reset("chat-1")
	if ok, _ := l.allow("chat-1", now); !ok {
		t.Fatal("reset chat must be allowed")
	}
}
