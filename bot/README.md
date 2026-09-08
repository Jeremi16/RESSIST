# resisst-bot — Telegram Poller & Scheduler

> Standalone Go service untuk polling Telegram + cron reminder. **Wajib 1 replica** — `getUpdates` eksklusif.

**Stack:** Go 1.25 · tgbotapi v5 · cron v3 · HTTP health `:8081`

## Arsitektur

```
Telegram (getUpdates long-poll 60s) → bot/internal/telegram/bot.go
                                        ├─→ /start [KODE] → VerifyTelegram
                                        ├─→ /tugas|/hariini|/minggu → GetAssignments
                                        ├─→ /selesai <id> / inline "✅" → CompleteAssignment
                                        └─→ /status → GetUser
              ┌─ cron WIB ─→ bot/internal/scheduler/scheduler.go
              │              ├─ 0 7 * * *  morning briefing
              │              ├─ 0 9 (24h) / 0 12 (12h) / 0 18 (6h) / 0 21 (3h) / 0 * * * * (1h)
              │              └─→ API /internal/scheduler/* + Bot.Send(Markdown)
              │
API :8080 ────┘   (X-Bot-Token + X-Act-As-User)
```

Bot **tidak punya DB** — semua via `internal/client/api.go` (`X-Bot-Token`).

## Quick Start

```bash
cp .env.example .env
# API_BASE_URL=http://localhost:8080 (atau http://api:8080 di compose)
# BOT_SERVICE_TOKEN=... (sama dengan backend)
# TELEGRAM_BOT_TOKEN=...
go run ./cmd/bot  # :8081 + polling
curl http://localhost:8081/livez  # {"status":"ok"}
```

Docker (via root compose):
```bash
docker compose up -d --build bot
docker compose logs -f bot
```

> **Jangan** `docker compose --scale bot=2` — akan `Conflict: terminated by other getUpdates`.

## Environment — `internal/config/config.go:9`

| Var | Default | Deskripsi |
|-----|---------|-----------|
| `ENV` | `development` | — |
| `BOT_PORT` | `8081` | Health server `:8081/livez` |
| `API_BASE_URL` | `http://localhost:8080` | Trim trailing `/` |
| `BOT_SERVICE_TOKEN` | `` | Wajib, sama dengan backend. Empty → semua `/internal/*` 503 |
| `TELEGRAM_BOT_TOKEN` | `` | Wajib untuk `Bot.New` |
| `TELEGRAM_BOT_USERNAME` | `resisst_bot` | Untuk pesan `/start` |
| `BOT_POLL_TIMEOUT` | `60` | `GetUpdates` timeout sec |

## Commands — `internal/telegram/bot.go:85`

| Command | Alias | Deskripsi |
|---------|-------|-----------|
| `/start [KODE]` | — | Hubungkan akun. KODE 6-char dari dashboard `POST /v1/user/telegram/verify-code`. Plain `6-char` tanpa `/start` juga bisa. |
| `/help` | — | Daftar perintah |
| `/tugas` | `/list` | Semua tugas pending (deadline ASC) + inline `✅` max 5 |
| `/hariini` | `/today` | Deadline hari ini s/d besok (`-1h → endOfNextDay`) |
| `/minggu` | `/week` | 7 hari ke depan (`-1h → +7d`) |
| `/selesai <id>` | `/done` | `POST /v1/assignments/complete` via `X-Act-As-User` |
| `/status` | — | `morning_briefing`, `reminder_hours`, `muted_courses`, `class_code` |
| Inline `✅ <title>` | — | Callback `done:<id>` → `CompleteAssignment` |

## Client — `internal/client/api.go`

`client.New(base, token)` timeout 20s. Header `X-Bot-Token` + `X-Act-As-User` + JSON. Semua error non-2xx truncated 300 char.

Methods: `GetUserByTelegram`, `GetUser`, `VerifyTelegram`, `GetAssignments`, `CompleteAssignment`, `GetDueAssignments`, `MarkReminderSent`, `GetBriefingCandidates`.

## Scheduler — `internal/scheduler/scheduler.go`

Cron WIB (Asia/Jakarta):

| Cron | Hours before | Deskripsi |
|------|--------------|-----------|
| `0 7 * * *` | briefing | `GET /internal/scheduler/briefing-candidates` → per user `GET /v1/assignments` pending window `now → endOfNextDay` |
| `0 9 * * *` | `24h` | `GET /internal/scheduler/due?hours_before=24&window_minutes=30` |
| `0 12 * * *` | `12h` | — |
| `0 18 * * *` | `6h` | — |
| `0 21 * * *` | `3h` | — |
| `0 * * * *` | `1h` | Tiap jam |

Flow `sendReminders`: skip `completed/nil chat/containsReminder(key)` → `buildReminder` (emoji `🚨 <=3h, ⚠️ <=12h, 📌`, deadline WIB `Monday,2 Jan 15:04 WIB`) → `Bot.Send` → `MarkReminderSent` (append `reminders_sent`).

## Health & Lifecycle — `cmd/bot/main.go`

*   `GET /livez` 200 `{status:ok}` di `BOT_PORT`.
*   `scheduler.Start(bgCtx)` goroutine.
*   `signal SIGINT/SIGTERM` → cancel → `srv.Shutdown(10s)` + `bot.api.StopReceivingUpdates()`.

## Diagram File

```
bot/
├── cmd/bot/main.go          # config.Load, client.New, telegram.New, health :8081, scheduler.Start
├── internal/
│   ├── config/config.go
│   ├── client/api.go
│   ├── telegram/{bot.go,format.go}
│   └── scheduler/scheduler.go
└── Dockerfile
```
