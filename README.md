# Ressist — Assignment Reminder Monorepo

<p align="center">
  <img src="logo.png" alt="Ressist logo" width="120" />
</p>

> Sistem pengingat tugas kuliah untuk mahasiswa ITERA: agregasi **Moodle (ICS)** + **Google Classroom**, notifikasi Telegram, dashboard web, dan aplikasi Android native.

Monorepo 4 service yang bisa di-deploy terpisah + tooling ops:

| Service | Stack | Lokasi | Deploy target |
|---------|-------|--------|---------------|
| **frontend** | Vite 6 + React 19 + Hono BFF + Bun | `frontend/` | Vercel |
| **backend (api)** | Go 1.25 + Gin + GORM + Postgres 16 | `backend/` | Homeserver/Coolify `https://ressist-api.jsx.qzz.io` |
| **bot** | Go 1.25 + tgbotapi + cron | `bot/` | Homeserver (single replica, long-polling) |
| **mobile-kmp** | Kotlin Multiplatform + Jetpack Compose | `mobile-kmp/` | Sideload APK via GitHub Release (saat ini v0.3.0) |

Link cepat: [Download App](frontend/app/app/) · [Changelog](frontend/app/change-log/) · [API docs](backend/API_DOCUMENTATION.md) · [Mobile](mobile-kmp/README.md) · [Backup](ops/backup/README.md)

---

## Fitur utama

*   **Agregasi LMS** — Moodle (ICS/URL) + Google Classroom (`classroom.courses.readonly`, `classroom.coursework.me.readonly`), preview + force sync, sort `deadline_asc/desc/newest/oldest`.
*   **Bot Telegram** — `/tugas`, `/hariini`, `/minggu`, `/selesai <id>` + inline `✅`, morning briefing 07:00 WIB + reminder H-24/12/6/3/1 jam, link akun via kode 6-char dari dashboard.
*   **Dashboard web** — login Google (khusus `student.itera.ac.id`), kalender, matkul + alias, API keys `rsk_`, halaman statis (docs, FAQ, guide, changelog, download).
*   **Android native (KMP)** — login Google native, overview, tugas, kalender, LMS, pengingat lokal + briefing (lihat `mobile-kmp/README.md`).
*   **API untuk integrasi** — JWT atau `X-API-Key: rsk_...`, rate limit, Prometheus metrics, OpenAPI di `GET /openapi.json`.

---

## Arsitektur

```
Browser (Vite SPA, react-router-dom)
   │  fetch /api/*  (same-origin)
   ▼
Hono BFF (Vercel Functions / Bun serve dist/ + /api/*)
   │  refresh httpOnly cookie → Bearer JWT → proxy
   ▼
Go API :8080  ──→  Postgres :5432
   ▲  /internal/* (X-Bot-Token + X-Act-As-User)
   │
Bot :8081  ──→  Telegram Bot API (getUpdates, sendMessage)
   │  cron WIB
   └──→ API /internal/scheduler/* + /v1/assignments

Android KMP ──→ Go API langsung (Bearer + X-Refresh-Token, prefix /v1)
```

*   **Frontend** tidak pernah pegang secret; semua `VITE_*` ter-bundle ke browser (publik), `BACKEND_API_URL`/`SESSION_SECRET` hanya di BFF.
*   **API** stateless (boleh `docker compose --scale api=N` di belakang LB).
*   **Bot** **wajib 1 replica** — `getUpdates` Telegram eksklusif, 2 poller = `Conflict: terminated by other getUpdates` (`docker-compose.yml:82-85`). API hanya sender (`POST /v1/telegram/test-*`), tidak polling.
*   **Mobile** hit API langsung, dilarang import `frontend/src/*` — hanya meniru behavior-nya (kontrak: `backend/API_DOCUMENTATION.md`).

---

## Struktur repo

```
ressist/
├── frontend/          # Vite SPA + Hono BFF (lihat frontend/README.md)
│   ├── src/           # React pages, App.tsx routing (EN path, konten ID)
│   ├── app/           # Halaman statis (home, /app download, change-log, docs, faq, ...)
│   ├── server/        # Hono app.ts, middleware/auth.ts
│   ├── api/index.ts   # Vercel Functions entry
│   └── vercel.json    # rewrite /api/*, redirect ID→EN, SPA fallback
├── backend/           # Go API (lihat backend/README.md)
│   ├── cmd/api/main.go
│   ├── internal/
│   │   ├── app/       # DI Container
│   │   ├── config/    # env loader
│   │   ├── database/  # postgres + AutoMigrate
│   │   ├── models/    # User, Event, Course, ApiKey, RefreshToken
│   │   ├── modules/   # 9 modules (auth, user, calendar, course, ...)
│   │   ├── shared/    # router, middleware, docs/openapi.json
│   │   └── pkg/       # coursealias, classcode, synckey, ...
│   ├── docs/          # runbook backend (lihat backend/docs/README.md)
│   ├── TELEGRAM_CRON_JOBS.md
│   └── API_DOCUMENTATION.md
├── bot/               # Standalone Telegram poller (lihat bot/README.md)
│   ├── cmd/bot/main.go
│   └── internal/{config,client,telegram,scheduler}/
├── mobile-kmp/        # Android native KMP (lihat mobile-kmp/README.md)
│   ├── shared/        # KMP murni (commonMain/androidMain/iosMain)
│   ├── androidApp/    # Compose UI (applicationId id.ac.itera.ressist, v0.3.0/code 6)
│   └── local.properties.example
├── ops/backup/        # pg_dump → Neon backup (lihat ops/backup/README.md)
├── .github/workflows/ # docker.yml (api+bot → GHCR), mobile-kmp.yml (debug APK)
├── docker-compose.yml # db + api + bot (frontend opsional di Vercel)
├── logo.png           # Logo bersama web + mobile
└── .env.example       # template env untuk compose
```

---

## Quickstart — Docker Compose (paling mudah)

```bash
cp .env.example .env
# isi: DB_PASSWORD, BOT_SERVICE_TOKEN (openssl rand -hex 32), TELEGRAM_BOT_TOKEN, JWT_ACCESS_SECRET, GOOGLE_*, FRONTEND_URL

docker compose up -d --build
docker compose logs -f api bot
# api: http://localhost:8080/livez
# bot: http://localhost:8081/livez
# db:  postgres://ressist:ressist@localhost:5432/ressist
```

Scale API (stateless):

```bash
docker compose up -d --scale api=2
```

> **Jangan** scale bot (`deploy.replicas: 1` di `docker-compose.yml:82-85`).

---

## Quickstart — Manual dev

### Backend

```bash
cd backend
cp .env.example .env   # isi DATABASE_URL, JWT_ACCESS_SECRET, GOOGLE_*
go mod tidy
go run ./cmd/api       # :8080
curl http://localhost:8080/livez
```

### Bot (butuh API jalan)

```bash
cd bot
cp .env.example .env    # API_BASE_URL=http://localhost:8080
go run ./cmd/bot        # :8081 + polling
curl http://localhost:8081/livez
```

### Frontend

```bash
cd frontend
cp .env.example .env
bun install
bun run dev             # Vite :5173 + BFF :3001 (proxy /api → :3001)
# atau pisah:
bun run dev:bff         # Hono :3001 (butuh Go API jalan)
```

Build:

```bash
bun run build           # tsc --noEmit && vite build → dist/
```

### Mobile KMP (Android)

Prasyarat: JDK 17 + Android SDK (`compileSdk 35`). Buka folder `mobile-kmp/` di Android Studio, atau via CLI:

```bash
cd mobile-kmp
cp local.properties.example local.properties
# sesuaikan: sdk.dir, ressist.apiBaseUrl=http://10.0.2.2:8080 (emulator),
# device fisik: http://<LAN-IP>:8080; ressist.googleWebClientId=<sama dengan backend GOOGLE_CLIENT_ID>
./gradlew :androidApp:assembleDebug   # Windows: gradlew.bat
```

APK debug → `androidApp/build/outputs/apk/debug/`. CI (`mobile-kmp.yml`) build otomatis tiap push ke `main` yang menyentuh `mobile-kmp/` dan upload APK sebagai artifact.

---

## Environment

| File | Deskripsi |
|------|-----------|
| `.env.example` (root) | Untuk `docker-compose.yml` — `DB_*`, `BOT_SERVICE_TOKEN`, `TELEGRAM_BOT_TOKEN`, `JWT_*`, `GOOGLE_*`, TTL sesi |
| `backend/.env.example` | Lengkap 54 baris: `PORT`, `DATABASE_URL`, `GOOGLE_*`, `JWT_*`, `FRONTEND_URL`, `LMS_SYNC_*`, `API_KEY_*` |
| `bot/.env.example` | `API_BASE_URL`, `BOT_SERVICE_TOKEN`, `TELEGRAM_BOT_TOKEN`, `BOT_PORT`, `BOT_POLL_TIMEOUT` |
| `frontend/.env.example` | `VITE_APP_URL`, `VITE_API_URL`, `BACKEND_API_URL`, `SESSION_SECRET`, `SESSION_TTL_DAYS`, `COOKIE_DOMAIN` |
| `mobile-kmp/local.properties.example` | `sdk.dir`, `ressist.apiBaseUrl`, `ressist.googleWebClientId` (gitignored, jangan commit) |

Aturan penting:

*   Frontend: `VITE_*` → ter-bundle ke browser (publik). Tanpa prefix → server-only BFF. `NEXT_PUBLIC_*` masih dibaca sebagai fallback (legacy, jangan dipakai untuk env baru).
*   Sesi: web **3 hari + sliding** (`REFRESH_TOKEN_TTL_HOURS=72`, samakan `SESSION_TTL_DAYS=3` di Vercel, access JWT 60 mnt). Android native **30 hari sliding** (`MOBILE_REFRESH_TOKEN_TTL_HOURS=720`), absolute max 90 hari. **Jangan regenerate secret saat redeploy** — semua sesi user mati.
*   CORS: `ALLOWED_ORIGINS` comma-separated — `http(s)` → `AllowOrigins`, custom scheme (mis. WebView) → `AllowOriginFunc`. Bare domain/path/`*` dilewati dengan warning (tidak panic).
*   `BOT_SERVICE_TOKEN` wajib identik di backend + bot (+ root `.env` untuk compose), kalau kosong `/internal/*` return 503.

---

## Deploy

### Frontend — Vercel

*   Dashboard Vercel → **Root Directory = `frontend`**.
*   `frontend/vercel.json`: build `bun run build`, output `dist`, rewrite `/api/*` → Functions, redirect 301 ID→EN (8 alias: `/tentang`, `/kontak`, `/dokumentasi`, `/fitur`, `/bantuan`, `/privasi`, `/ketentuan`, `/panduan`), SPA fallback `index.html`.
*   Env Vercel: `VITE_APP_URL`, `VITE_API_URL=https://ressist-api.jsx.qzz.io`, `BACKEND_API_URL` (sama), `SESSION_SECRET` (sinkron, min 32 char), `SESSION_TTL_DAYS=3`.

### Backend + Bot — Coolify / Docker Compose

*   Image otomatis via GHCR (`.github/workflows/docker.yml`): `ressist-api` + `ressist-bot`, tag `main`/`latest`/`sha-*`, build tiap push ke `main` yang menyentuh `backend/` atau `bot/`.
*   `docker-compose.yml` production-ready: healthcheck `wget /livez`, `GIN_MODE=release`, `AUTO_MIGRATE=true`.
*   Coolify: set `ALLOWED_ORIGINS=https://<vercel-app>` dan sinkron `BOT_SERVICE_TOKEN` + `JWT_ACCESS_SECRET` di kedua service. Google Cloud Console redirect URI: `https://ressist-api.jsx.qzz.io/v1/auth/google/callback` (alias legacy `/auth/google/callback` masih aktif).
*   Alternatif single-serve frontend di VPS: `SERVE_STATIC=1 bun run server/index.ts` (serve `dist/` + `/api/*` dalam 1 proses, lihat `frontend/nixpacks.toml`).

### Mobile — GitHub Release (sideload)

*   Rilis saat ini **v0.3.0 (`versionCode 6`)**, `applicationId id.ac.itera.ressist`.
*   Signing: keystore rilis di `mobile-kmp/ressist-release.jks` (gitignored, jangan hilang — tanpa key ini tidak bisa publish update dengan `applicationId` yang sama), password di `mobile-kmp/keystore.properties` (gitignored). Build debug juga pakai key ini supaya SHA-1 cocok dengan OAuth client.
*   Checklist rilis: bump `versionCode +1` + `versionName`, 1 commit + 1 tag `vX.Y.Z`, `./gradlew :androidApp:assembleRelease`, verifikasi SHA-1 (`apksigner verify --print-certs` vs Android OAuth client di GCP), upload APK ke GitHub Release — **jangan commit binary ke `releases/`**. Detail + troubleshooting loop consent Google: `mobile-kmp/README.md`.

### Backup

*   `ops/backup/backup_to_neon.sh` — `pg_dump -Fc` lokal → `pg_restore` ke Neon + checksum + retention dump lama + webhook alert opsional.
*   Cron: `0 0 * * * /opt/ressist/ops/backup/backup_to_neon.sh >> /var/log/ressist_backup.log 2>&1` (lihat `ops/backup/crontab.example`). Lensa backend: `backend/docs/backup.md`.

---

## Dokumentasi lanjut

| Dokumen | Deskripsi |
|---------|-----------|
| [`frontend/README.md`](frontend/README.md) | Arsitektur Vite+BFF, routing, deploy Vercel |
| [`backend/README.md`](backend/README.md) | Quickstart Go, tabel routes, DI container, env lengkap |
| [`backend/API_DOCUMENTATION.md`](backend/API_DOCUMENTATION.md) | Referensi API lengkap + contoh `curl` |
| [`backend/docs/README.md`](backend/docs/README.md) | Index runbook backend |
| [`backend/TELEGRAM_CRON_JOBS.md`](backend/TELEGRAM_CRON_JOBS.md) | Cron Telegram sisi backend |
| [`bot/README.md`](bot/README.md) | Poller, scheduler cron WIB, `BOT_SERVICE_TOKEN` |
| [`mobile-kmp/README.md`](mobile-kmp/README.md) | Setup KMP, rilis sideload, roadmap F0–F6 |
| [`ops/backup/README.md`](ops/backup/README.md) | Setup backup Neon |
| [`frontend/GOOGLE_AUTH_ITERA.md`](frontend/GOOGLE_AUTH_ITERA.md) | Google auth ITERA (web) |
| [`frontend/GOOGLE_CLASSROOM_INTEGRATION.md`](frontend/GOOGLE_CLASSROOM_INTEGRATION.md) | Integrasi Classroom (web) |
| Module backend | [`backend/internal/modules/`](backend/internal/modules/) — README per module (9 module: auth, user, calendar, course, assignment, apikey, botservice, telegram, lmssync) + [`shared/`](backend/internal/shared/README.md), [`pkg/`](backend/internal/pkg/README.md), [`models/`](backend/internal/models/README.md) |

---

## Health & Observability

*   `GET /livez` — liveness (200 `{status:ok}`); API `:8080`, bot `:8081`.
*   `GET /readyz` — readiness + DB ping (503 jika `db_ping_failed`).
*   `GET /healthz` — alias liveness.
*   `GET /metrics` — Prometheus (`ressist_http_requests_total`, `ressist_http_request_latency_ms`).
*   `GET /openapi.json` & `GET /v1/openapi.json` — OpenAPI spec.
*   Logging: JSON access log (`shared/middleware/logging.go`) + `X-Request-ID` (`shared/middleware/request_id.go`), per-request timeout 15 dtk default.

---

## CI

*   `docker.yml` — build + push `backend/` → `ghcr.io/.../ressist-api` dan `bot/` → `ghcr.io/.../ressist-bot` (`linux/amd64`, cache GHA).
*   `mobile-kmp.yml` — JDK 17 + Android SDK, assemble `:shared` + `:androidApp:assembleDebug` dengan `apiBaseUrl=https://ressist-api.jsx.qzz.io`, upload APK debug sebagai artifact.

---

## Lisensi

ISC — lihat `package.json`.
