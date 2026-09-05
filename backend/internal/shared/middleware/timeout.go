package middleware

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

func TimeoutContext(seconds int) gin.HandlerFunc {
	timeout := time.Duration(seconds) * time.Second
	if timeout <= 0 {
		timeout = 15 * time.Second
	}

	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), timeout)
		defer cancel()

		c.Request = c.Request.WithContext(ctx)
		c.Next()

		if ctx.Err() == context.DeadlineExceeded && !c.Writer.Written() {
			c.AbortWithStatusJSON(http.StatusGatewayTimeout, gin.H{
				"error":      "request timeout",
				"request_id": GetRequestID(c),
			})
		}
	}
}
