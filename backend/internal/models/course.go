package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Course struct {
	ID        string `gorm:"primaryKey;size:36"`
	Name      string `gorm:"uniqueIndex;not null"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

func (c *Course) BeforeCreate(_ *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.NewString()
	}
	return nil
}
