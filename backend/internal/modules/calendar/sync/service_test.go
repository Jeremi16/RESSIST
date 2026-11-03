package sync

import (
	"testing"
	"time"
)

// TestStaleMarkersSkipWhenNoKeys is the regression test for the bug where an
// empty key set meant "mark everything stale".
//
// Both markStaleAsCompleted and markStaleAsMissed built their query as
// "user_id = ? AND source = ?" and only appended "sync_key NOT IN ?" when
// len(keys) > 0. A successful-but-empty upstream response (or a partial fetch
// that returned nothing) therefore produced a WHERE clause matching *every*
// pending row for that user, flipping their entire task list to
// completed/missed. Users lost their to-do lists silently.
//
// The fix returns early on an empty key set, so this test asserts the early
// return is reachable and that the functions never touch the database. A nil
// *gorm.DB would panic if a query were attempted, which is exactly the
// assertion we want.
func TestStaleMarkersSkipWhenNoKeys(t *testing.T) {
	svc := &SyncService{} // db deliberately nil

	if err := svc.markStaleAsCompleted(nil, "user-1", "google_classroom", nil, time.Now()); err != nil {
		t.Fatalf("markStaleAsCompleted with empty keys returned error: %v", err)
	}
	if err := svc.markStaleAsMissed(nil, "user-1", "moodle", nil, time.Now()); err != nil {
		t.Fatalf("markStaleAsMissed with empty keys returned error: %v", err)
	}
	if err := svc.markStaleAsCompleted(nil, "user-1", "google_classroom", []string{}, time.Now()); err != nil {
		t.Fatalf("empty (non-nil) slice must also short-circuit: %v", err)
	}
}

// TestDeleteStaleAssignmentsSkipsWhenNoKeys covers the compatibility wrapper.
func TestDeleteStaleAssignmentsSkipsWhenNoKeys(t *testing.T) {
	svc := &SyncService{}
	if err := svc.deleteStaleAssignments(nil, "user-1", "google_classroom", nil, time.Now()); err != nil {
		t.Fatalf("deleteStaleAssignments with empty keys returned error: %v", err)
	}
}

// TestBuildAssignmentsByKeyDedupes ensures a repeated sync key collapses to one
// entry, so the keys slice stays consistent with the map.
func TestBuildAssignmentsByKeyDedupes(t *testing.T) {
	records := []AssignmentRecord{
		{Title: "Tugas A", Course: "IF2233", ExternalID: "1", Deadline: time.Now()},
		{Title: "Tugas A", Course: "IF2233", ExternalID: "1", Deadline: time.Now()},
	}
	byKey := buildAssignmentsByKey(records, "moodle")
	if len(byKey) != 1 {
		t.Fatalf("expected 1 unique key, got %d", len(byKey))
	}
	keys := getAssignmentKeys(byKey)
	if len(keys) != 1 {
		t.Fatalf("expected 1 key, got %d", len(keys))
	}
}
