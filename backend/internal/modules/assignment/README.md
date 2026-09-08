# assignment — List & Complete Assignments

> Lokasi: `internal/modules/assignment/` | DI: `internal/app/container.go:61` | Router: `shared/router/router.go:139`

Tanggung jawab: listing tugas penuh (tanpa window deadline) dengan filter in-memory + tandai selesai. Dipakai oleh bot (`X-Act-As-User`) dan API key.

## Struktur File

| File | Peran |
|------|-------|
| `module.go` | `type Module{*Handler}` + `New(db)` |
| `handler.go` | `GetAssignments`, `CompleteAssignment` |
| `routes.go` | Mount `GET /` + `POST /complete` di `v1/assignments` |

## Routes

| Method | Path | Middleware | Handler | Deskripsi |
|--------|------|------------|---------|-----------|
| `GET` | `/v1/assignments` | `BotOrAPIKeyOrJWT + ApiKeyRateLimit` | `GetAssignments` | List tugas terfilter, deadline ASC. Support `X-Bot-Token + X-Act-As-User`, `X-API-Key`, atau `Bearer` |
| `POST` | `/v1/assignments/complete` | `BotOrAccessToken` | `CompleteAssignment` | Body `{assignment_id}` → `UPDATE events SET completed=true, completed_at=now WHERE id=? AND user_id=?` |

### GetAssignments Detail

Select: `users.class_code,muted_courses,course_keyword_filters` + `events id,title,course,class_code,deadline,completed,completed_at,source,description,url ORDER deadline ASC`.

In-memory filter per event:

*   `muted_courses` normalized (`text.Normalize`) — skip jika course muted.
*   `class_code` selected — skip jika `event.class_code != selected`.
*   `course_keyword_filters` — skip jika course punya filter tapi title tidak contain keyword.

Return `[]Event` mentah (tanpa `timeRemaining` seperti `calendar/preview`).

### CompleteAssignment Detail

*   `CompleteAssignmentRequest{AssignmentID uuid}`
*   `CompleteAssignmentResponse{Success bool, Message string, CompletedAt time}`
*   Idempotent: jika `id+user_id` tidak ditemukan → 404.

## Dependencies

`*gorm.DB`, `pkg/classcode, text`, bot impersonasi via `X-Act-As-User`.

## Contoh

```bash
# via API key
curl -H "X-API-Key: rsk_xxx" http://localhost:8080/v1/assignments

# via JWT (BFF)
curl -H "Authorization: Bearer <jwt>" http://localhost:8080/v1/assignments

# via bot (service-to-service)
curl -H "X-Bot-Token: $BOT_SERVICE_TOKEN" -H "X-Act-As-User: <userID>" \
  http://localhost:8080/v1/assignments

# complete
curl -X POST -H "Authorization: Bearer <jwt>" -H "Content-Type: application/json" \
  -d '{"assignment_id":"uuid"}' http://localhost:8080/v1/assignments/complete
```
