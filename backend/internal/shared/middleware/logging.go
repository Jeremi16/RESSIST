package middleware

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gin-gonic/gin"
)

type accessLogEntry struct {
	Timestamp string `json:"timestamp"`
	Level     string `json:"level"`
	RequestID string `json:"request_id,omitempty"`
	Method    string `json:"method"`
	Path      string `json:"path"`
	Status    int    `json:"status"`
	LatencyMS int64  `json:"latency_ms"`
	ClientIP  string `json:"client_ip"`
	UserAgent string `json:"user_agent,omitempty"`
	Error     string `json:"error,omitempty"`
}

func JSONAccessLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()

		path := c.FullPath()
		if path == "" {
			path = c.Request.URL.Path
		}

		status := c.Writer.Status()
		entry := accessLogEntry{
			Timestamp: time.Now().UTC().Format(time.RFC3339Nano),
			Level:     logLevelForStatus(status),
			RequestID: GetRequestID(c),
			Method:    c.Request.Method,
			Path:      path,
			Status:    status,
			LatencyMS: time.Since(start).Milliseconds(),
			ClientIP:  c.ClientIP(),
			UserAgent: c.Request.UserAgent(),
			Error:     c.Errors.ByType(gin.ErrorTypePrivate).String(),
		}

		payload, err := json.Marshal(entry)
		if err != nil {
			log.Printf(`{"timestamp":"%s","level":"error","message":"failed to marshal access log"}`, time.Now().UTC().Format(time.RFC3339Nano))
			return
		}
		log.Println(string(payload))
	}
}

func logLevelForStatus(status int) string {
	if status >= 500 {
		return "error"
	}
	if status >= 400 {
		return "warn"
	}
	return "info"
}
