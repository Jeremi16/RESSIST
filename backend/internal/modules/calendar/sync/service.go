package sync

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jeremi16/ressist-api/internal/models"
	"github.com/jeremi16/ressist-api/internal/pkg/coursealias"
	"github.com/jeremi16/ressist-api/internal/pkg/synckey"
	"github.com/jeremi16/ressist-api/internal/pkg/text"
	"gorm.io/gorm"
)

// AssignmentRecord represents a single assignment from an LMS provider.
type AssignmentRecord struct {
	Title       string
	Course      string
	ClassCode   *string
	Description *string
	URL         *string
	Deadline    time.Time
	ExternalID  string
	Source      string
	IsCompleted bool
}

// NewAssignmentInfo represents a newly created assignment returned to the client.
type NewAssignmentInfo struct {
	Title    string    `json:"title"`
	Course   string    `json:"course"`
	Deadline time.Time `json:"deadline"`
	Source   string    `json:"source"`
}

// SyncService handles assignment synchronization logic.
type SyncService struct {
	db *gorm.DB
}

// NewSyncService creates a new SyncService.
func NewSyncService(db *gorm.DB) *SyncService {
	return &SyncService{db: db}
}

// PersistAssignments saves assignments to database, returns newly created assignments.
func (s *SyncService) PersistAssignments(
	ctx context.Context,
	userID string,
	provider string,
	assignments []AssignmentRecord,
	courseAliasesJSON string,
) ([]NewAssignmentInfo, error) {
	now := time.Now().UTC()
	assignmentsByKey := buildAssignmentsByKey(assignments, provider)
	keys := getAssignmentKeys(assignmentsByKey)
	aliases := coursealias.Parse(courseAliasesJSON)
	newAssignments := make([]NewAssignmentInfo, 0)

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, key := range keys {
			assignment := assignmentsByKey[key]
			originalCourse := assignment.Course
			if originalCourse == "" {
				originalCourse = "Unknown Course"
			}

			// Find or create course for global dictionary
			var course models.Course
			if err := tx.Where("name = ?", originalCourse).FirstOrCreate(&course, models.Course{Name: originalCourse}).Error; err != nil {
				return err
			}
			courseIDValue := text.NullableStringPointer(course.ID)

			// Still apply alias to the string field for backward compatibility/simplicity
			courseValue := text.NullableStringPointer(coursealias.Apply(assignment.Course, aliases))
			sourceIDValue := text.NullableStringPointer(assignment.ExternalID)

			var existing models.Event
			err := tx.Where("user_id = ? AND sync_key = ?", userID, key).First(&existing).Error
			if err != nil {
				if !errors.Is(err, gorm.ErrRecordNotFound) {
					return err
				}
				// Create new assignment
				if err := s.createAssignment(tx, assignment, userID, provider, key, courseValue, sourceIDValue, courseIDValue); err != nil {
					return err
				}
				newAssignments = append(newAssignments, NewAssignmentInfo{
					Title:    assignment.Title,
					Course:   text.Dereference(courseValue, "Unknown Course"),
					Deadline: assignment.Deadline.UTC(),
					Source:   provider,
				})
				continue
			}

			// Update existing if changed
			if s.needsUpdate(&existing, assignment, provider, courseValue, sourceIDValue, courseIDValue) {
				if err := s.updateAssignment(tx, existing.ID, assignment, provider, courseValue, sourceIDValue, courseIDValue); err != nil {
					return err
				}
			}
		}

		if provider == "moodle" {
			return s.markStaleAsMissed(tx, userID, provider, keys, now)
		}
		return s.markStaleAsCompleted(tx, userID, provider, keys, now)
	})

	if err != nil {
		return nil, err
	}
	return newAssignments, nil
}

// buildAssignmentsByKey creates a map of assignments by their sync key.
func buildAssignmentsByKey(assignments []AssignmentRecord, provider string) map[string]AssignmentRecord {
	result := make(map[string]AssignmentRecord, len(assignments))
	for _, assignment := range assignments {
		key := synckey.Build(provider, assignment.ExternalID, assignment.Course, assignment.Title)
		result[key] = assignment
	}
	return result
}

// getAssignmentKeys returns all keys from the assignments map.
func getAssignmentKeys(assignments map[string]AssignmentRecord) []string {
	keys := make([]string, 0, len(assignments))
	for key := range assignments {
		keys = append(keys, key)
	}
	return keys
}

// createAssignment inserts a new assignment into the database.
func (s *SyncService) createAssignment(
	tx *gorm.DB,
	assignment AssignmentRecord,
	userID, provider, key string,
	courseValue, sourceIDValue, courseIDValue *string,
) error {
	completed := assignment.IsCompleted
	var completedAt *time.Time
	status := "pending"
	var statusUpdatedAt *time.Time
	if completed {
		t := time.Now().UTC()
		completedAt = &t
		statusUpdatedAt = &t
		status = "completed"
	}
	event := models.Event{
		ID:              uuid.NewString(),
		UserID:          userID,
		Title:           assignment.Title,
		Course:          courseValue,
		CourseID:        courseIDValue,
		ClassCode:       assignment.ClassCode,
		Description:     assignment.Description,
		URL:             assignment.URL,
		Deadline:        assignment.Deadline.UTC(),
		Source:          provider,
		SourceID:        sourceIDValue,
		SyncKey:         key,
		Completed:       completed,
		CompletedAt:     completedAt,
		Status:          status,
		StatusUpdatedAt: statusUpdatedAt,
		Reminder24HSent: false,
		RemindersSent:   "[]",
	}
	return tx.Create(&event).Error
}

// updateAssignment updates an existing assignment with per-provider semantics.
// Moodle: monotonik false->true, tidak pernah revert completed=true ke false. Missed yang muncul lagi di-resurrect ke pending.
// Classroom: full source of truth, completed mengikuti assignment.IsCompleted bidirectional.
func (s *SyncService) updateAssignment(
	tx *gorm.DB,
	eventID string,
	assignment AssignmentRecord,
	provider string,
	courseValue, sourceIDValue, courseIDValue *string,
) error {
	var existing models.Event
	if err := tx.Where("id = ?", eventID).First(&existing).Error; err != nil {
		return err
	}

	updateData := map[string]interface{}{
		"title":       assignment.Title,
		"course":      courseValue,
		"course_id":   courseIDValue,
		"class_code":  assignment.ClassCode,
		"description": assignment.Description,
		"url":         assignment.URL,
		"deadline":    assignment.Deadline.UTC(),
		"source":      provider,
		"source_id":   sourceIDValue,
	}

	if provider == "moodle" {
		// Moodle: never revert completed, only allow pending->completed or missed->pending resurrection
		if existing.Status == "missed" {
			// Resurrect: task reappeared in ICS
			if assignment.IsCompleted {
				updateData["completed"] = true
				t := time.Now().UTC()
				updateData["completed_at"] = t
				updateData["status"] = "completed"
				updateData["status_updated_at"] = t
			} else {
				updateData["status"] = "pending"
				updateData["status_updated_at"] = time.Now().UTC()
				// keep completed as is (false)
			}
		} else if !existing.Completed && assignment.IsCompleted {
			t := time.Now().UTC()
			updateData["completed"] = true
			updateData["completed_at"] = t
			updateData["status"] = "completed"
			updateData["status_updated_at"] = t
		} else {
			// No status/completed change for moodle (prevent revert)
			// still update other fields above
		}
	} else {
		// Classroom: full source of truth bidirectional
		completed := assignment.IsCompleted
		var completedAt interface{}
		var status string
		var statusUpdatedAt interface{}
		if completed {
			t := time.Now().UTC()
			completedAt = t
			status = "completed"
			statusUpdatedAt = t
		} else {
			completedAt = nil
			status = "pending"
			statusUpdatedAt = time.Now().UTC()
		}
		updateData["completed"] = completed
		updateData["completed_at"] = completedAt
		updateData["status"] = status
		updateData["status_updated_at"] = statusUpdatedAt
	}

	return tx.Model(&models.Event{}).Where("id = ?", eventID).Updates(updateData).Error
}

// needsUpdate checks if assignment data has changed with per-provider completed semantics.
func (s *SyncService) needsUpdate(
	existing *models.Event,
	assignment AssignmentRecord,
	provider string,
	courseValue, sourceIDValue, courseIDValue *string,
) bool {
	if existing.Title != assignment.Title {
		return true
	}
	if !stringsEqual(existing.Course, courseValue) {
		return true
	}
	if !stringsEqual(existing.CourseID, courseIDValue) {
		return true
	}
	if !stringsEqual(existing.ClassCode, assignment.ClassCode) {
		return true
	}
	if !stringsEqual(existing.Description, assignment.Description) {
		return true
	}
	if !stringsEqual(existing.URL, assignment.URL) {
		return true
	}
	if !existing.Deadline.Truncate(time.Second).Equal(assignment.Deadline.UTC().Truncate(time.Second)) {
		return true
	}
	if !stringsEqual(existing.SourceID, sourceIDValue) {
		return true
	}
	if provider == "moodle" {
		// Moodle: only pending->completed or missed resurrection triggers update
		if existing.Status == "missed" {
			return true
		}
		if !existing.Completed && assignment.IsCompleted {
			return true
		}
		// true->false must not trigger (prevent revert)
	} else {
		if existing.Completed != assignment.IsCompleted {
			return true
		}
		// Also check status divergence for classroom
		expectedStatus := "pending"
		if assignment.IsCompleted {
			expectedStatus = "completed"
		}
		if existing.Status != expectedStatus && existing.Status != "" {
			return true
		}
	}
	return false
}

// markStaleAsCompleted marks assignments that no longer exist in source as completed (for Classroom).
func (s *SyncService) markStaleAsCompleted(
	tx *gorm.DB,
	userID, provider string,
	keys []string,
	now time.Time,
) error {
	query := tx.Model(&models.Event{}).
		Where("user_id = ? AND source = ?", userID, provider).
		Where("(status = ? OR status IS NULL OR status = '') AND (completed IS NULL OR completed = ?)", "pending", false)
	if len(keys) > 0 {
		query = query.Where("sync_key NOT IN ?", keys)
	}
	return query.Updates(map[string]interface{}{
		"completed":         true,
		"completed_at":      now,
		"status":            "completed",
		"status_updated_at": now,
		"updated_at":        now,
	}).Error
}

// markStaleAsMissed marks pending Moodle assignments that disappeared from ICS as missed (terlewat).
func (s *SyncService) markStaleAsMissed(
	tx *gorm.DB,
	userID, provider string,
	keys []string,
	now time.Time,
) error {
	query := tx.Model(&models.Event{}).
		Where("user_id = ? AND source = ?", userID, provider).
		Where("(status = ? OR status IS NULL OR status = '') AND (completed IS NULL OR completed = ?)", "pending", false)
	if len(keys) > 0 {
		query = query.Where("sync_key NOT IN ?", keys)
	}
	return query.Updates(map[string]interface{}{
		"status":            "missed",
		"status_updated_at": now,
		"updated_at":        now,
	}).Error
}

// deleteStaleAssignments is kept for backward compatibility but now delegates to markStaleAsCompleted.
func (s *SyncService) deleteStaleAssignments(
	tx *gorm.DB,
	userID, provider string,
	keys []string,
	now time.Time,
) error {
	return s.markStaleAsCompleted(tx, userID, provider, keys, now)
}

// stringsEqual compares two string pointers for equality.
func stringsEqual(a, b *string) bool {
	aval := ""
	bval := ""
	if a != nil {
		aval = *a
	}
	if b != nil {
		bval = *b
	}
	return aval == bval
}
