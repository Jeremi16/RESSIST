# docs — Backend Runbooks

> Dokumentasi operasional spesifik `backend/` (Go API). Untuk arsitektur umum lihat [`../README.md`](../README.md).

## Daftar Isi

| Dokumen | Deskripsi |
|---------|-----------|
| [`backup.md`](backup.md) | Backup & restore Postgres (`pgdata` → Neon) dari sisi backend (`DATABASE_URL`) |
| [`../internal/app/README.md`](../internal/app/README.md) | DI container `app.Container` |
| [`../internal/config/README.md`](../internal/config/README.md) | Env loader `config.Config` |
| [`../internal/database/README.md`](../internal/database/README.md) | Koneksi Postgres + `AutoMigrate` + pool |
| [`../API_DOCUMENTATION.md`](../API_DOCUMENTATION.md) | Referensi API lengkap |

## Konvensi

*   Source of truth script backup tetap di [`../../ops/backup/README.md`](../../ops/backup/README.md) — `docs/backup.md` hanya lensa backend (mapping `DATABASE_URL` ↔ `LOCAL_DB_URL`).
*   Semua path di `docs/` relatif terhadap `backend/`.
