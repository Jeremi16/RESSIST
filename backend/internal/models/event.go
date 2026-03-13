package models

import "time"

type Event struct {
	ID              string `gorm:"primaryKey;size:36"`
	UserID          string `gorm:"index;not null"`
	Title           string
	Course          *string
	Deadline        time.Time `gorm:"index"`
	Source          string    `gorm:"index;default:moodle"`
	SourceID        *string
	SyncKey         string `gorm:"not null"`
	Reminder24HSent bool   `gorm:"column:reminder_24h_sent"`
	RemindersSent   string
	CreatedAt       time.Time
	UpdatedAt       time.Time
}
