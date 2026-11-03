package user

import (
	"strings"
	"testing"
)

// TestGenerateAlphanumericCodeUsesFullLength pins the entropy increase: the code
// was 6 characters (30 bits), now 8 (40 bits).
func TestGenerateAlphanumericCodeUsesFullLength(t *testing.T) {
	code, err := generateAlphanumericCode(verifyCodeLength)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(code) != verifyCodeLength {
		t.Fatalf("length = %d, want %d", len(code), verifyCodeLength)
	}
	if verifyCodeLength != 8 {
		t.Fatalf("verifyCodeLength = %d, want 8 (40 bits of entropy)", verifyCodeLength)
	}
}

// TestGenerateAlphanumericCodeUsesAllowedAlphabet ensures the code only contains
// symbols that are unambiguous when read aloud or retyped.
func TestGenerateAlphanumericCodeUsesAllowedAlphabet(t *testing.T) {
	for i := 0; i < 200; i++ {
		code, err := generateAlphanumericCode(verifyCodeLength)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		for _, r := range code {
			if !strings.ContainsRune(verifyCodeAlphabet, r) {
				t.Fatalf("character %q is not in the allowed alphabet", r)
			}
		}
		// Confusable characters must never appear.
		for _, bad := range []string{"I", "O", "0", "1"} {
			if strings.Contains(code, bad) {
				t.Fatalf("code %q contains confusable character %q", code, bad)
			}
		}
	}
}

// TestGenerateAlphanumericCodeIsNotTriviallyRepeating is a cheap sanity check
// that successive calls do not return the same value.
func TestGenerateAlphanumericCodeIsNotTriviallyRepeating(t *testing.T) {
	seen := make(map[string]struct{}, 50)
	for i := 0; i < 50; i++ {
		code, err := generateAlphanumericCode(verifyCodeLength)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if _, dup := seen[code]; dup {
			t.Fatalf("duplicate code generated: %q", code)
		}
		seen[code] = struct{}{}
	}
}

func TestGenerateAlphanumericCodeDefaultsLength(t *testing.T) {
	code, err := generateAlphanumericCode(0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(code) != verifyCodeLength {
		t.Fatalf("length = %d, want default %d", len(code), verifyCodeLength)
	}
}
