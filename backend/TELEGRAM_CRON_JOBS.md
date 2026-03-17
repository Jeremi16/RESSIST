# Telegram Bot Auto Cron Jobs

Bot Telegram sekarang sudah dilengkapi dengan sistem cron jobs otomatis.

## Jadwal Cron Jobs (Timezone: WIB / UTC+7)

### 1. Morning Briefing
- Waktu: 07:00 WIB setiap hari
- Target: User dengan morning_briefing = true
- Fungsi: Mengirim ringkasan tugas hari ini

### 2. Reminder 24 Jam Sebelum Deadline
- Waktu: 09:00 WIB setiap hari
- Target: Semua user dengan telegram_enabled = true

### 3. Reminder 12 Jam Sebelum Deadline
- Waktu: 12:00 WIB setiap hari

### 4. Reminder 6 Jam Sebelum Deadline
- Waktu: 18:00 WIB setiap hari

### 5. Reminder 3 Jam Sebelum Deadline
- Waktu: 21:00 WIB setiap hari

### 6. Reminder 1 Jam Sebelum Deadline
- Waktu: Setiap jam (00:00, 01:00, ..., 23:00 WIB)

## Cara Mengubah Jadwal

Edit file backend/internal/bot/scheduler.go pada fungsi Start():

Contoh mengubah morning briefing ke jam 06:00:


Format cron: menit jam hari bulan hari_minggu
- 0 7 * * * = Jam 07:00 setiap hari
- 0 * * * * = Setiap jam
- */30 * * * * = Setiap 30 menit

## Dependencies

- github.com/robfig/cron/v3 (sudah terinstall)

## Testing

Build dan jalankan:
[GIN-debug] [WARNING] Running in "debug" mode. Switch to "release" mode in production.
 - using env:	export GIN_MODE=release
 - using code:	gin.SetMode(gin.ReleaseMode)

[GIN-debug] GET    /livez                    --> github.com/jeremi16/resisst-api/internal/http/router.New.func1 (7 handlers)
[GIN-debug] GET    /healthz                  --> github.com/jeremi16/resisst-api/internal/http/router.New.func2 (7 handlers)
[GIN-debug] GET    /readyz                   --> github.com/jeremi16/resisst-api/internal/http/router.New.func3 (7 handlers)
[GIN-debug] GET    /metrics                  --> github.com/jeremi16/resisst-api/internal/http/middleware.PrometheusHandler.WrapH.func1 (7 handlers)
[GIN-debug] GET    /openapi.json             --> github.com/jeremi16/resisst-api/internal/http/router.New.func4 (7 handlers)
[GIN-debug] GET    /auth/google/login        --> github.com/jeremi16/resisst-api/internal/http/handlers.(*AuthHandler).GoogleLogin-fm (8 handlers)
[GIN-debug] GET    /auth/google/callback     --> github.com/jeremi16/resisst-api/internal/http/handlers.(*AuthHandler).GoogleCallback-fm (8 handlers)
[GIN-debug] POST   /auth/refresh             --> github.com/jeremi16/resisst-api/internal/http/handlers.(*AuthHandler).Refresh-fm (8 handlers)
[GIN-debug] POST   /auth/logout              --> github.com/jeremi16/resisst-api/internal/http/handlers.(*AuthHandler).Logout-fm (8 handlers)
[GIN-debug] GET    /auth/me                  --> github.com/jeremi16/resisst-api/internal/http/handlers.(*AuthHandler).Me-fm (8 handlers)
[GIN-debug] POST   /auth/sync                --> github.com/jeremi16/resisst-api/internal/http/handlers.(*AuthHandler).SyncAfterLogin-fm (8 handlers)
[GIN-debug] GET    /v1/openapi.json          --> github.com/jeremi16/resisst-api/internal/http/router.New.func5 (7 handlers)
[GIN-debug] GET    /v1/auth/google/login     --> github.com/jeremi16/resisst-api/internal/http/handlers.(*AuthHandler).GoogleLogin-fm (8 handlers)
[GIN-debug] GET    /v1/auth/google/callback  --> github.com/jeremi16/resisst-api/internal/http/handlers.(*AuthHandler).GoogleCallback-fm (8 handlers)
[GIN-debug] POST   /v1/auth/refresh          --> github.com/jeremi16/resisst-api/internal/http/handlers.(*AuthHandler).Refresh-fm (8 handlers)
[GIN-debug] POST   /v1/auth/logout           --> github.com/jeremi16/resisst-api/internal/http/handlers.(*AuthHandler).Logout-fm (8 handlers)
[GIN-debug] GET    /v1/auth/me               --> github.com/jeremi16/resisst-api/internal/http/handlers.(*AuthHandler).Me-fm (8 handlers)
[GIN-debug] POST   /v1/auth/sync             --> github.com/jeremi16/resisst-api/internal/http/handlers.(*AuthHandler).SyncAfterLogin-fm (8 handlers)
[GIN-debug] GET    /v1/user                  --> github.com/jeremi16/resisst-api/internal/http/handlers.(*UserHandler).GetCurrentUser-fm (8 handlers)
[GIN-debug] PUT    /v1/user                  --> github.com/jeremi16/resisst-api/internal/http/handlers.(*UserHandler).UpdateCurrentUser-fm (8 handlers)
[GIN-debug] POST   /v1/user/google/disconnect --> github.com/jeremi16/resisst-api/internal/http/handlers.(*UserHandler).DisconnectGoogleClassroom-fm (8 handlers)
[GIN-debug] GET    /v1/user/course-aliases   --> github.com/jeremi16/resisst-api/internal/http/handlers.(*UserHandler).GetCourseAliases-fm (8 handlers)
[GIN-debug] POST   /v1/user/course-aliases   --> github.com/jeremi16/resisst-api/internal/http/handlers.(*UserHandler).AddCourseAlias-fm (8 handlers)
[GIN-debug] DELETE /v1/user/course-aliases   --> github.com/jeremi16/resisst-api/internal/http/handlers.(*UserHandler).DeleteCourseAlias-fm (8 handlers)
[GIN-debug] POST   /v1/user/telegram/verify-code --> github.com/jeremi16/resisst-api/internal/http/handlers.(*UserHandler).GenerateTelegramVerifyCode-fm (8 handlers)
[GIN-debug] GET    /v1/calendar/preview      --> github.com/jeremi16/resisst-api/internal/http/handlers.(*CalendarHandler).GetPreview-fm (8 handlers)
[GIN-debug] POST   /v1/calendar/test         --> github.com/jeremi16/resisst-api/internal/http/handlers.(*CalendarHandler).TestPreview-fm (8 handlers)
[GIN-debug] GET    /v1/courses               --> github.com/jeremi16/resisst-api/internal/http/handlers.(*CourseHandler).GetAllCourses-fm (8 handlers)

Cek log untuk melihat scheduler berjalan:

