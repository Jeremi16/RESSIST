# ⚠️ Deprecated — Telegram Cron Jobs moved

Dokumen ini **sudah usang** dan tidak lagi menggambarkan arsitektur.

*   **Scheduler aktif sekarang:** `bot/internal/scheduler/scheduler.go` — cron WIB `0 7` (briefing) + `0 9/12/18/21/*` (reminders), via `GET /internal/scheduler/*` + `Bot.Send`.
*   **Legacy scheduler** di `backend/internal/modules/telegram/scheduler.go` + `bot.go` sudah tidak dipanggil (`cmd/api/main.go` tidak polling).

Lihat dokumentasi terbaru:

*   [`bot/README.md`](../bot/README.md) — cron, commands, `BOT_SERVICE_TOKEN`
*   [`backend/internal/modules/telegram/README.md`](internal/modules/telegram/README.md) — sender-only endpoints
*   [`backend/internal/modules/botservice/README.md`](internal/modules/botservice/README.md) — `/internal/scheduler/*`
*   [`backend/internal/modules/lmssync/README.md`](internal/modules/lmssync/README.md) — LMS daily sync (bukan Telegram)
