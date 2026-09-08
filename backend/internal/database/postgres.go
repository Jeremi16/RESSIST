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
	}

	return db, nil
}
