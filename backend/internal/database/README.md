# database — Postgres + GORM

> Lokasi: `internal/database/postgres.go`, `internal/database/migrate.go`

Koneksi Postgres tunggal dengan pool tuning, plus runner migrasi bernomor.

## Struktur

| File | Peran |
|------|-------|
| `postgres.go` | `Open(url)` = koneksi + pool saja. `New(url, autoMigrate)` = `Open` + migrasi opsional + `Verify`. |
| `migrate.go` | `Migrate`, `Verify`, `Status`, dan katalog `migrations()`. |
| `migrate_test.go` | Invarian katalog (versi unik/monoton, tidak ada `CONCURRENTLY`). |
| `migrate_integration_test.go` | Uji nyata ke Postgres, opt-in via `MIGRATION_TEST_DATABASE_URL`. |

## Fungsi

```go
db, err := database.New(cfg.DatabaseURL, cfg.AutoMigrate)
```

*   Validasi `DATABASE_URL` required.
*   `gorm.Open(postgres.New(PreferSimpleProtocol:true), Logger.Warn)`
*   Pool: `MaxOpen 25`, `MaxIdle 10`, `ConnMaxLifetime 30m`, `ConnMaxIdle 10m`
*   Jika `autoMigrate==true`: `Migrate(db)` — terapkan migrasi yang belum jalan.
*   Selalu: `Verify(db)` — tolak start bila tabel/kolom wajib belum ada.

## Migrasi

Skema **tidak** lagi dibuat oleh `db.AutoMigrate` pada setiap boot.

| Perintah | Efek |
|---|---|
| `docker compose run --rm api migrate` | Terapkan migrasi yang belum jalan, lalu `Verify`. Ini langkah rilis. |
| `docker compose run --rm api migrate status` | Daftar versi yang sudah diterapkan. |

Sifat runner:

*   Versi dicatat di tabel `schema_migrations`; satu langkah hanya jalan sekali.
*   `pg_advisory_xact_lock` menyerialkan proses yang start bersamaan (aman untuk
  N replika, dan aman di balik connection pooler mode transaction seperti
  endpoint `-pooler` Neon — kunci session-level tidak aman di sana).
*   Setiap `Up` berjalan dalam satu transaksi bersama pencatatan versinya.
*   `Verify` membuat `api` gagal start dengan pesan yang menyebut perintah di
  atas bila langkah rilis terlewat, alih-alih `500` pada request pertama.

Detail katalog dan langkah manual (dedupe `telegram_chat_id`): lihat
[`../SECURITY-MIGRATIONS.md`](../SECURITY-MIGRATIONS.md).

## Health

Readiness probe `GET /readyz` (`shared/router/router.go`) melakukan
`sqlDB.PingContext(2s)` — jika gagal return `503 {status:not_ready,
error:db_ping_failed}`.

## Backup

Runbook backup/restore dari sisi backend (mapping `DATABASE_URL` ↔
`LOCAL_DB_URL`, restore & verification) ada di
[`../../docs/backup.md`](../../docs/backup.md). Source of truth script tetap di
[`../../../ops/backup/README.md`](../../../ops/backup/README.md).

> Setelah restore, jalankan `docker compose run --rm api migrate` untuk
> memastikan skema hasil restore sudah memuat semua migrasi.
