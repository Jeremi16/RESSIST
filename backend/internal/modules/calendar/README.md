# calendar — LMS Aggregation, Preview & Sync

> Lokasi: `internal/modules/calendar/` | DI: `internal/app/container.go:33` | Router: `shared/router/router.go:109`

Tanggung jawab: unifikasi **Moodle (iCal)** + **Google Classroom** → `AssignmentRecord` → `sync.PersistAssignments` (upsert via `synckey`, course alias, FK Course, mark stale completed) + serve preview dengan filtering/sorting. Juga sebagai `CalendarProvider` untuk `auth.SyncAfterLogin`.

## Struktur File

| File | Peran |
|------|-------|
| `module.go` | `type Module{Service,*Handler,SyncService,GoogleClient,MoodleClient}` + `New(db,cfg)` |
| `service.go` | `Service{db,cfg,syncSvc,googleClient,moodleClient}` — `SyncProviders`, `GetEnabledProviders`, `FetchProviderAssignments` |
| `handler.go` (514 baris) | `GetPreview`, `TestPreview`, helpers `loadCachedEvents`, `Filter`, `convertEventsToPreviews`, `formatTimeRemaining`, `buildSourceInfo` |
| `routes.go` | Mount `GET /preview`, `POST /test` di `v1/calendar` (APIKeyOrJWT) |
| `types.go` | `calendarEventPreview`, `calendarSourceInfo`, `calendarTestRequest` |
| `sync/service.go` | `SyncService{db}` — `PersistAssignments` transaksi upsert + `markStaleAsCompleted` |
| `moodle/client.go` | `Client{}` stateless — `FetchMoodleCalendar GET 12s`, `ParseMoodleEvents` filter 60d + classcode |
| `google/client.go` | `Client{db,cfg}` — `FetchGoogleClassroomAssignments` (paginate 100, errgroup 5, `FetchStudentSubmissions` TURNED_IN/RETURNED → completed) |
| `ics/parser.go` | `ParseMoodleICS` — normalize `\r\n`, folding, `UID/SUMMARY/CATEGORIES/DESCRIPTION/URL/DTSTART/DTEND`, `parseICalDate`, `cleanMoodleTitle` |

## Routes

| Method | Path | Middleware | Handler | Query/Body | Deskripsi |
|--------|------|------------|---------|------------|-----------|
| `GET` | `/v1/calendar/preview` | `APIKeyOrJWT + RateLimit` | `GetPreview` | `?force=true&sort=deadline_asc|deadline_desc|newest|oldest` | Jika `force` → `syncAndBuildResponse` else `buildResponse` dari DB. `fromCache`, `lastSyncedAt`, `nextRefreshAt = lms_last_synced_at+1h` |
| `POST` | `/v1/calendar/test` | `APIKeyOrJWT + RateLimit` | `TestPreview` | Body `{test_moodle,test_google,moodle_calendar_url}` | Resolve `getTestProviders`, sync tanpa cache |

Response `preview` (sama untuk `test`):
```json
{
  "events":[{"id":"uuid","title":"Tugas 1","course":"Pemrograman","deadline":"2026-03-14T12:00:00Z","timeRemaining":"1 hari 2 jam","source":"google_classroom","completed":false}],
  "sources":[{"provider":"google_classroom","count":1,"success":true}],
  "total":1,"successfulSources":1,"failedSources":0,"fromCache":true,
  "lastSyncedAt":"2026-03-13T08:00:00Z","nextRefreshAt":"2026-03-13T09:00:00Z"
}
```

## Service Flow — `Service.SyncProviders`

```
For each provider in GetEnabledProviders(user):
  FetchProviderAssignments(provider) → []AssignmentRecord
    moodle: HTTP GET ICS 12s → ParseMoodleICS → filter deadline now..+60d + classcode.Extract → sort
    google: EnsureGoogleAccessToken (refresh if exp -1m) → FetchGoogleCourses paginate 100 ACTIVE → FetchAssignmentsFromCourses errgroup 5 → FetchStudentSubmissions → convertGoogleDeadline 23:59 default → IsCompleted
  collect classCodes
  syncSvc.PersistAssignments(userID, provider, assignments, courseAliasesJSON) → []NewAssignmentInfo
  update mooodle_last_synced_at / google_last_synced_at + lms_last_synced_at
  update available_class_codes JSON via classcode.ToJSON
```

## SyncService — `sync/service.go:PersistAssignments`

Transaksional:

1. `buildAssignmentsByKey(synckey.Build(provider,externalID,course,title))`
2. `FirstOrCreate Course` per unique name.
3. Apply alias (`coursealias.Apply`) ke display string + FK `course_id`.
4. `WHERE user_id+sync_key` → create (uuid, `completed/isCompleted`, `reminders_sent=[]`) atau update jika `needsUpdate` (title/course/classCode/description/url/deadline trunc second/sourceID/completed).
5. `markStaleAsCompleted WHERE user_id=? source=? AND (completed IS NULL OR false) AND sync_key NOT IN ? → completed=true, completed_at=now`.

## Handler Helpers

*   `loadCachedEvents WHERE user_id=? AND source IN ? AND deadline > now AND <= now+60d AND (completed IS NULL OR false) ORDER BY sortutil.OrderClause(sort)`
*   `Filter via classcode.Filter(muted, classCode, keywordFilters)` + `convertEventsToPreviews` (apply alias) + `formatTimeRemaining` Indonesian + `buildSourceInfo`.

## Env

`LMS_SYNC_*` tidak langsung dipakai di handler, tapi di `lmssync` scheduler yang memanggil `Service.SyncProviders`.

## Dependencies

`*gorm.DB, *config.Config, *sync.SyncService, *google.Client, *moodle.Client`, `pkg/classcode, coursealias, text, synckey, sortutil`.

## Contoh

```bash
curl -H "Authorization: Bearer <jwt>" "http://localhost:8080/v1/calendar/preview?sort=deadline_asc"
curl -H "Authorization: Bearer <jwt>" "http://localhost:8080/v1/calendar/preview?force=true"

curl -X POST -H "Authorization: Bearer <jwt>" -H "Content-Type: application/json" \
  -d '{"test_moodle":true,"moodle_calendar_url":"https://moodle.itera.ac.id/calendar.ics"}' \
  http://localhost:8080/v1/calendar/test
```
