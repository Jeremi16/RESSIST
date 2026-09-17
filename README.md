# Ressist — Assignment Reminder Monorepo

> Sistem pengingat tugas kuliah untuk mahasiswa ITERA: agregasi **Moodle (ICS)** + **Google Classroom**, notifikasi Telegram, dan manajemen tugas via API.

Monorepo 3 service yang bisa di-deploy terpisah:

| Service | Stack | Lokasi | Deploy target |
|---------|-------|--------|---------------|
| **frontend** | Vite 6 + React 19 + Hono BFF + Bun | `frontend/` | Vercel (`ressist.nodryx.com`) |
| **backend (api)** | Go 1.25 + Gin + GORM + Postgres | `backend/` | Homeserver/Coolify `ressist-api.nodryx.com` |
| **bot** | Go 1.25 + tgbotapi + cron | `bot/` | Homeserver (single replica, long-polling) |

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
   ▲  /internal/* (X-Bot-Token)
   │
Bot :8081  ──→  Telegram Bot API (getUpdates, sendMessage)
   │  cron WIB
   └──→ API /internal/scheduler/* + /v1/assignments
```

*   **Frontend** tidak pernah pegang secret; semua `VITE_*` public ter-bundle, `BACKEND_API_URL`/`SESSION_SECRET` hanya di BFF.
*   **API** stateless (boleh `docker compose --scale api=N` di belakang LB).
*   **Bot** **wajib 1 replica** — `getUpdates` Telegram eksklusif, jika 2 poller akan `Conflict: terminated by other getUpdates` (`docker-compose.yml:83`).

---

## Struktur Repo

```
ressist/
├── frontend/          # Vite SPA + Hono BFF (lihat frontend/README.md)
│   ├── src/           # React pages, App.tsx routing
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
│   │   ├── modules/   # 9 modules (auth, user, calendar, ...)
│   │   ├── shared/    # router, middleware, docs/openapi.json
│   │   └── pkg/       # coursealias, classcode, synckey, ...
│   └── API_DOCUMENTATION.md
├── bot/               # Standalone Telegram poller (lihat bot/README.md)
│   ├── cmd/bot/main.go
│   └── internal/{config,client,telegram,scheduler}/
├── ops/backup/        # pg_dump → Neon backup (lihat ops/backup/README.md)
├── docker-compose.yml # db + api + bot (frontend opsional di Vercel)
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

> **Jangan** scale bot: `deploy.replicas: 1` (`docker-compose.yml:83`).

---

## Quickstart — Manual Dev

### Backend
```bash
cd backend
cp .env.example .env
go mod tidy
go run ./cmd/api        # :8080
```

### Bot (butuh API jalan)
```bash
cd bot
cp .env.example .env    # API_BASE_URL=http://localhost:8080
go run ./cmd/bot        # :8081 + polling
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
go build ./...          # backend
```

---

## Environment

| File | Deskripsi |
|------|-----------|
| `.env.example` (root) | Untuk `docker-compose.yml` — `DB_*`, `BOT_SERVICE_TOKEN`, `TELEGRAM_BOT_TOKEN`, `JWT_*`, `GOOGLE_*` |
| `backend/.env.example` | Lengkap 36 baris: `PORT`, `DATABASE_URL`, `GOOGLE_*`, `JWT_*`, `FRONTEND_URL`, `LMS_SYNC_*`, `API_KEY_*` |
| `bot/.env.example` | `API_BASE_URL`, `BOT_SERVICE_TOKEN`, `TELEGRAM_BOT_TOKEN`, `BOT_PORT` |
| `frontend/.env.example` | `VITE_APP_URL`, `VITE_API_URL`, `BACKEND_API_URL`, `SESSION_SECRET`, `COOKIE_DOMAIN` |

Aturan frontend env:
*   `VITE_*` → ter-bundle ke browser (publik).
*   Tanpa prefix → server-only BFF (`BACKEND_API_URL`, `SESSION_SECRET`).
*   `NEXT_PUBLIC_*` masih dibaca sebagai fallback (legacy).

---

## Deploy

### Frontend — Vercel
*   Dashboard Vercel → **Root Directory = `frontend`** (root `vercel.json` sudah dihapus).
*   `frontend/vercel.json`: `framework: vite`, build `bun run build`, output `dist`, rewrite `/api/*` → Functions, redirect 301 ID→EN, SPA fallback.
*   Env Vercel: `VITE_APP_URL`, `VITE_API_URL=https://ressist-api.nodryx.com`, `BACKEND_API_URL` (sama), `SESSION_SECRET`.

### Backend + Bot — Coolify / Docker Compose
*   `docker-compose.yml` sudah production-ready: healthcheck `wget /livez`, `GIN_MODE=release`, `AUTO_MIGRATE=true`.
*   Coolify: set `ALLOWED_ORIGINS=https://<vercel-app>,capacitor://localhost` dan sinkron `BOT_SERVICE_TOKEN` + `JWT_ACCESS_SECRET` di kedua service.
*   Alternatif single-serve frontend di VPS: uncomment `frontend` service di compose atau `nixpacks.toml` (`SERVE_STATIC=1 bun run server/index.ts`).

### Backup
*   `ops/backup/backup_to_neon.sh` — `pg_dump -Fc` lokal → `pg_restore` ke Neon + checksum + retention 14 hari.
*   Cron: `0 0 * * * /opt/ressist/ops/backup/backup_to_neon.sh >> /var/log/ressist_backup.log 2>&1` (lihat `ops/backup/crontab.example`).

---

## Dokumentasi Lanjut

| Dokumen | Deskripsi |
|---------|-----------|
| [`backend/README.md`](backend/README.md) | Quickstart Go, tabel routes, DI container, env lengkap |
| [`backend/API_DOCUMENTATION.md`](backend/API_DOCUMENTATION.md) | Referensi API lengkap + contoh `curl` |
| [`backend/internal/modules/*`](backend/internal/modules/) | README per module (9 module) |
| [`backend/internal/shared/README.md`](backend/internal/shared/README.md) | Router & middleware |
| [`frontend/README.md`](frontend/README.md) | Arsitektur Vite+BFF, routing, deploy Vercel |
| [`bot/README.md`](bot/README.md) | Poller, scheduler cron WIB, `BOT_SERVICE_TOKEN` |
| [`ops/backup/README.md`](ops/backup/README.md) | Setup backup Neon |

---

## Health & Observability

*   `GET /livez` — liveness (200 `{status:ok}`)
*   `GET /readyz` — readiness + DB ping (503 jika `db_ping_failed`)
*   `GET /healthz` — alias liveness
*   `GET /metrics` — Prometheus (`ressist_http_requests_total`, `ressist_http_request_latency_ms`)
*   `GET /openapi.json` & `GET /v1/openapi.json` — OpenAPI spec
*   Logging: JSON access log (`shared/middleware/logging.go`) + `X-Request-ID` (`shared/middleware/request_id.go`)

---

## Lisensi

ISC — lihat `package.json`.
