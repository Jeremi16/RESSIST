# apikey — Programmatic Read Access

> Lokasi: `internal/modules/apikey/` | DI: `internal/app/container.go:65` | Router: `shared/router/router.go:90`

Tanggung jawab: buat/list/revoke API key (`rsk_` + SHA256 hashed storage), `ValidateApiKey` untuk `APIKeyOrJWT` middleware.

## Struktur File

| File | Peran |
|------|-------|
| `module.go` | `type Module{Service,*Handler}` + `New(db,cfg)` |
| `service.go` | `Create`, `List`, `Revoke`, `ValidateApiKey`, `hashKey` (sha256), generate raw |
| `handler.go` | `List`, `Create`, `Revoke` handlers |
| `routes.go` | `RegisterRoutes` mount `v1/api-keys` (JWT only) |

## Routes — JWT only (`AccessToken`)

| Method | Path | Handler | Body | Deskripsi |
|--------|------|---------|------|-----------|
| `GET` | `/v1/api-keys` | `List` | — | `WHERE user_id ORDER created_at DESC` → `[]keyResponse` |
| `POST` | `/v1/api-keys` | `Create` | `{name 1-64 required, expires_in_days 1-3650 optional}` | Count `revoked_at IS NULL` < `ApiKeyMaxPerUser(5)` else `ErrTooManyKeys`. Generate raw `rsk_<base64url 32B>` prefix 12 chars, `KeyHash=sha256(raw)`, `Scopes=[]`, optional `expires_at`, `Create` → return `{id,name,prefix,scopes,expires_at,last_used_at,created_at, api_key:raw}` **sekali tampil** |
| `DELETE` | `/v1/api-keys/:id` | `Revoke` | — | `UPDATE revoked_at=now` idempotent |

## ValidateApiKey (dipakai middleware)

```go
func (s *Service) ValidateApiKey(raw string) (*AccessClaims, error)
// trim → hash sha256 → lookup key_hash → check revoked/expired → fetch User → async UPDATE last_used_at → claims{Subject:user.ID}
```

Dipakai di `middleware.APIKeyOrJWT` (`shared/middleware/auth.go`) — coba `X-API-Key` atau `Authorization: ApiKey` dulu, fallback ke `Bearer`.

## Rate Limit

`middleware.ApiKeyRateLimit(60,20)` (`shared/middleware/rate_limit.go`) bucket = `apikey:<prefix12>` jika API key ada else `ClientIP`, TTL 15m.

## Config

`API_KEY_PREFIX=rsk_`, `API_KEY_MAX_PER_USER=5`, `API_KEY_RATE_LIMIT_PER_MINUTE=60`, `BURST=20` (`internal/config/config.go:102`).

## Dependencies

`*gorm.DB, *config.Config`.

## Contoh

```bash
# buat key via BFF (JWT)
curl -X POST -H "Authorization: Bearer <jwt>" -H "Content-Type: application/json" \
  -d '{"name":"curl laptop","expires_in_days":30}' http://localhost:8080/v1/api-keys
# → {"id":"uuid","name":"curl laptop","prefix":"rsk_abc123","api_key":"rsk_... (hanya sekali)","expires_at":"..."}

# pakai key (tanpa login)
curl -H "X-API-Key: rsk_xxx" http://localhost:8080/v1/assignments
curl -H "X-API-Key: rsk_xxx" http://localhost:8080/v1/calendar/preview
curl -H "Authorization: ApiKey rsk_xxx" http://localhost:8080/v1/courses

# list & revoke
curl -H "Authorization: Bearer <jwt>" http://localhost:8080/v1/api-keys
curl -X DELETE -H "Authorization: Bearer <jwt>" http://localhost:8080/v1/api-keys/<id>
```
