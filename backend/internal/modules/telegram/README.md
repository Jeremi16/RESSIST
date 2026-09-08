# telegram — Sender-only (Test Endpoints)

> Lokasi: `internal/modules/telegram/` | DI: `internal/app/container.go:57` | Router: `shared/router/router.go:132`

Tanggung jawab di proses API: **hanya kirim** test reminder/briefing via Bot API (aman dari N replica). **Tidak polling** — polling lives in standalone `bot/` (replicas=1) untuk hindari `Conflict: terminated by other getUpdates`.

> ⚠️ `bot.go` + `scheduler.go` di package ini adalah **legacy** — tidak dipanggil di `cmd/api/main.go`. Jangan aktifkan; pakai `bot/internal/telegram/` + `bot/internal/scheduler/` sebagai gantinya.

## Struktur File

| File | Peran | Status |
|------|-------|--------|
| `module.go` | `type Module{*Handler, Bot *Bot}` + `New(cfg,db)` — nil Bot jika `TELEGRAM_BOT_TOKEN=""` | Aktif |
| `service.go` | `Bot{api,db,cfg}` — `SendMessage(chatID, text Markdown)`, `SendAssignmentNotification(userID,title,course,due,classCode)` (cek muted `text.Normalize`, classCode `classcode.ParseArray`, keyword filter, urgency emoji `🚨 <=3h, ⚠️ <=12h, 📌`, markdown `Pengingat Tugas Monday,2 Jan 15:04 WIB`) | Aktif |
| `handler.go` | `SendTestReminder`, `SendMorningBriefing` | Aktif |
| `routes.go` | Mount `POST /v1/telegram/test-*` (AccessToken) | Aktif |
| `bot.go` | Legacy `Bot.Start` `GetUpdatesChan 60s`, handle `/start` + verify code | **Deprecated** |
| `scheduler.go` | Legacy cron WIB briefing `0 7` + reminders `0 9/12/18/21/*` | **Deprecated** |

## Routes — `AccessToken` (JWT, via BFF)

| Method | Path | Handler | Deskripsi |
|--------|------|---------|-----------|
| `POST` | `/v1/telegram/test-reminder` | `SendTestReminder` | Jika `bot==nil` → 503. Load nearest `Event deadline>now ORDER deadline ASC` else dummy, `SendAssignmentNotification`. Butuh user `telegram_enabled && chat_id`. |
| `POST` | `/v1/telegram/test-briefing` | `SendMorningBriefing` | Require `telegram_enabled && chat_id`, `deadline BETWEEN now AND endOfNextDay` filter via `classcode.Filter`, build markdown briefing, `SendMessage`. |

Dipanggil dari dashboard via BFF `POST /api/telegram/test-reminder` → `POST /v1/telegram/test-reminder` (`frontend/server/app.ts`).

## Legacy Scheduler (jangan pakai)

Cron WIB di `scheduler.go:Start`:
```
0 7 * * *  — morning briefing (users morning_briefing=true)
0 9 * * *  — 24h reminder
0 12 * * * — 12h
0 18 * * * — 6h
0 21 * * * — 3h
0 * * * *  — 1h
```
Semua → `sendReminders(hoursBefore)` window ±30m. Sekarang duplikat di `bot/internal/scheduler/scheduler.go` — itu yang aktif.

## Env

`TELEGRAM_BOT_TOKEN` (kosong → `Bot==nil` → test endpoints 503), `TELEGRAM_BOT_USERNAME=resisst_bot`.

## Contoh

```bash
curl -X POST -H "Authorization: Bearer <jwt>" http://localhost:8080/v1/telegram/test-reminder
curl -X POST -H "Authorization: Bearer <jwt>" http://localhost:8080/v1/telegram/test-briefing
```
