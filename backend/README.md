# resisst-api — Go Backend

> Stateless Go API untuk auth, agregasi LMS (Moodle + Google Classroom), dan notifikasi. Deploy di `resisst-api.nodryx.com` (Coolify / Docker Compose).

**Stack:** Go 1.25 · Gin · GORM (Postgres) · JWT (access 15m + refresh 30d) · Prometheus · cron (LMS sync)

---

## Quick Start

```bash
cp .env.example .env   # isi DATABASE_URL, JWT_ACCESS_SECRET, GOOGLE_*
go mod tidy
go run ./cmd/api       # :8080
# cek
curl http://localhost:8080/livez
curl http://localhost:8080/readyz
```

Docker:
```bash
docker compose up -d --build api db
docker compose logs -f api
```

---

## Arsitektur

```
cmd/api/main.go
  → config.Load() → database.New() → app.New() → router.New() → http.Server
                                          │
                                          ├─→ lmssync.Scheduler (cron WIB, optional)
                                          └─→ Gin router (lihat shared/router/router.go:24)
```

### DI Container — `internal/app/container.go:16`

```go
type Container struct {
  Config *config.Config
  DB     *gorm.DB
  Auth       *auth.Module       // OAuth + JWT
  User       *user.Module
  Calendar   *calendar.Module   // agregasi LMS
  Course     *course.Module
  Internal   *botservice.Module // /internal/* untuk bot
  TelegramSender *telegram.Module // sender-only, never polls
  Assignment *assignment.Module
  ApiKey     *apikey.Module
}
```

Urutan inisialisasi: `calendar` dulu → inject `calendar.Service` ke `auth.Handler` via `SetCalendarProvider` untuk `POST /v1/auth/sync`.
`telegram.New` graceful nil jika `TELEGRAM_BOT_TOKEN=""` (endpoint `/v1/telegram/test-*` return 503).

Lihat detail per paket: [`internal/app/`](internal/app/README.md) · [`internal/config/`](internal/config/README.md) · [`internal/database/`](internal/database/README.md) · [`internal/models/`](internal/models/README.md) · [`internal/shared/`](internal/shared/README.md) · [`internal/pkg/`](internal/pkg/README.md)

---

## Environment

Semua via `os.Getenv` + `godotenv` (`internal/config/config.go:62`). Daftar lengkap:

| Var | Default | Deskripsi |
|-----|---------|-----------|
| `ENV` | `development` | `production` → `GIN_MODE=release`, `COOKIE_SECURE=true` |
| `PORT` | `8080` | HTTP listen |
| `DATABASE_URL` | `` | `postgresql://...?sslmode=disable` |
| `AUTO_MIGRATE` | `env != production` | `true` → `AutoMigrate(User,RefreshToken,Event,Course,ApiKey)` |
| `REQUEST_TIMEOUT_SECONDS` | `15` | Per-request `context.WithTimeout` (`shared/middleware/timeout.go`) |
| `SHUTDOWN_TIMEOUT_SECONDS` | `20` | Graceful shutdown (`cmd/api/main.go`) |
| `AUTH_RATE_LIMIT_PER_MINUTE` | `30` | IP bucket untuk `/auth/*` |
| `AUTH_RATE_LIMIT_BURST` | `10` | Burst auth |
| `GOOGLE_CLIENT_ID` / `SECRET` / `REDIRECT_URL` | `` | OAuth2 (`/v1/auth/google/callback` prefer) |
| `ALLOWED_EMAIL_DOMAIN` | `student.itera.ac.id` | Domain check di `auth.Service.UpsertGoogleUser` |
| `JWT_ACCESS_SECRET` | `` | HMAC HS256, `iss=resisst-api` `aud=resisst-frontend` |
| `ACCESS_TOKEN_TTL_MINUTES` | `15` | TTL access JWT |
| `REFRESH_TOKEN_TTL_HOURS` | `720` | 30 hari, simpan `sha256` di `refresh_tokens` |
| `FRONTEND_URL` | `http://localhost:3000` | Redirect setelah OAuth |
| `FRONTEND_SUCCESS_PATH` | `/login?auth=success` | Path sukses |
| `FRONTEND_ERROR_PATH` | `/login` | Path error |
| `COOKIE_DOMAIN` / `COOKIE_SECURE` | `` / `env==production` | `refresh_token` httpOnly |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | CORS `AllowOrigins` (comma-separated) |
| `TELEGRAM_BOT_TOKEN` | `` | Kosong → telegram sender disabled |
| `BOT_SERVICE_TOKEN` | `` | `X-Bot-Token` untuk `/internal/*` (kosong → 503) |
| `API_KEY_PREFIX` | `rsk_` | Prefix API key |
| `API_KEY_MAX_PER_USER` | `5` | Max key aktif |
| `API_KEY_RATE_LIMIT_PER_MINUTE` / `BURST` | `60` / `20` | Bucket `apikey:<prefix12>` 15m TTL |
| `LMS_SYNC_ENABLED` | `true` | Enable cron LMS daily |
| `LMS_SYNC_CRON` | `0 7 * * *` | Cron WIB (lihat `lmssync/scheduler.go`) |
| `LMS_SYNC_BATCH_SIZE` / `CONCURRENCY` / `TIMEOUT` | `200` / `2` / `90` | Batch sync |

Lihat `backend/.env.example:1` untuk template.

---

## Routes — Single Source of Truth `shared/router/router.go:24`

### Public (no auth)

| Method | Path | Deskripsi |
|--------|------|-----------|
| `GET` | `/livez` | Liveness `{status:ok}` |
| `GET` | `/healthz` | Alias liveness |
| `GET` | `/readyz` | Readiness + DB ping 2s (`db_ping_failed` → 503) |
| `GET` | `/metrics` | Prometheus (`resisst_http_requests_total`, `resisst_http_request_latency_ms`) |
| `GET` | `/openapi.json` | OpenAPI spec |
| `GET` | `/v1/openapi.json` | Alias versioned |

### Auth — `auth` (`shared/router/router.go:147`)

Rate-limited `30/min` + `Burst 10`. Legacy `/auth/*` + versioned `/v1/auth/*`:

| Method | Path | Middleware | Handler |
|--------|------|------------|---------|
| `GET` | `/v1/auth/google/login` | `AuthRateLimit` | `GoogleLogin` (302 → Google, set `oauth_state` 600s) |
| `GET` | `/v1/auth/google/callback` | `AuthRateLimit` | `GoogleCallback` (state check, `ExchangeGoogleCode`, upsert user) |
| `POST` | `/v1/auth/refresh` | `AuthRateLimit` | `Refresh` (rotate cookie, issue JWT) |
| `POST` | `/v1/auth/logout` | `AuthRateLimit` | `Logout` (revoke, clear cookie) |
| `GET` | `/v1/auth/me` | `AccessToken` | `Me` |
| `POST` | `/v1/auth/sync` | `AccessToken` | `SyncAfterLogin` (fetch & persist LMS) |

### API Keys — `apikey` (`router.go:90`)

JWT only (`AccessToken`):

| Method | Path | Deskripsi |
|--------|------|-----------|
| `GET` | `/v1/api-keys` | List keys |
| `POST` | `/v1/api-keys` | Create `{name, expires_in_days 1-3650}` → `rsk_...` (sekali) |
| `DELETE` | `/v1/api-keys/:id` | Revoke |

### User — `user` (`router.go:100`)

| Method | Path | Middleware | Deskripsi |
|--------|------|-----------|-----------|
| `GET` | `/v1/user` | `APIKeyOrJWT + ApiKeyRateLimit` | Profile + settings |
| `PUT` | `/v1/user` | `AccessToken` | Update settings (validasi WA, Moodle URL, classcode) |
| `POST` | `/v1/user/google/disconnect` | `AccessToken` | Clear tokens + hapus events `google_classroom` |
| `GET/POST/DELETE` | `/v1/user/course-aliases` | `AccessToken` | CRUD alias matkul |
| `POST` | `/v1/user/telegram/verify-code` | `AccessToken` | Generate 6-char code 10m |

### Calendar & Courses — JWT atau `X-API-Key` (`router.go:109`)

| Method | Path | Middleware | Deskripsi |
|--------|------|-----------|-----------|
| `GET` | `/v1/calendar/preview?force&sort` | `APIKeyOrJWT + RateLimit` | Cache atau force sync, sort `deadline_asc/desc/newest/oldest` |
| `POST` | `/v1/calendar/test` | `APIKeyOrJWT + RateLimit` | Test sync tanpa cache |
| `GET` | `/v1/courses` | `APIKeyOrJWT + RateLimit` | Daftar matkul unik (filter keyword) |

Header API key: `X-API-Key: rsk_...` atau `Authorization: ApiKey rsk_...` (lihat `API_DOCUMENTATION.md:14`).

### Telegram sender — JWT (`router.go:132`)

| Method | Path | Deskripsi |
|--------|------|-----------|
| `POST` | `/v1/telegram/test-reminder` | Kirim test reminder (butuh `telegram_enabled && chat_id`) |
| `POST` | `/v1/telegram/test-briefing` | Morning briefing test |

> Sender-only, aman dari N replica. Polling lives in `bot/` (replicas=1).

### Assignments — bot/API key/JWT (`router.go:139`)

| Method | Path | Middleware | Deskripsi |
|--------|------|-----------|-----------|
| `GET` | `/v1/assignments` | `BotOrAPIKeyOrJWT + RateLimit` | List tugas (muted/class/keyword filter, deadline ASC) |
| `POST` | `/v1/assignments/complete` | `BotOrAccessToken` | `{assignment_id}` → `completed=true` |

### Internal — Service-to-service untuk `bot/` (`router.go:123`)

`RequireBotService(BOT_SERVICE_TOKEN)` + `X-Bot-Token`. Bot impersonasi via `X-Act-As-User` untuk `/v1/*`.

| Method | Path | Deskripsi |
|--------|------|-----------|
| `GET` | `/internal/users/by-telegram/:chatID` | Lookup user by `telegram_chat_id` |
| `GET` | `/internal/users/:id` | Get user |
| `POST` | `/internal/telegram/verify` | `{code, chat_id, telegram_username?}` → link Telegram |
| `GET` | `/internal/scheduler/due?hours_before&window_minutes` | Due assignments ±30m window |
| `POST` | `/internal/scheduler/mark-sent` | `{assignment_id, key}` append `reminders_sent` |
| `GET` | `/internal/scheduler/briefing-candidates` | Users `telegram_enabled && morning_briefing` |

---

## Modules

Setiap module punya `README.md` sendiri — klik untuk detail:

| Module | Lokasi | Deskripsi |
|--------|--------|-----------|
| `auth` | [`internal/modules/auth/`](internal/modules/auth/README.md) | Google OAuth, JWT, refresh rotation, `sync` |
| `user` | [`internal/modules/user/`](internal/modules/user/README.md) | Profile & settings, course-alias, verify-code |
| `calendar` | [`internal/modules/calendar/`](internal/modules/calendar/README.md) | Agregasi Moodle+GC, preview, `sync/` |
| `course` | [`internal/modules/course/`](internal/modules/course/README.md) | Daftar matkul unik |
| `assignment` | [`internal/modules/assignment/`](internal/modules/assignment/README.md) | List & complete tugas |
| `apikey` | [`internal/modules/apikey/`](internal/modules/apikey/README.md) | `rsk_` keys, validate, rate limit |
| `botservice` | [`internal/modules/botservice/`](internal/modules/botservice/README.md) | `/internal/*` untuk `bot/` |
| `telegram` | [`internal/modules/telegram/`](internal/modules/telegram/README.md) | Sender-only test endpoints |
| `lmssync` | [`internal/modules/lmssync/`](internal/modules/lmssync/README.md) | Cron batch sync harian 07:00 WIB |

Core: [`app/`](internal/app/README.md) · [`config/`](internal/config/README.md) · [`database/`](internal/database/README.md) · [`models/`](internal/models/README.md) · [`shared/`](internal/shared/README.md) · [`pkg/`](internal/pkg/README.md)

---

## Google OAuth

Set redirect URI di Google Cloud Console ke:

```
https://resisst-api.nodryx.com/v1/auth/google/callback
# legacy alias juga aktif: /auth/google/callback
```

Scopes: `openid` + `userinfo.email` + `userinfo.profile` + `classroom.courses.readonly` + `classroom.coursework.me.readonly`.

---

## Observability

*   `JSONAccessLogger` (`shared/middleware/logging.go`) — JSON line: `request_id, method, path, status, latency_ms`.
*   `HTTPMetrics` (`shared/middleware/metrics.go`) — `resisst_http_requests_total{method,path,status}` + `resisst_http_request_latency_ms` histogram.
*   `RequestID` (`shared/middleware/request_id.go`) — propagate `X-Request-ID`.
*   `TimeoutContext` (`shared/middleware/timeout.go`) — 15s default, 504 jika `DeadlineExceeded`.

---

## Referensi

*   Full API: [`API_DOCUMENTATION.md`](API_DOCUMENTATION.md)
*   OpenAPI: `GET /openapi.json`
*   Backup: [`ops/backup/README.md`](../ops/backup/README.md)
*   Bot: [`bot/README.md`](../bot/README.md)
