package models

import "time"

type Event struct {
	ID              string `gorm:"primaryKey;size:36"`
	UserID          string `gorm:"index;not null;uniqueIndex:idx_user_sync_key"`
	Title           string
	Course          *string
	CourseID        *string `gorm:"index"`
	ClassCode       *string `gorm:"column:class_code"`
	Description     *string
	URL             *string
	Deadline        time.Time `gorm:"index"`
	Source          string    `gorm:"index;default:moodle"`
	SourceID        *string
	SyncKey         string `gorm:"not null;uniqueIndex:idx_user_sync_key"`
	Reminder24HSent bool   `gorm:"column:reminder_24h_sent"`
	RemindersSent   string
	CreatedAt       time.Time
	UpdatedAt       time.Time
	Completed       bool       `gorm:"column:completed;default:false"`
	CompletedAt     *time.Time `gorm:"column:completed_at"`
}
