package sync

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jeremi16/resisst-api/internal/models"
	"github.com/jeremi16/resisst-api/internal/pkg/coursealias"
	"github.com/jeremi16/resisst-api/internal/pkg/synckey"
	"github.com/jeremi16/resisst-api/internal/pkg/text"
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

// updateAssignment updates an existing assignment.
func (s *SyncService) updateAssignment(
	tx *gorm.DB,
	eventID string,
	assignment AssignmentRecord,
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

// needsUpdate checks if assignment data has changed.
func (s *SyncService) needsUpdate(
	existing *models.Event,
	assignment AssignmentRecord,
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
	return false
}

// deleteStaleAssignments removes assignments that no longer exist in the source.
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
