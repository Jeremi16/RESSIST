# Resisst Monorepo

This repository is split into two services:

- `frontend/` - Next.js app (deploy to Vercel)
- `backend/` - Go API (deploy to homeserver at `resisst-api.nodryx.com`)
- `ops/` - operational scripts (backup, cron examples)

## Frontend

```bash
cd frontend
npm install
npm run dev
```

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
