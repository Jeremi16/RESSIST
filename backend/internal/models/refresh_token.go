package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type RefreshToken struct {
	ID        string     `gorm:"primaryKey;size:36"`
	UserID    string     `gorm:"index;not null"`
	TokenHash string     `gorm:"uniqueIndex;not null"`
	ExpiresAt time.Time  `gorm:"index;not null"`
	RevokedAt *time.Time `gorm:"index"`
	// Client distinguishes web (cookie/BFF) vs mobile (native/KMP).
	// Values: "web" (default) or "mobile". Used to apply per-client TTL on rotation.
	Client    string `gorm:"size:16;not null;default:web;index"`
	UserAgent string
	IPAddress string
	CreatedAt time.Time
	UpdatedAt time.Time

	User User `gorm:"foreignKey:UserID"`
}

func (t *RefreshToken) BeforeCreate(_ *gorm.DB) error {
	if t.ID == "" {
		t.ID = uuid.NewString()
	}
	if t.Client == "" {
		t.Client = "web"
	}
	return nil
}
