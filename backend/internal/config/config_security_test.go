package config

import (
	"testing"
)

func TestLoadRejectsInvalidTrustedProxies(t *testing.T) {
	t.Setenv("TRUSTED_PROXIES", "10.0.0.0/8,not-a-cidr")
	if _, err := Load(); err == nil {
		t.Fatal("expected Load to fail on an invalid TRUSTED_PROXIES entry")
	}
}

func TestLoadAcceptsValidTrustedProxies(t *testing.T) {
	t.Setenv("TRUSTED_PROXIES", "10.0.0.0/8, 172.17.0.0/16")
	cfg, err := Load()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(cfg.TrustedProxies) != 2 {
		t.Fatalf("expected 2 proxies, got %d (%v)", len(cfg.TrustedProxies), cfg.TrustedProxies)
	}
}

func TestLoadDefaultsTrustedProxiesToEmpty(t *testing.T) {
	t.Setenv("TRUSTED_PROXIES", "")
	cfg, err := Load()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(cfg.TrustedProxies) != 0 {
		t.Fatalf("expected no trusted proxies by default, got %v", cfg.TrustedProxies)
	}
}

// TestRateLimitDefaultsAreSane guards against a zero value silently disabling a
// limiter (the middleware falls back to its own default, but config should be
// explicit).
func TestRateLimitDefaultsAreSane(t *testing.T) {
	t.Setenv("PREAUTH_RATE_LIMIT_PER_MINUTE", "")
	t.Setenv("SYNC_RATE_LIMIT_PER_MINUTE", "")
	t.Setenv("TELEGRAM_TEST_RATE_LIMIT_PER_MINUTE", "")
	cfg, err := Load()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.PreAuthRateLimitPerMinute <= 0 {
		t.Fatal("PREAUTH_RATE_LIMIT_PER_MINUTE default must be positive")
	}
	if cfg.SyncRateLimitPerMinute <= 0 {
		t.Fatal("SYNC_RATE_LIMIT_PER_MINUTE default must be positive")
	}
	if cfg.TelegramTestRateLimitPerMinute <= 0 {
		t.Fatal("TELEGRAM_TEST_RATE_LIMIT_PER_MINUTE default must be positive")
	}
}

func TestApiKeyDefaultExpiryIsBounded(t *testing.T) {
	t.Setenv("API_KEY_DEFAULT_EXPIRY_DAYS", "")
	cfg, err := Load()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.ApiKeyDefaultExpiryDays <= 0 {
		t.Fatal("API keys must have a default expiry")
	}
	if cfg.ApiKeyDefaultExpiryDays > 365 {
		t.Fatalf("default expiry %d exceeds the 365-day ceiling", cfg.ApiKeyDefaultExpiryDays)
	}
}
