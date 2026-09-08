# config — Environment Loader

> Lokasi: `internal/config/config.go:11` | Env via `os.Getenv` + `godotenv`

Semua konfigurasi aplikasi terpusat di `Config` struct. Tidak ada YAML/JSON — murni env.

## Struktur

| File | Peran |
|------|-------|
| `config.go:11` | `type Config` (60+ fields) + `Load()` + helpers `getEnv*` |

## Load

```go
cfg, err := config.Load() // godotenv.Load() (ignore error) → baca os.Getenv
```

Helpers: `getEnv(key, fallback)`, `getEnvAsInt`, `getEnvAsBool`, `getEnvAsList` (comma-separated).

## Fields Lengkap

Lihat `config.go:11`. Ringkas:

*   **Server:** `ENV`, `PORT`, `DATABASE_URL`, `AUTO_MIGRATE` (`env != production` default true)
*   **Timeout:** `REQUEST_TIMEOUT_SECONDS=15`, `SHUTDOWN_TIMEOUT_SECONDS=20`
*   **Auth:** `AUTH_RATE_LIMIT_PER_MINUTE=30/BURST=10`, `GOOGLE_*`, `ALLOWED_EMAIL_DOMAIN`, `JWT_ACCESS_SECRET`, `ACCESS_TOKEN_TTL_MINUTES=15`, `REFRESH_TOKEN_TTL_HOURS=720`, `FRONTEND_URL`, `COOKIE_*`
*   **Bot:** `TELEGRAM_BOT_TOKEN`, `BOT_SERVICE_TOKEN` (empty → `/internal/*` 503), `ALLOWED_ORIGINS`
*   **API Key:** `API_KEY_PREFIX=rsk_`, `MAX_PER_USER=5`, `RATE_LIMIT 60/20`
*   **LMS Sync:** `LMS_SYNC_ENABLED=true`, `CRON=0 7 * * *`, `BATCH=200`, `CONCURRENCY=2`, `TIMEOUT=90`

## Contoh `.env`

Lihat `backend/.env.example:1` (36 baris).

## Catatan

*   `godotenv.Load()` optional — di production (Coolify/compose) env sudah di-inject, file `.env` tidak wajib.
*   `AllowedOrigins` di-split `,` dan di-trim (`getEnvAsList`).
