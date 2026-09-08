package auth

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jeremi16/ressist-api/internal/models"
	"github.com/jeremi16/ressist-api/internal/shared/middleware"
)

type TokenService struct {
	secret   []byte
	ttl      time.Duration
	issuer   string
	audience string
}

func NewTokenService(secret string, ttlMinutes int, issuer string, audience string) (*TokenService, error) {
	if secret == "" {
		return nil, fmt.Errorf("JWT_ACCESS_SECRET is required")
	}
	if ttlMinutes <= 0 {
		ttlMinutes = 15
	}
	return &TokenService{
		secret:   []byte(secret),
		ttl:      time.Duration(ttlMinutes) * time.Minute,
		issuer:   issuer,
		audience: audience,
	}, nil
}

func (s *TokenService) GenerateAccessToken(user models.User) (string, time.Time, error) {
	now := time.Now().UTC()
	expiresAt := now.Add(s.ttl)
	claims := middleware.AccessClaims{
		Email: user.Email,
		Name:  user.Name,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.ID,
			Issuer:    s.issuer,
			Audience:  jwt.ClaimStrings{s.audience},
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(s.secret)
	if err != nil {
		return "", time.Time{}, err
	}
	return signed, expiresAt, nil
}

func (s *TokenService) ParseAccessToken(raw string) (*middleware.AccessClaims, error) {
	claims := &middleware.AccessClaims{}
	token, err := jwt.ParseWithClaims(
		raw,
		claims,
		func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method")
			}
			return s.secret, nil
		},
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer(s.issuer),
		jwt.WithAudience(s.audience),
		jwt.WithLeeway(30*time.Second),
	)
	if err != nil {
		return nil, err
	}
	if !token.Valid {
		return nil, fmt.Errorf("invalid access token")
	}
	return claims, nil
}
