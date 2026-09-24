package database

import (
	"fmt"
	"time"

	"github.com/jeremi16/ressist-api/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func New(databaseURL string, autoMigrate bool) (*gorm.DB, error) {
	if databaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}

	db, err := gorm.Open(postgres.New(postgres.Config{
		DSN:                  databaseURL,
		PreferSimpleProtocol: true,
	}), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("get sql db: %w", err)
	}

	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)
	sqlDB.SetConnMaxIdleTime(10 * time.Minute)

	if autoMigrate {
		if err := db.AutoMigrate(&models.User{}, &models.RefreshToken{}, &models.Event{}, &models.Course{}, &models.ApiKey{}); err != nil {
			return nil, fmt.Errorf("auto migrate: %w", err)
		}
		// Backfill status for existing rows: completed=true -> status=completed, else pending/missed stays pending
		// Also ensure status column has default for old rows where status is empty
		_ = db.Exec(`UPDATE events SET status = CASE WHEN completed = true THEN 'completed' ELSE 'pending' END WHERE status IS NULL OR status = ''`).Error
		// Backfill empty reminder_hours ke default baru agar reminder 12/6/1 ikut jalan.
		// User yang eksplisit memilih "[24]" tidak diubah (hargai pilihan).
		_ = db.Exec(`UPDATE users SET reminder_hours = '[24,12,6,1]' WHERE reminder_hours IS NULL OR TRIM(reminder_hours) = '' OR TRIM(reminder_hours) = '[]'`).Error
	}

	// Selalu dijalankan (idempotent), termasuk production yang AUTO_MIGRATE=false:
	// kolom ini wajib ada sebelum insert refresh token.
	if err := db.Exec(`ALTER TABLE IF EXISTS refresh_tokens ADD COLUMN IF NOT EXISTS session_started_at timestamptz`).Error; err != nil {
		return nil, fmt.Errorf("migrate refresh_tokens.session_started_at: %w", err)
	}
	_ = db.Exec(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_session_started_at ON refresh_tokens (session_started_at)`).Error

	return db, nil
}
