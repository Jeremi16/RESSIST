# botservice — Service-to-Service for resisst-bot

> Lokasi: `internal/modules/botservice/` | DI: `internal/app/container.go:52` | Router: `shared/router/router.go:123`

Tanggung jawab: semua kebutuhan bot tanpa DB. Bot (`bot/`) **tidak punya `DATABASE_URL`**, 100% HTTP via `X-Bot-Token` ke `/internal/*`. API stateless, bot bisa restart tanpa migrasi.

## Struktur File

| File | Peran |
|------|-------|
| `module.go` | `type Module{*Handler}` + `New(db)` |
| `handler.go` (292 baris) | 6 handler: `GetUserByTelegram`, `GetUser`, `VerifyTelegram`, `GetDueAssignments`, `MarkReminderSent`, `GetBriefingCandidates` |
| `routes.go` | `RegisterRoutes` mount `/internal` (`RequireBotService`) |

## Routes — `RequireBotService(BOT_SERVICE_TOKEN)` (`shared/middleware/bot_auth.go`)

Header: `X-Bot-Token: <BOT_SERVICE_TOKEN>`. Jika env kosong → semua `/internal/*` return 503. Untuk `/v1/*` bot tambahkan `X-Act-As-User: <userID>` (cek `BotOrAPIKeyOrJWT`).

| Method | Path | Handler | Deskripsi |
|--------|------|---------|-----------|
| `GET` | `/internal/users/by-telegram/:chatID` | `GetUserByTelegram` | `WHERE telegram_chat_id=?` → `{id,name,telegram_enabled,telegram_chat_id,telegram_username}` |
| `GET` | `/internal/users/:id` | `GetUser` | `{id,name,telegram_enabled,telegram_chat_id,morning_briefing,reminder_hours,muted_courses,class_code}` |
| `POST` | `/internal/telegram/verify` | `VerifyTelegram` | Body `{code, chat_id, telegram_username?}` — `WHERE telegram_verify_code=? AND expires>NOW()` → update `telegram_chat_id/enable, username, clear code/expires` |
| `GET` | `/internal/scheduler/due?hours_before=24&window_minutes=30` | `GetDueAssignments` | Compute `target=now+hoursBefore`, `start=target-window`, `end=target+window`, join `events JOIN users` where `deadline BETWEEN start,end AND completed=false AND telegram_enabled=true AND chat_id NOT NULL` → `[]dueAssignment{id,user_id,title,course,class_code,deadline,reminders_sent,completed,telegram_chat_id,user_name}` |
| `POST` | `/internal/scheduler/mark-sent` | `MarkReminderSent` | Body `{assignment_id, key}` — append `reminders_sent += ,key` idempotent `containsReminder` |
| `GET` | `/internal/scheduler/briefing-candidates` | `GetBriefingCandidates` | `WHERE telegram_enabled && morning_briefing && chat_id NOT NULL` → `[]briefingCandidate{id,name,telegram_chat_id}` |

## Dipakai oleh Bot

`bot/internal/client/api.go` memanggil semua endpoint di atas (`GetUserByTelegram` untuk `/start` lookup, `VerifyTelegram` untuk kode 6-char, `GetDueAssignments`/`MarkReminderSent` untuk cron reminder, `GetBriefingCandidates` untuk 07:00 WIB).

## Dependencies

`*gorm.DB`. Tidak butuh `config` (token cek di middleware).

## Contoh

```bash
# dari bot (service-to-service)
curl -H "X-Bot-Token: $BOT_SERVICE_TOKEN" http://api:8080/internal/users/by-telegram/123456
curl -H "X-Bot-Token: $BOT_SERVICE_TOKEN" "http://api:8080/internal/scheduler/due?hours_before=24&window_minutes=30"
curl -X POST -H "X-Bot-Token: $BOT_SERVICE_TOKEN" -H "Content-Type: application/json" \
  -d '{"assignment_id":"uuid","key":"24h"}' http://api:8080/internal/scheduler/mark-sent
```
