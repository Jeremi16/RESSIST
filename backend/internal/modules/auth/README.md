# auth — Google OAuth + JWT + Refresh + Sync-after-login

> Lokasi: `internal/modules/auth/` | DI: `internal/app/container.go:37` | Router: `shared/router/router.go:147`

Tanggung jawab: login Google, upsert user, rotasi refresh token (reuse detection), issue JWT, dan sinkronisasi LMS setelah login.

## Struktur File

| File | Peran |
|------|-------|
| `module.go` | `type Module{Service,*Handler,TokenService}` + `New(db,cfg)` + `SetCalendarProvider` |
| `service.go` | `Service{db,cfg,tokens,oauthCfg,client}` — `UpsertGoogleUser`, `CreateRefreshToken`, `RotateRefreshToken`, `ExchangeGoogleCode`, `FetchGoogleUser` |
| `token.go` | `TokenService{secret,ttl,iss=ressist-api,aud=ressist-frontend}` — `GenerateAccessToken`, `ParseAccessToken` (HS256) |
| `handler.go` (621 baris) | 6 handler: `GoogleLogin`, `GoogleCallback`, `Refresh`, `Logout`, `Me`, `SyncAfterLogin` |
| `routes.go` | `RegisterRoutes` dipanggil dari `router.registerAuthRoutes` |

## Routes

Semua di-mount 2x: legacy `/auth/*` + versioned `/v1/auth/*` (`router.go:79`). Rate-limit `AuthRateLimit(30,10)`.

| Method | Path | Middleware | Handler | Deskripsi |
|--------|------|------------|---------|-----------|
| `GET` | `/v1/auth/google/login` | `AuthRateLimit` | `GoogleLogin` | 302 redirect ke Google, set `oauth_state` cookie 600s, `offline+include_granted_scopes` |
| `GET` | `/v1/auth/google/callback` | `AuthRateLimit` | `GoogleCallback` | Validasi state, `ExchangeGoogleCode` (15s client), `FetchGoogleUser` `https://www.googleapis.com/oauth2/v3/userinfo`, `UpsertGoogleUser` (domain `@student.itera.ac.id` else `ErrEmailDomainNotAllowed`), `UpsertGoogleTokens` (`google_classroom_enabled=true`, `lms_last_synced_at=null`), `CreateRefreshToken` (48B base64url raw → `sha256` hash), set `refresh_token` httpOnly + redirect `FRONTEND_URL+SUCCESS_PATH` |
| `POST` | `/v1/auth/refresh` | `AuthRateLimit` | `Refresh` | Baca cookie, `RotateRefreshToken` (atomik revoke old + create new, grace 30s race), reuse → `RevokeAll`, issue `GenerateAccessToken` 15m |
| `POST` | `/v1/auth/logout` | `AuthRateLimit` | `Logout` | Revoke current refresh (best effort) → `204`, clear cookie |
| `GET` | `/v1/auth/me` | `AccessToken` | `Me` | `{id,email,name,avatar_url,email_verified}` |
| `POST` | `/v1/auth/sync` | `AccessToken` | `SyncAfterLogin` | Trigger manual sync (lihat bawah) |

## SyncAfterLogin

Injected `CalendarProvider` (`GetEnabledProviders`, `FetchProviderAssignments`) + `CalendarSyncService` (`PersistAssignments`) dari `app/container.go:42`.

Flow `handler.go:SyncAfterLogin`:

1. `AuthenticatedUserID` → load `User`.
2. Jika `calendar==nil` atau `len(GetEnabledProviders)==0` → `{error:no_lms_configured}` 400.
3. Per provider (`moodle`/`google_classroom`): `FetchProviderAssignments` → `PersistAssignments` (via `internal/modules/calendar/sync/service.go`).
4. Update `moodle_last_synced_at` / `google_classroom_last_synced_at` + `lms_last_synced_at`.

Return `loginSyncResult{TotalEvents, NewAssignments[]loginNewAssignment{Title,Course,Deadline,Source}}`.

## Dependencies

*   `*gorm.DB`, `*config.Config`, `*TokenService`, `CalendarProvider`, `CalendarSyncService`, `golang.org/x/oauth2`.

## Env

`GOOGLE_CLIENT_ID/SECRET/REDIRECT_URL`, `ALLOWED_EMAIL_DOMAIN`, `JWT_ACCESS_SECRET`, `ACCESS_TOKEN_TTL_MINUTES=15`, `REFRESH_TOKEN_TTL_HOURS=720`, `FRONTEND_URL`.

## Contoh

```bash
# login (browser)
curl -v http://localhost:8080/v1/auth/google/login

# refresh (cookie)
curl -X POST http://localhost:8080/v1/auth/refresh -b "refresh_token=..."

# me
curl -H "Authorization: Bearer <jwt>" http://localhost:8080/v1/auth/me

# sync after login
curl -X POST -H "Authorization: Bearer <jwt>" http://localhost:8080/v1/auth/sync
```

## Gotcha

*   State cookie `oauth_state` wajib `Secure` jika `COOKIE_SECURE=true`.
*   `GoogleRefreshToken` hanya dapat saat `access_type=offline` pertama kali; simpan permanen, refresh via `oauth2.Config.TokenSource`.
*   `Refresh` grace 30s untuk race double-submit dari BFF.
