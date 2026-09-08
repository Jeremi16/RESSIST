# app — Dependency Container

> Lokasi: `internal/app/container.go:1` | Dipakai di `cmd/api/main.go`

DI container tunggal yang merakit semua module. Tidak ada framework DI — manual `New()` berurutan.

## Tanggung Jawab

*   Instantiate 9 module dalam urutan dependensi yang benar.
*   Inject `calendar.Service` ke `auth.Handler` untuk `POST /v1/auth/sync`.
*   Graceful nil untuk `telegram` jika `TELEGRAM_BOT_TOKEN` kosong.

## Struktur

| File | Peran |
|------|-------|
| `container.go:16` | `type Container` + `func New(cfg, db)` |

## Fields

```go
type Container struct {
  Config *config.Config
  DB     *gorm.DB
  Auth       *auth.Module
  User       *user.Module
  Calendar   *calendar.Module
  Course     *course.Module
  Internal   *botservice.Module
  TelegramSender *telegram.Module // sender-only
  Assignment *assignment.Module
  ApiKey     *apikey.Module
}
```

## Urutan Inisialisasi (`container.go:32`)

1. `calendar.New(db, cfg)` — harus pertama (dependency untuk auth sync)
2. `auth.New(db, cfg)` → `authMod.SetCalendarProvider(calendarMod.Service)`
3. `user.New(db)` → `course.New(db)` → `botservice.New(db)`
4. `telegram.New(cfg, db)` — nil Bot jika token kosong, tidak error
5. `assignment.New(db)` → `apikey.New(db, cfg)`

Jika salah satu `New` gagal → `return nil, err` → `main.go` fatal log.

## Pemakaian

```go
container, err := app.New(cfg, db)
if err != nil { log.Fatal(err) }
r := router.New(cfg, db, container.Auth, container.User, container.Calendar, ...)
```
