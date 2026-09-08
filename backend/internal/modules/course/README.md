# course — Unique Course List

> Lokasi: `internal/modules/course/` | DI: `internal/app/container.go:48` | Router: `shared/router/router.go:115`

Tanggung jawab: enumerate daftar matkul unik dari `events`, terfilter oleh `course_keyword_filters` user.

## Struktur File

| File | Peran |
|------|-------|
| `module.go` | `type Module{*Handler}` + `New(db)` |
| `handler.go` | `GetAllCourses` — dedup, filter keyword, sort |
| `routes.go` | Mount `GET /v1/courses` (APIKeyOrJWT) |

## Route

| Method | Path | Middleware | Handler | Deskripsi |
|--------|------|------------|---------|-----------|
| `GET` | `/v1/courses` | `APIKeyOrJWT + ApiKeyRateLimit` | `GetAllCourses` | Return `{courses: [{ID,Name}]}` distinct |

Flow `handler.go`:

1. Load `User` (`CourseKeywordFilters`) + semua `Event` user.
2. Parse `CourseKeywordFilters` JSON → `map[course][]keyword` via `text.Normalize`.
3. Untuk setiap `event.Course` jika ada filter require `title contains keyword` (case-insensitive) else include.
4. Dedup `map[string]struct{}` → sort lexical → return.

## Dependencies

`*gorm.DB`, `pkg/classcode, text`.

## Contoh

```bash
curl -H "X-API-Key: rsk_xxx" http://localhost:8080/v1/courses
# → {"courses":[{"id":"Pemrograman","name":"Pemrograman"},{"id":"Basis Data","name":"Basis Data"}]}

# via BFF
curl -H "Authorization: Bearer <jwt>" http://localhost:8080/v1/courses
```
