# database — Postgres + GORM

> Lokasi: `internal/database/postgres.go:13`

Koneksi Postgres tunggal dengan pool tuning + optional AutoMigrate.

## Struktur

| File | Peran |
|------|-------|
| `postgres.go:13` | `func New(databaseURL string, autoMigrate bool) (*gorm.DB, error)` |

## Fungsi

```go
db, err := database.New(cfg.DatabaseURL, cfg.AutoMigrate)
```

*   Validasi `DATABASE_URL` required.
*   `gorm.Open(postgres.New(PreferSimpleProtocol:true), Logger.Warn)` (`postgres.go:18`)
*   Pool: `MaxOpen 25`, `MaxIdle 10`, `ConnMaxLifetime 30m`, `ConnMaxIdle 10m` (`postgres.go:33`)
*   Jika `autoMigrate==true`: `db.AutoMigrate(&User{}, &RefreshToken{}, &Event{}, &Course{}, &ApiKey{})` (`postgres.go:39`)

## AutoMigrate

*   `config.go:72` → `AutoMigrate = env != production` (default `true` dev, `false` prod).
*   Compose set `AUTO_MIGRATE=true` (`docker-compose.yml` api env) untuk prod juga — aman karena `AutoMigrate` GORM additive.

## Health

Readiness probe `GET /readyz` (`shared/router/router.go:56`) melakukan `sqlDB.PingContext(2s)` — jika gagal return `503 {status:not_ready, error:db_ping_failed}`.
