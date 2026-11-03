package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func newTestEngine(handler gin.HandlerFunc) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	// Trust nobody: ClientIP() must come from RemoteAddr, not a header.
	_ = r.SetTrustedProxies(nil)
	r.Use(handler)
	r.GET("/t", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"ok": true}) })
	return r
}

// TestIPRateLimitIgnoresForwardedFor is the regression test for the old
// behaviour where a client could rotate X-Forwarded-For to get a fresh bucket
// per request.
func TestIPRateLimitIgnoresForwardedFor(t *testing.T) {
	// 2 requests/minute, burst 1.
	r := newTestEngine(IPRateLimit(2, 1))

	first := httptest.NewRecorder()
	req1 := httptest.NewRequest(http.MethodGet, "/t", nil)
	req1.RemoteAddr = "203.0.113.9:1111"
	req1.Header.Set("X-Forwarded-For", "1.1.1.1")
	r.ServeHTTP(first, req1)
	if first.Code != http.StatusOK {
		t.Fatalf("first request: got %d, want 200", first.Code)
	}

	// Same peer address, different spoofed header: must still be limited.
	second := httptest.NewRecorder()
	req2 := httptest.NewRequest(http.MethodGet, "/t", nil)
	req2.RemoteAddr = "203.0.113.9:2222"
	req2.Header.Set("X-Forwarded-For", "2.2.2.2")
	r.ServeHTTP(second, req2)
	if second.Code != http.StatusTooManyRequests {
		t.Fatalf("second request with rotated X-Forwarded-For: got %d, want 429", second.Code)
	}
}

// TestPrincipalRateLimitKeysOnUser verifies the bucket follows the
// authenticated principal, so rotating source addresses does not multiply the
// quota.
func TestPrincipalRateLimitKeysOnUser(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	_ = r.SetTrustedProxies(nil)
	r.Use(func(c *gin.Context) {
		if uid := c.GetHeader("X-Test-User"); uid != "" {
			c.Set(claimsContextKey, &AccessClaims{
				RegisteredClaims: jwt.RegisteredClaims{Subject: uid},
			})
		}
		c.Next()
	})
	r.Use(PrincipalRateLimit(2, 1))
	r.GET("/t", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"ok": true}) })

	// Two different IPs, same principal -> second is rejected.
	for i, ip := range []string{"203.0.113.1:1", "203.0.113.2:2"} {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/t", nil)
		req.RemoteAddr = ip
		req.Header.Set("X-Test-User", "user-1")
		r.ServeHTTP(w, req)
		if i == 0 && w.Code != http.StatusOK {
			t.Fatalf("first request: got %d", w.Code)
		}
		if i == 1 && w.Code != http.StatusTooManyRequests {
			t.Fatalf("second request from different IP for same principal: got %d, want 429", w.Code)
		}
	}
}

func TestRequestIDRejectsOversizedHeader(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(RequestID())
	r.GET("/t", func(c *gin.Context) {
		c.String(http.StatusOK, GetRequestID(c))
	})

	huge := make([]byte, 4096)
	for i := range huge {
		huge[i] = 'a'
	}
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/t", nil)
	req.Header.Set(requestIDHeader, string(huge))
	r.ServeHTTP(w, req)

	got := w.Body.String()
	if len(got) >= len(huge) {
		t.Fatalf("oversized request id was echoed back (len=%d)", len(got))
	}
	if len(got) == 0 {
		t.Fatal("expected a generated request id")
	}
}

func TestRequestIDAcceptsValidHeader(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(RequestID())
	r.GET("/t", func(c *gin.Context) { c.String(http.StatusOK, GetRequestID(c)) })

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/t", nil)
	req.Header.Set(requestIDHeader, "abc-123_XYZ")
	r.ServeHTTP(w, req)

	if w.Body.String() != "abc-123_XYZ" {
		t.Fatalf("got %q, want the caller's id preserved", w.Body.String())
	}
}

func TestBotTokenMatches(t *testing.T) {
	want := "s3cr3t-token-value"
	if !botTokenMatches(want, want) {
		t.Fatal("identical tokens must match")
	}
	if botTokenMatches("s3cr3t-token-valu", want) {
		t.Fatal("prefix of the correct token must not match")
	}
	if botTokenMatches("", want) {
		t.Fatal("empty token must not match")
	}
	if botTokenMatches(want, "") {
		t.Fatal("empty expected token must not match")
	}
}
