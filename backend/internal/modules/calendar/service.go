package calendar

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/jeremi16/ressist-api/internal/config"
	"github.com/jeremi16/ressist-api/internal/models"
	"github.com/jeremi16/ressist-api/internal/modules/calendar/google"
	"github.com/jeremi16/ressist-api/internal/modules/calendar/moodle"
	"github.com/jeremi16/ressist-api/internal/modules/calendar/sync"
	"github.com/jeremi16/ressist-api/internal/pkg/classcode"
	"github.com/jeremi16/ressist-api/internal/pkg/text"
	"gorm.io/gorm"
)

// Service wraps sync, google, moodle clients and provides calendar domain logic.
type Service struct {
	db            *gorm.DB
	cfg           *config.Config
	syncSvc       *sync.SyncService
	googleClient  *google.Client
	moodleClient  *moodle.Client
}

// NewService creates a new calendar Service.
func NewService(db *gorm.DB, cfg *config.Config) *Service {
	return &Service{
		db:           db,
		cfg:          cfg,
		syncSvc:      sync.NewSyncService(db),
		googleClient: google.New(db, cfg),
		moodleClient: moodle.New(),
	}
}

// GetEnabledProviders returns enabled LMS providers for a user.
func (s *Service) GetEnabledProviders(user *models.User) []string {
	providers := make([]string, 0, 2)
	if user.MoodleEnabled && user.MoodleCalendarURL != nil && text.Dereference(user.MoodleCalendarURL, "") != "" {
		providers = append(providers, "moodle")
	}
	if user.GoogleClassroomEnabled && user.GoogleAccessToken != nil && text.Dereference(user.GoogleAccessToken, "") != "" {
		providers = append(providers, "google_classroom")
	}
	return providers
}

// FetchProviderAssignments fetches assignments from the specified provider.
// On Classroom partial success it returns the successful subset plus
// *sync.PartialFetchError so callers can persist without stale-marking.
func (s *Service) FetchProviderAssignments(ctx context.Context, provider string, user *models.User) ([]sync.AssignmentRecord, error) {
	switch provider {
	case "moodle":
		records, err := s.moodleClient.FetchMoodleAssignments(ctx, user)
		if err != nil {
			return nil, err
		}
		return convertMoodleRecords(records), nil
	case "google_classroom":
		records, stats, err := s.googleClient.FetchGoogleClassroomAssignmentsWithStats(ctx, user)
		if err != nil {
			var gPartial *google.PartialFetchError
			if errors.As(err, &gPartial) {
				converted := convertGoogleRecords(gPartial.Assignments)
				sStats := &sync.FetchStats{
					TotalCourses:      gPartial.Stats.TotalCourses,
					SucceededCourses:  gPartial.Stats.SucceededCourses,
					FailedCourses:     gPartial.Stats.FailedCourses,
					FailedCourseIDs:   append([]string(nil), gPartial.Stats.FailedCourseIDs...),
					TotalCourseWork:   gPartial.Stats.TotalCourseWork,
					Kept:              gPartial.Stats.Kept,
					SkippedNoDeadline: gPartial.Stats.SkippedNoDeadline,
					SkippedPast:       gPartial.Stats.SkippedPast,
					SkippedFarFuture:  gPartial.Stats.SkippedFarFuture,
				}
				return converted, &sync.PartialFetchError{
					Assignments:   converted,
					FailedCourses: append([]string(nil), gPartial.FailedCourses...),
					Stats:         sStats,
					Err:           gPartial.Err,
				}
			}
			return nil, err
		}
		_ = stats
		return convertGoogleRecords(records), nil
	default:
		return nil, fmt.Errorf("unsupported provider: %s", provider)
	}
}

// SyncProviders syncs data from all providers, persisting to DB.
// Returns sourceInfo, newAssignments, successfulSources, failedSources.
func (s *Service) SyncProviders(ctx context.Context, user *models.User, providers []string) ([]calendarSourceInfo, []newAssignmentInfo, int, int) {
	sourceInfo := make([]calendarSourceInfo, 0, len(providers))
	newAssignments := make([]newAssignmentInfo, 0)
	successfulSources := 0
	failedSources := 0
	allClassCodes := make(map[string]bool)

	successPerProvider := make(map[string]bool)
	for _, provider := range providers {
		assignments, err := s.FetchProviderAssignments(ctx, provider, user)
		var partial *sync.PartialFetchError
		isPartial := errors.As(err, &partial)
		if err != nil && !isPartial {
			log.Printf("[calendar] FetchProviderAssignments failed provider=%s user=%s err=%v", provider, user.ID, err)
			sourceInfo = append(sourceInfo, calendarSourceInfo{Provider: provider, Count: 0, Success: false, Error: err.Error()})
			failedSources++
			continue
		}
		if isPartial && partial != nil {
			assignments = partial.Assignments
			log.Printf("[calendar] partial fetch provider=%s user=%s kept=%d failedCourses=%v err=%v",
				provider, user.ID, len(assignments), partial.FailedCourses, partial.Err)
		}

		// Collect class codes from assignments
		for _, assignment := range assignments {
			if assignment.ClassCode != nil && *assignment.ClassCode != "" {
				allClassCodes[*assignment.ClassCode] = true
			}
		}

		var newForProvider []sync.NewAssignmentInfo
		if isPartial {
			// Skip stale-marking: failed courses were not fetched, their old
			// tasks must not be auto-completed.
			newForProvider, err = s.syncSvc.PersistAssignmentsWithoutStale(ctx, user.ID, provider, assignments, user.CourseAliases)
		} else {
			newForProvider, err = s.syncSvc.PersistAssignments(ctx, user.ID, provider, assignments, user.CourseAliases)
		}
		if err != nil {
			log.Printf("[calendar] PersistAssignments failed provider=%s user=%s err=%v", provider, user.ID, err)
			sourceInfo = append(sourceInfo, calendarSourceInfo{Provider: provider, Count: 0, Success: false, Error: err.Error()})
			failedSources++
			continue
		}

		// Convert sync.NewAssignmentInfo to calendar newAssignmentInfo
		for _, n := range newForProvider {
			newAssignments = append(newAssignments, newAssignmentInfo{
				Title:    n.Title,
				Course:   n.Course,
				Deadline: n.Deadline,
				Source:   n.Source,
			})
		}
		info := calendarSourceInfo{Provider: provider, Count: len(assignments), Success: true}
		if isPartial && partial != nil {
			info.Partial = true
			info.FailedCourses = append([]string(nil), partial.FailedCourses...)
			if partial.Err != nil {
				info.Error = partial.Err.Error()
			}
			if partial.Stats != nil {
				info.TotalCourseWork = partial.Stats.TotalCourseWork
				info.SkippedNoDeadline = partial.Stats.SkippedNoDeadline
				info.SkippedPast = partial.Stats.SkippedPast
				info.SkippedFarFuture = partial.Stats.SkippedFarFuture
			}
		} else if provider == "google_classroom" {
			// Full success: still expose skip counters when available via fresh stats.
			// (Stats already logged in google client; counters stay zero here to
			// keep the response lean — detailed counts appear on partial.)
		}
		sourceInfo = append(sourceInfo, info)
		successfulSources++
		successPerProvider[provider] = true
	}

	if successfulSources > 0 && len(allClassCodes) > 0 {
		s.updateUserAvailableClassCodes(ctx, user.ID, allClassCodes)
	}

	// Update per-provider timestamps
	if len(successPerProvider) > 0 {
		now := time.Now().UTC()
		updates := make(map[string]interface{})
		if successPerProvider["moodle"] {
			updates["moodle_last_synced_at"] = now
		}
		if successPerProvider["google_classroom"] {
			updates["google_classroom_last_synced_at"] = now
		}
		// Keep global for backward compat: set to max(now, existing)
		updates["lms_last_synced_at"] = now
		if err := s.db.WithContext(ctx).Model(&models.User{}).Where("id = ?", user.ID).Updates(updates).Error; err != nil {
			log.Printf("[calendar] failed to update per-provider timestamps user=%s err=%v", user.ID, err)
		}
	}

	return sourceInfo, newAssignments, successfulSources, failedSources
}

// updateUserAvailableClassCodes updates the user's available class codes.
func (s *Service) updateUserAvailableClassCodes(ctx context.Context, userID string, newClassCodes map[string]bool) {
	var user models.User
	if err := s.db.WithContext(ctx).Where("id = ?", userID).First(&user).Error; err != nil {
		return
	}

	existingCodes := make(map[string]bool)
	if user.AvailableClassCodes != "" && user.AvailableClassCodes != "[]" {
		codes := classcode.ParseArray(user.AvailableClassCodes)
		for _, code := range codes {
			existingCodes[code] = true
		}
	}

	merged := false
	for code := range newClassCodes {
		if !existingCodes[code] {
			existingCodes[code] = true
			merged = true
		}
	}

	if merged {
		codes := make([]string, 0, len(existingCodes))
		for code := range existingCodes {
			codes = append(codes, code)
		}
		jsonCodes := classcode.ToJSON(codes)
		s.db.WithContext(ctx).Model(&models.User{}).Where("id = ?", userID).Update("available_class_codes", jsonCodes)
	}
}

// SyncService returns the underlying sync service (for external use).
func (s *Service) SyncService() *sync.SyncService { return s.syncSvc }

// GoogleClient returns the google client.
func (s *Service) GoogleClient() *google.Client { return s.googleClient }

// MoodleClient returns the moodle client.
func (s *Service) MoodleClient() *moodle.Client { return s.moodleClient }

// Helpers to convert between package-specific AssignmentRecord types.

func convertGoogleRecords(in []google.AssignmentRecord) []sync.AssignmentRecord {
	out := make([]sync.AssignmentRecord, len(in))
	for i, r := range in {
		out[i] = sync.AssignmentRecord{
			Title:       r.Title,
			Course:      r.Course,
			ClassCode:   r.ClassCode,
			Description: r.Description,
			URL:         r.URL,
			Deadline:    r.Deadline,
			ExternalID:  r.ExternalID,
			Source:      r.Source,
			IsCompleted: r.IsCompleted,
		}
	}
	return out
}

func convertMoodleRecords(in []moodle.AssignmentRecord) []sync.AssignmentRecord {
	out := make([]sync.AssignmentRecord, len(in))
	for i, r := range in {
		out[i] = sync.AssignmentRecord{
			Title:       r.Title,
			Course:      r.Course,
			ClassCode:   r.ClassCode,
			Description: r.Description,
			URL:         r.URL,
			Deadline:    r.Deadline,
			ExternalID:  r.ExternalID,
			Source:      r.Source,
		}
	}
	return out
}
