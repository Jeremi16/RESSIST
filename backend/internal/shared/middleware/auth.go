package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type AccessClaims struct {
	Email string `json:"email"`
	Name  string `json:"name"`
	jwt.RegisteredClaims
}

type TokenParser interface {
	ParseAccessToken(raw string) (*AccessClaims, error)
}

const claimsContextKey = "access_claims"

func AccessToken(parser TokenParser) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing bearer token"})
			return
		}
		rawToken := strings.TrimSpace(strings.TrimPrefix(header, "Bearer "))
		claims, err := parser.ParseAccessToken(rawToken)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid access token"})
			return
		}
		c.Set(claimsContextKey, claims)
		c.Next()
	}
}

func GetAccessClaims(c *gin.Context) (*AccessClaims, bool) {
	claimsValue, ok := c.Get(claimsContextKey)
	if !ok {
		return nil, false
	}
	claims, ok := claimsValue.(*AccessClaims)
	return claims, ok
}

func AuthenticatedUserID(c *gin.Context) (string, bool) {
	claims, ok := GetAccessClaims(c)
	if !ok || strings.TrimSpace(claims.Subject) == "" {
		return "", false
	}
	return claims.Subject, true
}
