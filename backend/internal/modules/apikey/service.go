package apikey

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jeremi16/resisst-api/internal/config"
	"github.com/jeremi16/resisst-api/internal/models"
	"github.com/jeremi16/resisst-api/internal/shared/middleware"
	"gorm.io/gorm"
)

var (
	ErrTooManyKeys      = errors.New("too many api keys")
	ErrNotFound         = errors.New("api key not found")
	ErrExpired          = errors.New("api key expired")
	ErrRevoked          = errors.New("api key revoked")
	ErrInvalidName      = errors.New("invalid name")
	ErrInvalidExpiry    = errors.New("invalid expiry")
)

type Service struct {
	db  *gorm.DB
	cfg *config.Config
}

func NewService(db *gorm.DB, cfg *config.Config) *Service {
	return &Service{db: db, cfg: cfg}
}

func hashKey(raw string) string {
	h := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(h[:])
}

func generateRawKey(cfg *config.Config) (raw string, prefix string, err error) {
	prefixStr := cfg.ApiKeyPrefix
	if prefixStr == "" {
		prefixStr = "rsk_"
	}
	// 32 random bytes -> ~43 chars base64url raw
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", "", err
	}
	encoded := base64.RawURLEncoding.EncodeToString(b)
	raw = prefixStr + encoded
	if len(raw) > 12 {
		prefix = raw[:12]
	} else {
		prefix = raw
	}
	return raw, prefix, nil
}

// Create creates a new API key for user, returns the raw key once.
func (s *Service) Create(ctx context.Context, userID string, name string, expiresInDays *int) (*models.ApiKey, string, error) {
	name = strings.TrimSpace(name)
	if name == "" || len(name) > 64 {
		return nil, "", ErrInvalidName
	}
	var count int64
	if err := s.db.WithContext(ctx).Model(&models.ApiKey{}).Where("user_id = ? AND revoked_at IS NULL", userID).Count(&count).Error; err != nil {
		return nil, "", err
	}
	max := s.cfg.ApiKeyMaxPerUser
	if max <= 0 {
		max = 5
	}
	if int(count) >= max {
		return nil, "", fmt.Errorf("%w: max %d", ErrTooManyKeys, max)
	}

	var expiresAt *time.Time
	if expiresInDays != nil {
		d := *expiresInDays
		if d <= 0 || d > 3650 {
			return nil, "", ErrInvalidExpiry
		}
		t := time.Now().UTC().Add(time.Duration(d) * 24 * time.Hour)
		expiresAt = &t
	}

	raw, prefix, err := generateRawKey(s.cfg)
	if err != nil {
		return nil, "", err
	}
	keyHash := hashKey(raw)

	record := &models.ApiKey{
		UserID:    userID,
		Name:      name,
		Prefix:    prefix,
		KeyHash:   keyHash,
		Scopes:    "[]",
		ExpiresAt: expiresAt,
	}
	if err := s.db.WithContext(ctx).Create(record).Error; err != nil {
		return nil, "", err
	}
	return record, raw, nil
}

func (s *Service) List(ctx context.Context, userID string) ([]models.ApiKey, error) {
	var keys []models.ApiKey
	if err := s.db.WithContext(ctx).Where("user_id = ?", userID).Order("created_at DESC").Find(&keys).Error; err != nil {
		return nil, err
	}
	return keys, nil
}

func (s *Service) Revoke(ctx context.Context, userID, keyID string) error {
	var key models.ApiKey
	if err := s.db.WithContext(ctx).Where("id = ? AND user_id = ?", keyID, userID).First(&key).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrNotFound
		}
		return err
	}
	if key.RevokedAt != nil {
		return nil // already revoked
	}
	now := time.Now().UTC()
	return s.db.WithContext(ctx).Model(&models.ApiKey{}).Where("id = ?", keyID).Update("revoked_at", now).Error
}

// ValidateApiKey implements middleware.ApiKeyValidator — returns AccessClaims for user.
func (s *Service) ValidateApiKey(raw string) (*middleware.AccessClaims, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, ErrNotFound
	}
	h := hashKey(raw)
	var key models.ApiKey
	if err := s.db.Where("key_hash = ?", h).First(&key).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if key.RevokedAt != nil {
		return nil, ErrRevoked
	}
	if key.ExpiresAt != nil && time.Now().UTC().After(*key.ExpiresAt) {
		return nil, ErrExpired
	}
	var user models.User
	if err := s.db.Where("id = ?", key.UserID).First(&user).Error; err != nil {
		return nil, ErrNotFound
	}
	// async update last_used_at (best effort, don't block)
	go func(id string) {
		now := time.Now().UTC()
		_ = s.db.Model(&models.ApiKey{}).Where("id = ?", id).Update("last_used_at", now).Error
	}(key.ID)

	claims := &middleware.AccessClaims{
		Email: user.Email,
		Name:  user.Name,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject: user.ID,
		},
	}
	return claims, nil
}
