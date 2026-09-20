package config

import (
	"reflect"
	"testing"
)

func TestSplitCorsOrigins_ProductionValue(t *testing.T) {
	raw := []string{
		"https://ressist.web.id",
		"app://localhost",
		"http://localhost",
		"https://localhost",
	}
	httpOrigins, customOrigins := SplitCorsOrigins(raw)

	wantHTTP := []string{"https://ressist.web.id", "http://localhost", "https://localhost"}
	if !reflect.DeepEqual(httpOrigins, wantHTTP) {
		t.Fatalf("httpOrigins = %v, want %v", httpOrigins, wantHTTP)
	}
	wantCustom := []string{"app://localhost"}
	if !reflect.DeepEqual(customOrigins, wantCustom) {
		t.Fatalf("customOrigins = %v, want %v", customOrigins, wantCustom)
	}
}

func TestSplitCorsOrigins_InvalidSkipped(t *testing.T) {
	raw := []string{
		"ressist.web.id",          // bare domain, no scheme
		"https://example.com/app", // path not allowed
		"*",                       // wildcard with credentials
		"   ",                     // blank
		"https://ok.example.com/",
	}
	httpOrigins, customOrigins := SplitCorsOrigins(raw)

	wantHTTP := []string{"https://ok.example.com"}
	if !reflect.DeepEqual(httpOrigins, wantHTTP) {
		t.Fatalf("httpOrigins = %v, want %v", httpOrigins, wantHTTP)
	}
	if len(customOrigins) != 0 {
		t.Fatalf("customOrigins = %v, want empty", customOrigins)
	}
}

func TestSplitCorsOrigins_EmptyFallsBack(t *testing.T) {
	httpOrigins, _ := SplitCorsOrigins(nil)
	if !reflect.DeepEqual(httpOrigins, []string{"http://localhost:3000"}) {
		t.Fatalf("httpOrigins = %v, want fallback", httpOrigins)
	}

	httpOrigins, _ = SplitCorsOrigins([]string{"bare-domain", "*"})
	if !reflect.DeepEqual(httpOrigins, []string{"http://localhost:3000"}) {
		t.Fatalf("httpOrigins = %v, want fallback", httpOrigins)
	}
}

func TestSplitCorsOrigins_Dedups(t *testing.T) {
	raw := []string{"https://a.example.com", "https://a.example.com/", "ionic://localhost", "ionic://localhost"}
	httpOrigins, customOrigins := SplitCorsOrigins(raw)
	if len(httpOrigins) != 1 || len(customOrigins) != 1 {
		t.Fatalf("got http=%v custom=%v, want 1 each", httpOrigins, customOrigins)
	}
}
