# Resisst API Documentation

> Base: Production `https://resisst-api.nodryx.com` · Local `http://localhost:8080` · OpenAPI `GET /openapi.json` & `GET /v1/openapi.json`

## Daftar Isi

*   [Auth Model](#auth-model) · [Common Headers](#common-headers) · [Health](#health-and-observability)
*   [Auth](#authentication-endpoints) · [User](#user-endpoints) · [Assignment](#assignment-endpoints) · [Course](#course-endpoints) · [Telegram](#telegram-endpoints) · [API Keys](#api-keys-programmatic-access) · [Calendar](#calendar-endpoints) · [Internal (bot)](#internal-bot-endpoints-service-to-service) · [BFF Proxy](#frontend-bff-proxy-endpoints-hono-vercel-functions)

## Auth Model

*   OAuth login sets **HttpOnly cookie** `refresh_token` (30d, `sha256` di DB, rotasi + reuse detection).
*   Access token (`JWT HS256 15m, iss=resisst-api`) via `POST /v1/auth/refresh`.
*   Protected endpoints — salah satu:

    | Header | Kapan | Endpoint support |
    |--------|-------|------------------|
    | `Authorization: Bearer <jwt>` | Browser via BFF | Semua `Bearer` routes |
    | `X-API-Key: rsk_...` | Programmatic tanpa website | `GET /v1/assignments`, `GET /v1/calendar/preview`, `GET /v1/courses`, `GET /v1/user`, `GET /v1/auth/me` |
    | `Authorization: ApiKey rsk_...` | Alternatif API key | Sama |
    | `X-Bot-Token: <hex> + X-Act-As-User: <userID>` | Bot `resisst-bot` | `/internal/*` + `/v1/assignments` (GET) & `/complete` |

## Common Headers

*   Request ID: optional `X-Request-ID` request → always `X-Request-ID` response (`shared/middleware/request_id.go`).
*   Rate limit: IP bucket `15m TTL` untuk `AuthRateLimit`, prefix bucket `apikey:<12>` untuk `ApiKeyRateLimit`.

## Health and Observability

### `GET /livez`
Liveness — `200 {"status":"ok"}`

### `GET /readyz`
Readiness + DB ping 2s — `200 {"status":"ready"}` atau `503 {"status":"not_ready","error":"db_ping_failed"|"db_unavailable"}` (`shared/router/router.go:56`)

### `GET /healthz` — alias liveness

### `GET /metrics` — Prometheus
`resisst_http_requests_total{method,path,status}` counter + `resisst_http_request_latency_ms` histogram 5-5000ms (`shared/middleware/metrics.go`)

### `GET /openapi.json` & `GET /v1/openapi.json` — OpenAPI doc (`shared/docs/openapi.json`)

---

## Authentication Endpoints

Semua ada legacy `/auth/*` dan versioned `/v1/auth/*` — prefer `/v1`.

### `GET /v1/auth/google/login`
OAuth redirect 307 ke Google (`offline` + `include_granted_scopes`), set `oauth_state` cookie 600s.

### `GET /v1/auth/google/callback`
Validasi state, `ExchangeGoogleCode`, `FetchGoogleUser` (`oauth2/v3/userinfo`), `UpsertGoogleUser` (check `@student.itera.ac.id`), `CreateRefreshToken` 48B base64url, set `refresh_token` httpOnly, redirect `FRONTEND_URL+SUCCESS_PATH` atau `ERROR_PATH`. Detail: `internal/modules/auth/README.md`.

### `POST /v1/auth/refresh`
Rotate cookie, issue JWT — grace 30s race, reuse → `RevokeAll`.
```json
{"access_token":"jwt","token_type":"Bearer","expires_at":"2026-03-13T10:00:00Z","user":{"id":"uuid","email":"...","name":"..."}}
```
`401 {"error":"invalid refresh token"}`

### `POST /v1/auth/logout`
Revoke refresh (best effort) → `204`.

### `GET /v1/auth/me` — `Bearer` atau `X-API-Key`
```json
{"id":"uuid","email":"...@student.itera.ac.id","name":"...","avatar_url":"...","email_verified":true}
```

### `POST /v1/auth/sync` — `Bearer` only
Trigger sinkronisasi LMS untuk user yang sudah login. Fetch & persist per provider (`moodle`/`google_classroom`) via `calendar.Service`. Jika tidak ada provider enabled → `400 {"error":"no_lms_configured"}`. Response:
```json
{"total_events":5,"new_assignments":[{"title":"Tugas 1","course":"Pemro","deadline":"2026-03-14T12:00:00Z","source":"moodle"}]}
```

---

## User Endpoints

`GET /v1/user` `Bearer` **atau** `X-API-Key`; mutasi `Bearer` only (via BFF).

### `GET /v1/user`
```json
{
  "id":"uuid","email":"...","name":"...","avatar_url":"...","whatsapp_number":"62812xxxx","whatsapp_enabled":true,
  "telegram_chat_id":"123456","telegram_enabled":true,"moodle_enabled":true,"moodle_calendar_url":"https://...",
  "google_classroom_enabled":true,"google_connected":true,"telegram_bot_username":"resisst_bot",
  "reminder_hours":"[24,12]","morning_briefing":false,"muted_courses":"[]","course_aliases":{},"class_code":null,"available_class_codes":[],
  "lms_last_synced_at":"...","moodle_last_synced_at":"...","google_last_synced_at":"...","created_at":"..."}
```

### `PUT /v1/user` — `Bearer` only
Body semua optional:
```json
{"whatsapp_number":"62812xxxx","whatsapp_enabled":true,"telegram_chat_id":"123456","telegram_enabled":true,"moodle_enabled":true,"moodle_calendar_url":"https://moodle/.../calendar.ics","google_classroom_enabled":true,"reminder_hours":"[24,12]","morning_briefing":false,"muted_courses":"[]","course_aliases":{"Pemro":"Pemrograman"},"class_code":"A","available_class_codes":["A","B"]}
```
`400 {"error":"invalid whatsapp number"|"invalid moodle calendar url"}`

### `POST /v1/user/google/disconnect` — `Bearer` only
Clear tokens + hapus `events WHERE source=google_classroom` → `200 {"success":true}`

### `POST /v1/user/telegram/verify-code` — `Bearer` only
Generate 6-char `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` valid 10m → `200 {"code":"ABCDEFG1","expires_at":"..."}`. Bot verifikasi via `/internal/telegram/verify`.

### `GET /v1/user/course-aliases` · `POST` · `DELETE` — `Bearer` only
CRUD alias. Body `{"original_name":"Pemro","alias":"Pemrograman"}`.

---

## Assignment Endpoints

### `GET /v1/assignments` — `Bearer` | `X-API-Key` | `X-Bot-Token+X-Act-As-User`
List tugas terfilter (muted/class/keyword), `ORDER deadline ASC`. Bot & API key support.

### `POST /v1/assignments/complete` — `Bearer` | `X-Bot-Token+X-Act-As-User`
Body `{"assignment_id":"uuid"}` → `200 {"success":true,"message":"Assignment marked as completed","completed_at":"..."}`

---

## Course Endpoints

### `GET /v1/courses` — `Bearer` | `X-API-Key`
Daftar matkul unik dari events (filter keyword) → `{"courses":[{"id":"Pemro","name":"Pemro"}]}`

---

## Telegram Endpoints — `Bearer` only

### `POST /v1/telegram/test-reminder`
Kirim test reminder ke chat_id user (butuh `telegram_enabled && telegram_chat_id`).

### `POST /v1/telegram/test-briefing`
Kirim morning briefing test.

Keduanya sender-only (aman multi-replica); polling lives in `bot/` (`bot/README.md`).

---

## API Keys (Programmatic Access)

### Manage via website — JWT required

*   `POST /v1/api-keys` `{name 1-64, expires_in_days 1-3650 optional omit=never}` → `201 {"id","name","prefix":"rsk_abc123","api_key":"rsk_... (sekali)","expires_at","created_at"}`
*   `GET /v1/api-keys` → `{"keys":[{"id","name","prefix","expires_at","last_used_at","revoked_at","created_at"}]}`
*   `DELETE /v1/api-keys/:id` → `{"success":true}`

Max 5 aktif/user. Rate 60/min per prefix bucket 15m.

### Pakai API key (tanpa website)

```bash
# buat key sekali via Dashboard → API Keys

curl -H "X-API-Key: rsk_xxx" https://resisst-api.nodryx.com/v1/assignments
curl -H "Authorization: ApiKey rsk_xxx" https://resisst-api.nodryx.com/v1/assignments
curl -H "X-API-Key: rsk_xxx" "https://resisst-api.nodryx.com/v1/calendar/preview?sort=deadline_asc"
curl -H "X-API-Key: rsk_xxx" https://resisst-api.nodryx.com/v1/courses
curl -H "X-API-Key: rsk_xxx" https://resisst-api.nodryx.com/v1/user
```

BFF proxy: `GET/POST /api/api-keys` dan `DELETE /api/api-keys/:id`.

---

## Calendar Endpoints — `Bearer` | `X-API-Key`

Cache-based (baca `events` table). Sorting `deadline_asc|deadline_desc|newest|oldest`.

### `GET /v1/calendar/preview?force&sort`

| Query | Deskripsi |
|-------|-----------|
| `force=true` | Force `SyncProviders` sebelum response (live fetch) |
| `sort` | `deadline_asc` (default) / `deadline_desc` / `newest` / `oldest` — via `pkg/sortutil` |

Response `200`:
```json
{
  "events":[{"id":"uuid","title":"Tugas 1","course":"Pemrograman","deadline":"2026-03-14T12:00:00Z","timeRemaining":"1 hari 2 jam","deadlineDate":"2026-03-14T12:00:00Z","source":"google_classroom","completed":false}],
  "sources":[{"provider":"google_classroom","count":1,"success":true}],
  "total":1,"successfulSources":1,"failedSources":0,"fromCache":true,
  "lastSyncedAt":"2026-03-13T08:00:00Z","nextRefreshAt":"2026-03-13T09:00:00Z"
}
```

### `POST /v1/calendar/test`

Validate providers tanpa pakai cache. Body:
```json
{"moodle_calendar_url":"https://moodle/.../calendar.ics","test_moodle":true,"test_google":false}
```
`400 {"error":"No LMS source configured for testing"}`

---

## Internal Bot Endpoints — Service-to-Service

Guard `RequireBotService`: `X-Bot-Token: <BOT_SERVICE_TOKEN>` (`shared/middleware/bot_auth.go`). Empty token → `503`. Dipakai `bot/internal/client/api.go`.

### `GET /internal/users/by-telegram/:chatID`
→ `{"id","name","telegram_enabled","telegram_chat_id","telegram_username"}`

### `GET /internal/users/:id`
→ `{"id","name","telegram_enabled","telegram_chat_id","morning_briefing","reminder_hours","muted_courses","class_code"}`

### `POST /internal/telegram/verify`
Body `{"code":"ABCDEF","chat_id":"123456","telegram_username":"johndoe"}` — `WHERE telegram_verify_code=? AND expires>NOW()` → update `telegram_chat_id/enabled` → `{"success":true,"name":"..."}`

### `GET /internal/scheduler/due?hours_before=24&window_minutes=30`
Due assignments `deadline BETWEEN target-window AND target+window` where `completed=false && telegram_enabled && chat_id NOT NULL`.

### `POST /internal/scheduler/mark-sent`
Body `{"assignment_id":"uuid","key":"24h"}` — append `reminders_sent`.

### `GET /internal/scheduler/briefing-candidates`
`WHERE telegram_enabled && morning_briefing && chat_id NOT NULL`.

---

## Frontend BFF Proxy Endpoints (Hono, Vercel Functions)

`frontend/server/app.ts` proxies (browser `fetch /api/*` → BFF → backend):

| BFF | → Backend |
|-----|-----------|
| `GET /api/assignments` | `GET /v1/assignments` |
| `POST /api/assignments/complete` | `POST /v1/assignments/complete` |
| `GET /api/courses` | `GET /v1/courses` |
| `GET/PUT /api/user` | `GET/PUT /v1/user` |
| `POST /api/user/google/disconnect` | `POST /v1/user/google/disconnect` |
| `POST /api/user/telegram/verify-code` | `POST /v1/user/telegram/verify-code` |
| `GET/POST /api/test-calendar` | `GET /v1/calendar/preview` / `POST /v1/calendar/test` (`?force&sort`) |
| `POST /api/telegram/test-reminder` | `POST /v1/telegram/test-reminder` |
| `POST /api/telegram/test-briefing` | `POST /v1/telegram/test-briefing` |
| `POST /api/auth/backend/sync` | `POST /v1/auth/refresh` + `/v1/auth/me` + `/v1/auth/sync` |
| `GET/POST /api/api-keys` | `GET/POST /v1/api-keys` |
| `DELETE /api/api-keys/:id` | `DELETE /v1/api-keys/:id` |

Browser wajib lewat BFF (cookie httpOnly). Konsumen programmatic hit backend langsung dengan `X-API-Key`.
