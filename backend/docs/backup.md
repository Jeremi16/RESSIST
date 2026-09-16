# Backup & Restore — Backend Perspective

> Postgres `pgdata` (`docker-compose.yml:15`) → Neon backup DB. Script canonical di [`../../ops/backup/README.md`](../../ops/backup/README.md) dan [`../../ops/backup/backup_to_neon.sh`](../../ops/backup/backup_to_neon.sh). Dokumen ini menjelaskan dari sisi `backend/` (`DATABASE_URL`).

## Overview

*   **Source:** `postgres:16-alpine` service `db` di `docker-compose.yml:15-16` (`pgdata:/var/lib/postgresql/data`).
*   **Destination:** Neon backup DB (`NEON_DB_URL`) — offsite DR jika volume VPS corrupt.
*   **Jadwal:** `0 0 * * *` (`ops/backup/crontab.example:1`) via cron → `backup_to_neon.sh >> /var/log/ressist_backup.log 2>&1` (`ops/backup/README.md:30`).
*   **Alur script** (`ops/backup/backup_to_neon.sh:42-58`):
    1. `pg_dump -Fc -Z9` dari `LOCAL_DB_URL` → `ressist_YYYY-MM-DD.dump`
    2. `pg_restore --list` validasi
    3. `pg_restore --clean --if-exists --no-owner --no-privileges -d $NEON_DB_URL`
    4. `sha256sum` checksum `.sha256`
    5. Retention `find -mtime +$RETENTION_DAYS -delete` (default 14)
    6. `notify_failure()` webhook jika gagal (`backup_to_neon.sh:25-33`)

## Env Mapping (Backend ↔ Backup)

| Backend (`backend/.env.example:4`) | Backup (`ops/backup/.env.example:1`) | Keterangan |
|---|---|---|
| `DATABASE_URL=postgresql://.../ressist?sslmode=disable` | `LOCAL_DB_URL` (sama, required `backup_to_neon.sh:13`) | URL dump source — di compose `DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}` (`docker-compose.yml:32`) |
| — | `NEON_DB_URL` (required `backup_to_neon.sh:14`) | Tujuan restore |
| — | `BACKUP_DIR=/var/backups/ressist` (`backup_to_neon.sh:16`) | Lokasi `.dump`/`.sha256`/`.list` + `backup_YYYY-MM-DD.log` (`backup_to_neon.sh:21`) |
| — | `RETENTION_DAYS=14` (`backup_to_neon.sh:17`) | Hapus file `>14` hari |
| — | `WEBHOOK_URL` (optional) | Alert `backup_to_neon.sh:29-32` |

`backend/internal/config/config.go:11` load `DATABASE_URL` via `os.Getenv` + `godotenv`; `internal/database/postgres.go:39` `AutoMigrate` jika `AUTO_MIGRATE=true` (`docker-compose.yml` set `true` untuk prod juga).

## Setup (ringkas, detail di `ops/backup/README.md:7-31`)

```bash
cp ops/backup/.env.example ops/backup/.env   # isi LOCAL_DB_URL (= DATABASE_URL) + NEON_DB_URL
chmod +x ops/backup/backup_to_neon.sh
crontab -e  # tambah: 0 0 * * * /opt/ressist/ops/backup/backup_to_neon.sh >> /var/log/ressist_backup.log 2>&1
```

## Restore Runbook

### 1. Verify dump

```bash
pg_restore --list /var/backups/ressist/ressist_2026-09-15.dump > /tmp/list.txt
sha256sum -c /var/backups/ressist/ressist_2026-09-15.dump.sha256
```

### 2. Restore ke target

**Staging/lokal (DATABASE_URL lokal):**
```bash
pg_restore --clean --if-exists --no-owner --no-privileges -d "$DATABASE_URL" /var/backups/ressist/ressist_2026-09-15.dump
```

**Production (jika DB VPS harus di-restore):**
```bash
docker compose down
# atau backup pgdata dulu: docker run --rm -v ressist_pgdata:/data -v /tmp:/backup alpine tar czf /backup/pgdata-pre-restore.tgz /data
pg_restore --clean --if-exists --no-owner --no-privileges -d "$LOCAL_DB_URL" /var/backups/ressist/ressist_2026-09-15.dump
docker compose up -d db api
```

> Tidak perlu manual migrate setelah restore — `AUTO_MIGRATE=true` di compose akan `AutoMigrate(User,RefreshToken,Event,Course,ApiKey)` (`internal/database/postgres.go:39`, `internal/database/README.md:26`). Jika `AUTO_MIGRATE=false`, jalankan migrasi manual sesuai `config.go:72`.

### 3. Verification

```bash
curl http://localhost:8080/readyz  # 200 {status:ready} atau 503 {error:db_ping_failed} (shared/router/router.go:56)
curl http://localhost:8080/livez   # 200 {status:ok}
psql "$DATABASE_URL" -c "SELECT count(*) FROM users; SELECT count(*) FROM events;"
```

Cek log: `tail -f /var/backups/ressist/backup_*.log` dan `/var/log/ressist_backup.log`.

## Operasional

*   **Monitoring:** cron log `backup_YYYY-MM-DD.log` (`backup_to_neon.sh:21`) + webhook `WEBHOOK_URL` saat `ERR` trap (`backup_to_neon.sh:36`).
*   **Retention:** file `ressist_*.dump*` > `RETENTION_DAYS` auto-hapus (`backup_to_neon.sh:54-56`) — jangan simpan manual di `BACKUP_DIR` tanpa prefix tersebut.
*   **Drill:** test restore ke staging minimal sebulan sekali; jangan test `pg_restore --clean` langsung ke Neon production tanpa snapshot.

## Referensi

*   Canonical: [`../../ops/backup/README.md`](../../ops/backup/README.md), [`../../ops/backup/backup_to_neon.sh`](../../ops/backup/backup_to_neon.sh), [`../../ops/backup/.env.example`](../../ops/backup/.env.example)
*   Backend DB: [`../internal/database/README.md`](../internal/database/README.md), [`../internal/config/README.md`](../internal/config/README.md), [`../README.md`](../README.md)
