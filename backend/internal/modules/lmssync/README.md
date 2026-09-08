# lmssync — Daily Batch LMS Sync

> Lokasi: `internal/modules/lmssync/` | Dipanggil di `cmd/api/main.go` | Tidak punya HTTP routes

Tanggung jawab: cron-driven batch sync untuk keep `events` fresh walau user tidak login. Menandai tugas Moodle yang sudah done sebagai completed + memperbarui `available_class_codes`.

## Struktur File

| File | Peran |
|------|-------|
| `service.go` | `Service{cfg,db,cal *calendar.Service}` — `SyncBatch(ctx)` batch 200, concurrency 2, `FOR UPDATE SKIP LOCKED` |
| `scheduler.go` | `Scheduler{svc, cron WIB}` — `Start(ctx)` `AddFunc(LMS_SYNC_CRON)` → `SyncBatch` dengan timeout 10m |

## Flow — `SyncBatch`

1. Raw SQL select users yang butuh sync:
   ```sql
   SELECT * FROM users
   WHERE (moodle_enabled && moodle_last_synced_at < NOW()-24h)
      OR (google_enabled && google_last_synced_at < NOW()-24h)
      OR ((moodle||google) && lms_last_synced_at IS NULL && both per-provider NULL)
   ORDER BY COALESCE(LEAST(moodle_last_synced_at, google_last_synced_at)) NULLS FIRST
   LIMIT ? FOR UPDATE SKIP LOCKED
   ```
   Dedup aman untuk multi-replica (SKIP LOCKED).
2. Semaphore `LMS_SYNC_CONCURRENCY=2` + `sync.WaitGroup` + per-user `context.WithTimeout 90s`.
3. Per user: `cal.GetEnabledProviders` else bump `lms_last_synced_at`; `cal.SyncProviders` → count `success/fail`.
4. Log `successCount/failCount`.

## Scheduler — `scheduler.go`

```go
sched := lmssync.New(cfg, db, container.Calendar.Service)
go sched.Start(bgCtx) // cron WIB default "0 7 * * *"
```

*   `Start(ctx)` → `cron.New(cron.WithLocation(WIB))` → `AddFunc(spec, func(){ SyncBatch(timeout 10m) })` → `cron.Start()` → block `<-ctx.Done()` → `Stop()` + 100ms sleep.
*   Dihidupkan hanya jika `LMS_SYNC_ENABLED=true` (`cmd/api/main.go`).

## Config

| Var | Default | Deskripsi |
|-----|---------|-----------|
| `LMS_SYNC_ENABLED` | `true` | Enable scheduler |
| `LMS_SYNC_CRON` | `0 7 * * *` | Cron spec WIB |
| `LMS_SYNC_BATCH_SIZE` | `200` | LIMIT per tick |
| `LMS_SYNC_CONCURRENCY` | `2` | Goroutine paralel |
| `LMS_SYNC_TIMEOUT_SECONDS` | `90` | Per-user timeout |

## Dependencies

`*config.Config, *gorm.DB, *calendar.Service`. Tidak ada HTTP layer.

## Observasi

Log di `service.go` — cari `successCount/failCount` di stdout. Tidak ada `GET /internal/*` untuk lmssync; cek via `GET /metrics` atau DB `lms_last_synced_at`.
