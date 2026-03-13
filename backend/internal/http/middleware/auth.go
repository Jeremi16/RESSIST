package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jeremi16/resisst-api/internal/auth"
)

const claimsContextKey = "access_claims"

func AccessToken(tokenSvc *auth.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing bearer token"})
			return
		}

		rawToken := strings.TrimSpace(strings.TrimPrefix(header, "Bearer "))
		claims, err := tokenSvc.ParseAccessToken(rawToken)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid access token"})
			return
		}

		c.Set(claimsContextKey, claims)
		c.Next()
	}
}

func GetAccessClaims(c *gin.Context) (*auth.AccessClaims, bool) {
	claimsValue, ok := c.Get(claimsContextKey)
	if !ok {
		return nil, false
	}
	claims, ok := claimsValue.(*auth.AccessClaims)
	return claims, ok
}
