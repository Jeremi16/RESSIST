# pkg — Utilities

> Lokasi: `internal/pkg/*` | Pure helpers tanpa DB/config

Kumpulan helper kecil yang dipakai lintas module. Semua stateless, 100% unit-testable.

## Paket

| Paket | File | Fungsi | Dipakai di |
|-------|------|--------|------------|
| `coursealias` | `coursealias/coursealias.go` | `Parse(string)→map`, `ToJSON(map)→string`, `Apply(map, course)→string` | `user` (alias CRUD), `calendar` (preview alias), `sync` (persist) |
| `classcode` | `classcode/classcode.go` | `Extract(title)→*string`, `ParseArray(string)→[]string`, `Filter(muted, classCode, keywordFilters)→bool`, `ToJSON([]string)→string` | `calendar` (moodle filter), `assignment`, `telegram` |
| `synckey` | `synckey/synckey.go` | `Build(provider, externalID, course, title)→string` | `calendar/sync` dedup `user_id+sync_key` |
| `text` | `text/text.go` | `Normalize(string)→string` (lower, trim, collapse) | `course` (keyword filter), `telegram` (muted check) |
| `urlutil` | `urlutil/urlutil.go` | `IsLikelyMoodleCalendarURL(string)→bool` | `user.UpdateCurrentUser` validasi |
| `sortutil` | `sortutil/sortutil.go` | `OrderClause(sort)→string` (`deadline_asc/desc/newest/oldest`) | `calendar.loadCachedEvents` |
| `timeutil` | `timeutil/timeutil.go` | WIB helpers (cek file) | `calendar` (deadline WIB) |
| `classcode` / `coursealias` JSON | — | Simpan sebagai `string` JSON di `User`/`Event` | `models/user.go:32` |

## Contoh

```go
// synckey — dedup key untuk Event
key := synckey.Build("moodle", externalID, course, title)

// coursealias — terapkan alias saat preview
displayCourse := coursealias.Apply(aliasMap, event.Course)

// classcode — filter tugas
if !classcode.Filter(muted, selectedClass, keywordFilters, event) { // skip }

// sortutil — ORDER BY
order := sortutil.OrderClause("deadline_asc") // "deadline ASC"
db.Order(order).Find(&events)
```
