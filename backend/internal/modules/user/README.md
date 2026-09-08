# user — Profile & Settings

> Lokasi: `internal/modules/user/` | DI: `internal/app/container.go:44` | Router: `shared/router/router.go:100`

Tanggung jawab: CRUD settings user (WA/Telegram/Moodle/Google, reminder, muted, alias, class code) + verify code Telegram + alias matkul.

## Struktur File

| File | Peran |
|------|-------|
| `module.go` | `type Module{*Handler}` + `New(db)` |
| `handler.go` (435 baris) | `GetCurrentUser`, `UpdateCurrentUser`, `DisconnectGoogleClassroom`, `Get/Add/DeleteCourseAliases`, `GenerateTelegramVerifyCode` |
| `service.go` (31 baris) | Helper tipis (validasi) |
| `routes.go` | Dipanggil di `router.go:100` (mount di `v1/user`) |

## Routes

| Method | Path | Middleware | Handler | Deskripsi |
|--------|------|------------|---------|-----------|
| `GET` | `/v1/user` | `APIKeyOrJWT + ApiKeyRateLimit` | `GetCurrentUser` | Return `userResponse` lengkap (lihat bawah) |
| `PUT` | `/v1/user` | `AccessToken` | `UpdateCurrentUser` | Body `userUpdateRequest` (semua optional), validasi URL WA, reset `lms_last_synced_at` jika toggle LMS |
| `POST` | `/v1/user/google/disconnect` | `AccessToken` | `DisconnectGoogleClassroom` | Tx: clear `google_access/refresh/expiry` + `google_classroom_enabled=false, lms_last_synced_at=null`, `DELETE events WHERE source=google_classroom` |
| `GET` | `/v1/user/course-aliases` | `AccessToken` | `GetCourseAliases` | `Parse CourseAliases JSON → map` |
| `POST` | `/v1/user/course-aliases` | `AccessToken` | `AddCourseAlias` | Body `{original_name, alias}` → `ToJSON` |
| `DELETE` | `/v1/user/course-aliases` | `AccessToken` | `DeleteCourseAlias` | Body `{original_name}` |
| `POST` | `/v1/user/telegram/verify-code` | `AccessToken` | `GenerateTelegramVerifyCode` | Generate 6-char `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, expiry 10m, update `telegram_verify_code/expires` |

## Types

`userResponse`:
```json
{
  "id":"uuid","email":"...@student.itera.ac.id","name":"...","avatar_url":"...",
  "whatsapp_number":null,"whatsapp_enabled":true,
  "telegram_chat_id":null,"telegram_enabled":true,
  "moodle_enabled":false,"moodle_calendar_url":null,
  "google_classroom_enabled":false,"google_connected":false,
  "telegram_bot_username":"resisst_bot",
  "reminder_hours":"[24,12]","morning_briefing":false,
  "muted_courses":"[]","course_aliases":{},"class_code":null,"available_class_codes":[],
  "lms_last_synced_at":null,"moodle_last_synced_at":null,"google_last_synced_at":null,
  "created_at":"2026-03-13T10:00:00.000Z"
}
```

`userUpdateRequest` fields: `whatsapp_number, whatsapp_enabled, telegram_enabled, telegram_chat_id, moodle_enabled, moodle_calendar_url, google_classroom_enabled, reminder_hours, morning_briefing, muted_courses, course_aliases, class_code, available_class_codes`.

## Validasi

*   `IsLikelyMoodleCalendarURL` (`pkg/urlutil/urlutil.go`) — harus mengandung `moodle` dan `calendar`.
*   `ValidateWhatsAppNumber` — digits >=10.
*   Google enable requires `google_access_token != nil`.
*   `reminder_hours` JSON array valid.

## Dependencies

`*gorm.DB`, `pkg/text, classcode, coursealias, urlutil`, env `TELEGRAM_BOT_USERNAME=resisst_bot`.

## Contoh

```bash
curl -H "Authorization: Bearer <jwt>" http://localhost:8080/v1/user
curl -X PUT -H "Authorization: Bearer <jwt>" -H "Content-Type: application/json" \
  -d '{"moodle_enabled":true,"moodle_calendar_url":"https://moodle.itera.ac.id/calendar.ics"}' \
  http://localhost:8080/v1/user

curl -X POST -H "Authorization: Bearer <jwt>" http://localhost:8080/v1/user/telegram/verify-code
# → {"code":"X7K9PQ","expires_at":"2026-03-13T10:10:00Z"}
```
