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

type ApiKeyValidator interface {
	ValidateApiKey(raw string) (*AccessClaims, error)
}

const claimsContextKey = "access_claims"
const apiKeyContextKey = "api_key_id"

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

func GetApiKeyID(c *gin.Context) (string, bool) {
	v, ok := c.Get(apiKeyContextKey)
	if !ok {
		return "", false
	}
	s, ok := v.(string)
	return s, ok
}

// APIKeyOrJWT tries X-API-Key / Authorization: ApiKey first, then falls back to Bearer JWT.
// This allows external programmatic access without opening the website.
func APIKeyOrJWT(parser TokenParser, validator ApiKeyValidator) gin.HandlerFunc {
	return func(c *gin.Context) {
		rawApiKey := strings.TrimSpace(c.GetHeader("X-API-Key"))
		if rawApiKey == "" {
			auth := c.GetHeader("Authorization")
			if strings.HasPrefix(auth, "ApiKey ") {
				rawApiKey = strings.TrimSpace(strings.TrimPrefix(auth, "ApiKey "))
			} else if strings.HasPrefix(auth, "apikey ") {
				rawApiKey = strings.TrimSpace(strings.TrimPrefix(auth, "apikey "))
			}
		}
		if rawApiKey != "" {
			claims, err := validator.ValidateApiKey(rawApiKey)
			if err != nil {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid api key"})
				return
			}
			// validator already set claims via returned value; set here
			c.Set(claimsContextKey, claims)
			// api key id is embedded in claims Subject prefix? validator may set via context
			// We extract from claims if needed, but allow validator to set api_key_id via context
			c.Next()
			return
		}
		// fallback to JWT Bearer
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

func AuthenticatedUserID(c *gin.Context) (string, bool) {
	claims, ok := GetAccessClaims(c)
	if !ok || strings.TrimSpace(claims.Subject) == "" {
		return "", false
	}
	return claims.Subject, true
}
