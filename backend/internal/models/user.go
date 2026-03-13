package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID            string `gorm:"primaryKey;size:36"`
	Email         string `gorm:"uniqueIndex;not null"`
	Name          string
	AvatarURL     string
	GoogleID      string `gorm:"uniqueIndex"`
	EmailVerified bool
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

func (u *User) BeforeCreate(_ *gorm.DB) error {
	if u.ID == "" {
		u.ID = uuid.NewString()
	}
	return nil
}
