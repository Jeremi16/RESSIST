package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID                     string `gorm:"primaryKey;size:36"`
	Email                  string `gorm:"uniqueIndex;not null"`
	Name                   string
	AvatarURL              string  `gorm:"column:avatar_url"`
	GoogleID               string  `gorm:"column:google_id;uniqueIndex"`
	EmailVerified          bool    `gorm:"column:email_verified"`
	WhatsAppNumber         *string `gorm:"column:whatsapp_number"`
	WhatsAppEnabled        bool    `gorm:"column:whatsapp_enabled;default:true"`
	TelegramUsername       *string
	TelegramChatID         *string    `gorm:"column:telegram_chat_id"`
	TelegramEnabled        bool       `gorm:"column:telegram_enabled;default:true"`
	TelegramVerifyCode     *string    `gorm:"column:telegram_verify_code;index"`
	TelegramVerifyExpires  *time.Time `gorm:"column:telegram_verify_expires"`
	MoodleEnabled          bool       `gorm:"column:moodle_enabled;default:false"`
	MoodleCalendarURL      *string    `gorm:"column:moodle_calendar_url"`
	GoogleClassroomEnabled bool       `gorm:"column:google_classroom_enabled;default:false"`
	GoogleAccessToken      *string    `gorm:"column:google_access_token"`
	GoogleRefreshToken     *string    `gorm:"column:google_refresh_token"`
	GoogleTokenExpiry      *time.Time `gorm:"column:google_token_expiry"`
	ReminderHours          string     `gorm:"column:reminder_hours;default:'[24,12,6,1]'"`
	MorningBriefing        bool       `gorm:"column:morning_briefing;default:false"`
	MutedCourses           string     `gorm:"column:muted_courses;default:'[]'"`
	CourseAliases          string     `gorm:"column:course_aliases;default:'{}'"`
	CourseKeywordFilters   string     `gorm:"column:course_keyword_filters;default:'{}'"`
	CourseClassFilters     string     `gorm:"column:course_class_filters;default:'{}'"`
	ClassCode              *string    `gorm:"column:class_code"`
	AvailableClassCodes    string     `gorm:"column:available_class_codes;default:'[]'"`
	LMSLastSyncedAt        *time.Time `gorm:"column:lms_last_synced_at"`
	MoodleLastSyncedAt     *time.Time `gorm:"column:moodle_last_synced_at;index"`
	GoogleLastSyncedAt     *time.Time `gorm:"column:google_classroom_last_synced_at;index"`
	CreatedAt              time.Time
	UpdatedAt              time.Time
}

func (u *User) BeforeCreate(_ *gorm.DB) error {
	if u.ID == "" {
		u.ID = uuid.NewString()
	}
	return nil
}
