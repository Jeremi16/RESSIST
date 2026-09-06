# Resisst Monorepo

This repository is split into two services:

- `frontend/` - Next.js app (deploy to Vercel)
- `backend/` - Go API (deploy to homeserver at `resisst-api.nodryx.com`)
- `ops/` - operational scripts (backup, cron examples)

## Frontend (Vite + Bun, deploy Vercel)

```bash
cd frontend
bun install
bun run dev        # Vite :5173 + BFF :3001 (butuh Go backend jalan)
```

Vite SPA (`src/`, react-router-dom) + Hono BFF (`server/`, di-bundle ke Vercel
Functions via `api/index.ts`). Detail: `frontend/README.md`.

### Vercel deploy

- Project **Root Directory = `frontend`** (root `vercel.json` sudah dihapus).
- `frontend/vercel.json`: `framework: vite`, build `bun run build`, output `dist`,
  rewrite `/api/*` → Functions, redirect 301 ID→EN (`/tentang`→`/about` dll),
  fallback SPA `/index.html`.

## Backend

```bash
cd backend
go mod tidy
go run ./cmd/api
```

## Backup

Daily backup script and cron template:

- `ops/backup/backup_to_neon.sh`
- `ops/backup/crontab.example`
