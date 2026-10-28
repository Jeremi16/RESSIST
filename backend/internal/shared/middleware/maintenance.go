package middleware

import (
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

const defaultMaintenanceMessage = "RESSIST sedang dalam pemeliharaan. Silakan coba lagi beberapa saat lagi."

// MaintenanceActive reports whether MAINTENANCE_MODE is enabled.
func MaintenanceActive() bool {
	v := strings.ToLower(strings.TrimSpace(os.Getenv("MAINTENANCE_MODE")))
	return v == "true" || v == "1" || v == "on"
}

// MaintenanceMessage returns MAINTENANCE_MESSAGE or the default text.
func MaintenanceMessage() string {
	if m := strings.TrimSpace(os.Getenv("MAINTENANCE_MESSAGE")); m != "" {
		return m
	}
	return defaultMaintenanceMessage
}

// Maintenance answers 503 {"error":"maintenance"} for every route except the
// probes and metrics while MAINTENANCE_MODE is on, so clients can show a
// maintenance screen without the server being stopped.
func Maintenance() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !MaintenanceActive() {
			c.Next()
			return
		}
		switch c.Request.URL.Path {
		case "/livez", "/healthz", "/readyz", "/metrics":
			c.Next()
			return
		}
		if c.Request.Method == http.MethodOptions {
			c.Next()
			return
		}
		c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{
			"error":   "maintenance",
			"message": MaintenanceMessage(),
		})
	}
}
