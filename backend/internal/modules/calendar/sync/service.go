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
			if s.needsUpdate(&existing, assignment, courseValue, sourceIDValue, courseIDValue) {
				if err := s.updateAssignment(tx, existing.ID, assignment, provider, courseValue, sourceIDValue, courseIDValue); err != nil {
					return err
				}
			}
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
	if completed {
		t := time.Now().UTC()
		completedAt = &t
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
		Reminder24HSent: false,
		RemindersSent:   "[]",
	}
	return tx.Create(&event).Error
}

// updateAssignment updates an existing assignment, resurrecting completed tasks.
func (s *SyncService) updateAssignment(
	tx *gorm.DB,
	eventID string,
	assignment AssignmentRecord,
	provider string,
	courseValue, sourceIDValue, courseIDValue *string,
) error {
	completed := assignment.IsCompleted
	var completedAt interface{}
	if completed {
		t := time.Now().UTC()
		completedAt = t
	} else {
		completedAt = nil
	}
	updateData := map[string]interface{}{
		"title":        assignment.Title,
		"course":       courseValue,
		"course_id":    courseIDValue,
		"class_code":   assignment.ClassCode,
		"description":  assignment.Description,
		"url":          assignment.URL,
		"deadline":     assignment.Deadline.UTC(),
		"source":       provider,
		"source_id":    sourceIDValue,
		"completed":    completed,
		"completed_at": completedAt,
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
	if existing.Completed != assignment.IsCompleted {
		return true
	}
	return false
}

// markStaleAsCompleted marks assignments that no longer exist in source as completed (instead of deleting).
// This makes Moodle-done tasks disappear from calendar (filtered) but appear in "Selesai" tab.
// Now also handles overdue stale: tasks whose deadline <= now but missing from ICS are also marked completed.
func (s *SyncService) markStaleAsCompleted(
	tx *gorm.DB,
	userID, provider string,
	keys []string,
	now time.Time,
) error {
	// Guard: FetchAssignments now returns error on partial failure, but empty assignment list
	// can still be legit (user has 0 tasks). Only skip wipe if this is truly an error case;
	// caller already aborts on fetch error, so reaching here with empty keys means legit 0.
	// We keep NOT IN only when keys > 0 to avoid wiping all on legit empty.
	// No additional guard needed because partial failures no longer reach Persist.
	query := tx.Model(&models.Event{}).
		Where("user_id = ? AND source = ? AND (completed IS NULL OR completed = ?)", userID, provider, false)
	if len(keys) > 0 {
		query = query.Where("sync_key NOT IN ?", keys)
	} else {
		// If legit 0 tasks, wipe all tasks for this provider (user cleared assignments).
		// This is intentional; if fetch had error, we would not be here.
	}
	return query.Updates(map[string]interface{}{
		"completed":    true,
		"completed_at": now,
		"updated_at":   now,
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
