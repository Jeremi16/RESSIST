package middleware

import (
	"crypto/subtle"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

const botContextKey = "bot_service"

// RequireBotService allows only the standalone ressist-bot service.
// Client must send X-Bot-Token: <BOT_SERVICE_TOKEN>.
func RequireBotService(botToken string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if strings.TrimSpace(botToken) == "" {
			c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{"error": "bot integration disabled"})
			return
		}
		got := strings.TrimSpace(c.GetHeader("X-Bot-Token"))
		if !botTokenMatches(got, botToken) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid bot token"})
			return
		}
		c.Set(botContextKey, true)
		// If the bot impersonates a user, expose it as claims so existing
		// AuthenticatedUserID(c) keeps working without handler changes.
		if actAs := strings.TrimSpace(c.GetHeader("X-Act-As-User")); actAs != "" {
			setBotActAs(c, actAs)
		}
		c.Next()
	}
}

// IsBotService reports whether the request was authenticated via RequireBotService.
func IsBotService(c *gin.Context) bool {
	v, ok := c.Get(botContextKey)
	if !ok {
		return false
	}
	b, _ := v.(bool)
	return b
}

// BotOrAPIKeyOrJWT accepts (in order):
//  1. X-Bot-Token (+ optional X-Act-As-User) for ressist-bot service calls
//  2. X-API-Key / Authorization: ApiKey for programmatic access
//  3. Bearer JWT for website users
func BotOrAPIKeyOrJWT(parser TokenParser, validator ApiKeyValidator, botToken string) gin.HandlerFunc {
	apiKeyOrJWT := APIKeyOrJWT(parser, validator)
	return func(c *gin.Context) {
		if strings.TrimSpace(botToken) != "" {
			if got := strings.TrimSpace(c.GetHeader("X-Bot-Token")); botTokenMatches(got, botToken) {
				c.Set(botContextKey, true)
				if actAs := strings.TrimSpace(c.GetHeader("X-Act-As-User")); actAs != "" {
					setBotActAs(c, actAs)
					c.Next()
					return
				}
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing X-Act-As-User"})
				return
			}
		}
		apiKeyOrJWT(c)
	}
}

// BotOrAccessToken accepts X-Bot-Token (+ X-Act-As-User) or Bearer JWT.
// Used for write endpoints like POST /v1/assignments/complete.
func BotOrAccessToken(parser TokenParser, botToken string) gin.HandlerFunc {
	access := AccessToken(parser)
	return func(c *gin.Context) {
		if strings.TrimSpace(botToken) != "" {
			if got := strings.TrimSpace(c.GetHeader("X-Bot-Token")); botTokenMatches(got, botToken) {
				c.Set(botContextKey, true)
				if actAs := strings.TrimSpace(c.GetHeader("X-Act-As-User")); actAs != "" {
					setBotActAs(c, actAs)
					c.Next()
					return
				}
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing X-Act-As-User"})
				return
			}
		}
		access(c)
	}
}

// botTokenMatches compares tokens in constant time to avoid timing leaks.
func botTokenMatches(got, want string) bool {
	if got == "" || want == "" {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(got), []byte(want)) == 1
}

// setBotActAs exposes the impersonated user as claims and audits the call.
func setBotActAs(c *gin.Context, userID string) {
	log.Printf("bot act-as user=%s %s %s", userID, c.Request.Method, c.FullPath())
	c.Set(claimsContextKey, &AccessClaims{
		RegisteredClaims: jwt.RegisteredClaims{Subject: userID},
	})
}
