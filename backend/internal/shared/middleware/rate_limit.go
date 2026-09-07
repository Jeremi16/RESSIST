package middleware

import (
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

type visitor struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

type ipRateLimiter struct {
	mu          sync.Mutex
	visitors    map[string]*visitor
	limit       rate.Limit
	burst       int
	ttl         time.Duration
	lastCleanup time.Time
}

func newIPRateLimiter(limit rate.Limit, burst int, ttl time.Duration) *ipRateLimiter {
	return &ipRateLimiter{
		visitors:    make(map[string]*visitor),
		limit:       limit,
		burst:       burst,
		ttl:         ttl,
		lastCleanup: time.Now(),
	}
}

func (l *ipRateLimiter) allow(ip string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	if now.Sub(l.lastCleanup) >= l.ttl {
		for key, v := range l.visitors {
			if now.Sub(v.lastSeen) > l.ttl {
				delete(l.visitors, key)
			}
		}
		l.lastCleanup = now
	}

	v, ok := l.visitors[ip]
	if !ok {
		v = &visitor{
			limiter:  rate.NewLimiter(l.limit, l.burst),
			lastSeen: now,
		}
		l.visitors[ip] = v
	}
	v.lastSeen = now

	return v.limiter.Allow()
}

func AuthRateLimit(perMinute int, burst int) gin.HandlerFunc {
	if perMinute <= 0 {
		perMinute = 30
	}
	if burst <= 0 {
		burst = 10
	}

	limiter := newIPRateLimiter(rate.Every(time.Minute/time.Duration(perMinute)), burst, 15*time.Minute)

	return func(c *gin.Context) {
		if limiter.allow(c.ClientIP()) {
			c.Next()
			return
		}

		c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
			"error":      "too many requests",
			"request_id": GetRequestID(c),
		})
	}
}

func ApiKeyRateLimit(perMinute int, burst int) gin.HandlerFunc {
	if perMinute <= 0 {
		perMinute = 60
	}
	if burst <= 0 {
		burst = 20
	}
	limiter := newIPRateLimiter(rate.Every(time.Minute/time.Duration(perMinute)), burst, 15*time.Minute)

	return func(c *gin.Context) {
		// Prefer per-key bucket if API key present, else IP
		key := c.GetHeader("X-API-Key")
		if key == "" {
			auth := c.GetHeader("Authorization")
			if strings.HasPrefix(auth, "ApiKey ") {
				key = strings.TrimSpace(strings.TrimPrefix(auth, "ApiKey "))
			} else if strings.HasPrefix(auth, "apikey ") {
				key = strings.TrimSpace(strings.TrimPrefix(auth, "apikey "))
			}
		}
		bucket := c.ClientIP()
		if key != "" {
			// use prefix to group (avoid storing raw in map key hash)
			if len(key) > 12 {
				bucket = "apikey:" + key[:12]
			} else {
				bucket = "apikey:" + key
			}
		}
		if limiter.allow(bucket) {
			c.Next()
			return
		}
		c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
			"error":      "too many requests",
			"request_id": GetRequestID(c),
		})
	}
}
