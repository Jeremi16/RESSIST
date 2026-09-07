# Resisst API Documentation

## Base URL

- Production: `https://resisst-api.nodryx.com`
- Local: `http://localhost:8080`

## Auth Model

- OAuth login sets **HttpOnly cookie**: `refresh_token`
- Access token is obtained from `POST /v1/auth/refresh`
- Protected endpoints require header:
  - `Authorization: Bearer <access_token>` (browser via BFF)
  - **OR** `X-API-Key: rsk_...` (programmatic, tanpa buka website) — berlaku untuk `GET /v1/assignments`, `GET /v1/calendar/preview`, `GET /v1/courses`, `GET /v1/user`, `GET /v1/auth/me`
  - Alternative header: `Authorization: ApiKey rsk_...`

## Common Headers

- Request ID:
  - Optional request header: `X-Request-ID`
  - Response always includes: `X-Request-ID`

## Health and Observability

### `GET /livez`
- Purpose: process liveness probe
- Response `200`:
```json
{ "status": "ok" }
```

### `GET /readyz`
- Purpose: readiness probe with DB ping
- Response `200`:
```json
{ "status": "ready" }
```
- Response `503`:
```json
{ "status": "not_ready", "error": "db_ping_failed" }
```

### `GET /healthz`
- Legacy alias of liveness.

### `GET /metrics`
- Prometheus metrics endpoint.

### `GET /openapi.json`
### `GET /v1/openapi.json`
- OpenAPI document.

## Authentication Endpoints

All endpoints also exist in legacy path `/auth/*`.
Recommended: use `/v1/auth/*`.

### `GET /v1/auth/google/login`
- Starts Google OAuth flow.
- Response: `307` redirect to Google.

### `GET /v1/auth/google/callback`
- OAuth callback endpoint.
- Response: `307` redirect to frontend success/error path.
- Side effect: sets `refresh_token` cookie.

### `POST /v1/auth/refresh`
- Reads `refresh_token` cookie, rotates it, returns access token.
- Response `200`:
```json
{
  "access_token": "jwt",
  "token_type": "Bearer",
  "expires_at": "2026-03-13T10:00:00Z",
  "user": {
    "id": "uuid",
    "email": "user@student.itera.ac.id",
    "name": "User Name"
  }
}
```
- Response `401`:
```json
{ "error": "invalid refresh token" }
```

### `POST /v1/auth/logout`
- Revokes current refresh token (best effort).
- Response: `204 No Content`

### `GET /v1/auth/me`
- Protected endpoint.
- Response `200`:
```json
{
  "id": "uuid",
  "email": "user@student.itera.ac.id",
  "name": "User Name",
  "avatar_url": "https://...",
  "email_verified": true
}
```

## User Endpoints

All user endpoints require `Authorization: Bearer <access_token>`.

### `GET /v1/user`
- Get current user profile + settings.
- Response `200`:
```json
{
  "id": "uuid",
  "email": "user@student.itera.ac.id",
  "name": "User Name",
  "avatar_url": "https://...",
  "whatsapp_number": "62812xxxx",
  "whatsapp_enabled": true,
  "telegram_chat_id": "123456",
  "telegram_enabled": true,
  "moodle_enabled": true,
  "moodle_calendar_url": "https://...",
  "google_classroom_enabled": true,
  "google_connected": true,
  "telegram_bot_username": "resisst_bot",
  "reminder_hours": "[24,12]",
  "morning_briefing": false,
  "muted_courses": "[]",
  "created_at": "2026-03-13T10:00:00.000Z"
}
```

### `PUT /v1/user`
- Update user settings.
- Body (all fields optional):
```json
{
  "whatsapp_number": "62812xxxx",
  "whatsapp_enabled": true,
  "telegram_chat_id": "123456",
  "telegram_enabled": true,
  "moodle_enabled": true,
  "moodle_calendar_url": "https://moodle/.../calendar.ics",
  "google_classroom_enabled": true,
  "reminder_hours": "[24,12]",
  "morning_briefing": false,
  "muted_courses": "[]"
}
```
- Response `200`: same shape as `GET /v1/user`
- Response `400` examples:
```json
{ "error": "invalid whatsapp number" }
```
```json
{ "error": "invalid moodle calendar url" }
```

### `POST /v1/user/google/disconnect`
- Disconnect Google Classroom, clear tokens, remove Google Classroom cached events.
- Response `200`:
```json
{ "success": true }
```

## API Keys (Programmatic Access)

Tanpa buka website, cek tugas via `curl` / script pakai API key.

### Manage via website (JWT required)
- `POST /v1/api-keys` — buat key. Body: `{ "name": "curl laptop", "expires_in_days": 30 }` (opsional, 1-3650; omit = never). Response `201`:
```json
{
  "id": "uuid",
  "name": "curl laptop",
  "prefix": "rsk_abc123",
  "api_key": "rsk_... (hanya tampil sekali!)",
  "expires_at": "2026-04-07T00:00:00Z",
  "created_at": "2026-03-07T00:00:00Z"
}
```
- `GET /v1/api-keys` — list keys (`{ "keys": [{ id, name, prefix, expires_at, last_used_at, revoked_at, created_at }] }`)
- `DELETE /v1/api-keys/:id` — revoke key (`{ "success": true }`)
- Max 5 key aktif/user. Rate limit 60/min per key (prefix bucket 15m TTL).

### Pakai API key (tanpa login)
```bash
# buat key sekali via website (Dashboard -> API Keys)

# cek tugas
curl -H "X-API-Key: rsk_xxx" https://resisst-api.nodryx.com/v1/assignments

# alternatif header
curl -H "Authorization: ApiKey rsk_xxx" https://resisst-api.nodryx.com/v1/assignments

# kalender preview
curl -H "X-API-Key: rsk_xxx" "https://resisst-api.nodryx.com/v1/calendar/preview?sort=deadline_asc"

# courses & profile juga bisa
curl -H "X-API-Key: rsk_xxx" https://resisst-api.nodryx.com/v1/courses
curl -H "X-API-Key: rsk_xxx" https://resisst-api.nodryx.com/v1/user
```
BFF proxy: `GET/POST /api/api-keys` dan `DELETE /api/api-keys/:id` (frontend Dashboard tab API Keys).

## Calendar Endpoints

Read endpoints support both auth methods: `Authorization: Bearer <access_token>` **or** `X-API-Key: rsk_...`.
Current implementation is cache-based (reads `events` table only).

### `GET /v1/calendar/preview`
- Returns upcoming assignments from cache.
- Response `200`:
```json
{
  "events": [
    {
      "title": "Tugas 1",
      "course": "Pemrograman",
      "deadline": "2026-03-14T12:00:00Z",
      "timeRemaining": "1 hari 2 jam",
      "deadlineDate": "2026-03-14T12:00:00Z",
      "source": "google_classroom"
    }
  ],
  "sources": [
    { "provider": "google_classroom", "count": 1, "success": true }
  ],
  "total": 1,
  "successfulSources": 1,
  "failedSources": 0,
  "fromCache": true,
  "lastSyncedAt": "2026-03-13T08:00:00Z",
  "nextRefreshAt": "2026-03-13T09:00:00Z"
}
```

### `POST /v1/calendar/test`
- Validate selected providers and return cache preview for selected sources.
- Body:
```json
{
  "moodle_calendar_url": "https://moodle/.../calendar.ics",
  "test_moodle": true,
  "test_google": false
}
```
- Response `200`: same shape as `GET /v1/calendar/preview`
- Response `400` example:
```json
{ "error": "No LMS source configured for testing" }
```

## Frontend BFF Proxy Endpoints (Hono, Vercel Functions)

Frontend `frontend/server/app.ts` proxies key routes to backend:

- `GET/PUT /api/user` -> `/v1/user`
- `POST /api/user/google/disconnect` -> `/v1/user/google/disconnect`
- `GET/POST /api/test-calendar` -> `/v1/calendar/preview|test`
- `POST /api/auth/backend/sync` -> `/v1/auth/refresh` + `/v1/auth/me`
- `GET/POST /api/api-keys` -> `/v1/api-keys`
- `DELETE /api/api-keys/:id` -> `/v1/api-keys/:id`

This is the recommended path for browser calls from frontend UI. External programmatic consumers hit backend directly with `X-API-Key`.
