# models — GORM Entities

> Lokasi: `internal/models/*.go` | AutoMigrate di `internal/database/postgres.go:39`

5 tabel utama. Semua `ID` UUID string (`BeforeCreate` `uuid.NewString()`).

## Tabel

### `User` — `models/user.go:10`

Akun dari Google OAuth + settings. Kolom penting:

| Kolom | Tipe | Catatan |
|-------|------|---------|
| `id` | `PK 36` | UUID |
| `email` | `uniqueIndex` | `student.itera.ac.id` |
| `google_id` | `uniqueIndex` | Google sub |
| `whatsapp_number` / `whatsapp_enabled` | `*string` / bool | WA notif (legacy) |
| `telegram_chat_id` / `telegram_enabled` / `telegram_verify_code` (index) | `*string` | Link Telegram |
| `moodle_enabled` / `moodle_calendar_url` | bool / `*string` | ICS URL |
| `google_classroom_enabled` / `google_access_token` / `refresh_token` / `expiry` | bool / `*string` | OAuth tokens |
| `reminder_hours` | `string "[24]"` | JSON array hours |
| `morning_briefing` | bool | 07:00 WIB |
| `muted_courses` / `course_aliases` / `course_keyword_filters` | `string "[]"/"{}"` | JSON |
| `class_code` / `available_class_codes` | `*string` / `string "[]"` | Filter kelas Moodle |
| `lms_last_synced_at` / `moodle_last_synced_at` (index) / `google_last_synced_at` (index) | `*time.Time` | Sync timestamps |

### `Event` — `models/event.go`

Tugas dari LMS. `UserID` index + `uniqueIdx idx_user_sync_key` (`user_id + sync_key`).

| Kolom | Catatan |
|-------|---------|
| `sync_key` | `synckey.Build(provider,externalID,course,title)` — dedup |
| `source` | `moodle` / `google_classroom` (index) |
| `deadline` | index, filter `>now && <=now+60d` |
| `course`, `course_id` (FK Course), `class_code` | Matkul + kelas |
| `reminders_sent` | `string "[]"` — JSON array `24h,12h,6h,3h,1h` |
| `completed` / `completed_at` | Manual atau `markStaleAsCompleted` |
| `source_id`, `url`, `description` | External ID + link |

### `Course` — `models/course.go`

Master matkul `Name unique` (di-`FirstOrCreate` saat sync).

### `ApiKey` — `models/api_key.go`

| Kolom | Catatan |
|-------|---------|
| `prefix` (index) | `rsk_` + 8 char |
| `key_hash` (unique) | `sha256(raw)` hex |
| `expires_at` (index) / `revoked_at` / `last_used_at` | Lifecycle |
| `scopes` | `string "[]"` (saat ini kosong) |

Max 5 aktif/user (`ApiKeyMaxPerUser`).

### `RefreshToken` — `models/refresh_token.go`

| Kolom | Catatan |
|-------|---------|
| `token_hash` (unique) | `sha256(base64url 48B)` |
| `expires_at` (index) / `revoked_at` | 30d TTL, rotasi |
| `user_agent`, `ip_address` | Audit |

Reuse detection: jika token hash sudah revoked → `RevokeAll` user.

## Relasi

*   `User` 1—N `Event` (via `user_id`), `RefreshToken`, `ApiKey`.
*   `Event.course_id` → `Course.id` (nullable, `FirstOrCreate`).

## Contoh Query

```go
// Muted filter (in-memory setelah fetch)
events := []models.Event{}
db.Where("user_id=? AND deadline > ? AND completed IS NULL", userID, time.Now()).Find(&events)
```
