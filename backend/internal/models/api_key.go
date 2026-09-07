package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ApiKey struct {
	ID         string     `gorm:"primaryKey;size:36"`
	UserID     string     `gorm:"index;not null"`
	Name       string     `gorm:"not null;size:64"`
	Prefix     string     `gorm:"size:16;index;not null"`
	KeyHash    string     `gorm:"uniqueIndex;not null;size:128"`
	Scopes     string     `gorm:"default:'[]'"`
	ExpiresAt  *time.Time `gorm:"index"`
	LastUsedAt *time.Time `gorm:"index"`
	RevokedAt  *time.Time `gorm:"index"`
	CreatedAt  time.Time
	UpdatedAt  time.Time

	User User `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
}

func (k *ApiKey) BeforeCreate(_ *gorm.DB) error {
	if k.ID == "" {
		k.ID = uuid.NewString()
	}
	return nil
}
