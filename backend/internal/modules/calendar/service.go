package calendar

import (
	"context"
	"fmt"

	"github.com/jeremi16/resisst-api/internal/config"
	"github.com/jeremi16/resisst-api/internal/models"
	"github.com/jeremi16/resisst-api/internal/modules/calendar/google"
	"github.com/jeremi16/resisst-api/internal/modules/calendar/moodle"
	"github.com/jeremi16/resisst-api/internal/modules/calendar/sync"
	"github.com/jeremi16/resisst-api/internal/pkg/classcode"
	"github.com/jeremi16/resisst-api/internal/pkg/text"
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
func (s *Service) FetchProviderAssignments(ctx context.Context, provider string, user *models.User) ([]sync.AssignmentRecord, error) {
	switch provider {
	case "moodle":
		records, err := s.moodleClient.FetchMoodleAssignments(ctx, user)
		if err != nil {
			return nil, err
		}
		return convertMoodleRecords(records), nil
	case "google_classroom":
		records, err := s.googleClient.FetchGoogleClassroomAssignments(ctx, user)
		if err != nil {
			return nil, err
		}
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

	for _, provider := range providers {
		assignments, err := s.FetchProviderAssignments(ctx, provider, user)
		if err != nil {
			sourceInfo = append(sourceInfo, calendarSourceInfo{Provider: provider, Count: 0, Success: false})
			failedSources++
			continue
		}

		// Collect class codes from assignments
		for _, assignment := range assignments {
			if assignment.ClassCode != nil && *assignment.ClassCode != "" {
				allClassCodes[*assignment.ClassCode] = true
			}
		}

		newForProvider, err := s.syncSvc.PersistAssignments(ctx, user.ID, provider, assignments, user.CourseAliases)
		if err != nil {
			sourceInfo = append(sourceInfo, calendarSourceInfo{Provider: provider, Count: 0, Success: false})
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
		sourceInfo = append(sourceInfo, calendarSourceInfo{Provider: provider, Count: len(assignments), Success: true})
		successfulSources++
	}

	if successfulSources > 0 && len(allClassCodes) > 0 {
		s.updateUserAvailableClassCodes(ctx, user.ID, allClassCodes)
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
