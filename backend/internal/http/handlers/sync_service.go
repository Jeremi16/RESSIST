package handlers

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jeremi16/resisst-api/internal/models"
	"gorm.io/gorm"
)

// SyncService handles assignment synchronization logic
type SyncService struct {
	db *gorm.DB
}

// NewSyncService creates a new SyncService
func NewSyncService(db *gorm.DB) *SyncService {
	return &SyncService{db: db}
}

// PersistAssignments saves assignments to database, returns newly created assignments
func (s *SyncService) PersistAssignments(
	ctx context.Context,
	userID string,
	provider string,
	assignments []assignmentRecord,
	courseAliasesJSON string,
) ([]newAssignmentInfo, error) {
	now := time.Now().UTC()
	assignmentsByKey := buildAssignmentsByKey(assignments, provider)
	keys := getAssignmentKeys(assignmentsByKey)
	aliases := parseCourseAliases(courseAliasesJSON)
	newAssignments := make([]newAssignmentInfo, 0)

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
			courseIDValue := nullableStringPointer(course.ID)

			// Still apply alias to the string field for backward compatibility/simplicity
			courseValue := nullableStringPointer(applyCourseAlias(assignment.Course, aliases))
			sourceIDValue := nullableStringPointer(assignment.ExternalID)

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
				newAssignments = append(newAssignments, newAssignmentInfo{
					Title:    assignment.Title,
					Course:   dereferenceString(courseValue, "Unknown Course"),
					Deadline: assignment.Deadline.UTC(),
					Source:   provider,
				})
				continue
			}

			// Update existing if changed
			if s.needsUpdate(&existing, assignment, courseValue, sourceIDValue, courseIDValue) {
				if err := s.updateAssignment(tx, existing.ID, assignment, provider, courseValue, sourceIDValue, courseIDValue); err != nil {
					return err
				}
			}
		}

		return s.deleteStaleAssignments(tx, userID, provider, keys, now)
	})

	if err != nil {
		return nil, err
	}
	return newAssignments, nil
}

// buildAssignmentsByKey creates a map of assignments by their sync key
func buildAssignmentsByKey(assignments []assignmentRecord, provider string) map[string]assignmentRecord {
	result := make(map[string]assignmentRecord, len(assignments))
	for _, assignment := range assignments {
		key := buildAssignmentSyncKey(provider, assignment.ExternalID, assignment.Course, assignment.Title)
		result[key] = assignment
	}
	return result
}

// getAssignmentKeys returns all keys from the assignments map
func getAssignmentKeys(assignments map[string]assignmentRecord) []string {
	keys := make([]string, 0, len(assignments))
	for key := range assignments {
		keys = append(keys, key)
	}
	return keys
}

// createAssignment inserts a new assignment into the database
func (s *SyncService) createAssignment(
	tx *gorm.DB,
	assignment assignmentRecord,
	userID, provider, key string,
	courseValue, sourceIDValue, courseIDValue *string,
) error {
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
		Reminder24HSent: false,
		RemindersSent:   "[]",
	}
	return tx.Create(&event).Error
}

// updateAssignment updates an existing assignment
func (s *SyncService) updateAssignment(
	tx *gorm.DB,
	eventID string,
	assignment assignmentRecord,
	provider string,
	courseValue, sourceIDValue, courseIDValue *string,
) error {
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
	return tx.Model(&models.Event{}).Where("id = ?", eventID).Updates(updateData).Error
}

// needsUpdate checks if assignment data has changed
func (s *SyncService) needsUpdate(
	existing *models.Event,
	assignment assignmentRecord,
	courseValue, sourceIDValue, courseIDValue *string,
) bool {
	// Compare title
	if existing.Title != assignment.Title {
		return true
	}

	// Compare course
	if !stringsEqual(existing.Course, courseValue) {
		return true
	}

	// Compare course_id
	if !stringsEqual(existing.CourseID, courseIDValue) {
		return true
	}

	// Compare class_code
	if !stringsEqual(existing.ClassCode, assignment.ClassCode) {
		return true
	}

	// Compare description
	if !stringsEqual(existing.Description, assignment.Description) {
		return true
	}

	// Compare URL
	if !stringsEqual(existing.URL, assignment.URL) {
		return true
	}

	// Compare deadline (truncate to second)
	if !existing.Deadline.Truncate(time.Second).Equal(assignment.Deadline.UTC().Truncate(time.Second)) {
		return true
	}

	// Compare source_id
	if !stringsEqual(existing.SourceID, sourceIDValue) {
		return true
	}

	return false
}

// deleteStaleAssignments removes assignments that no longer exist in the source
func (s *SyncService) deleteStaleAssignments(
	tx *gorm.DB,
	userID, provider string,
	keys []string,
	now time.Time,
) error {
	query := tx.Where("user_id = ? AND source = ? AND deadline > ?", userID, provider, now)
	if len(keys) > 0 {
		query = query.Where("sync_key NOT IN ?", keys)
	}
	return query.Delete(&models.Event{}).Error
}

// stringsEqual compares two string pointers for equality
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
