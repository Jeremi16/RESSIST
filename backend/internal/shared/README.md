# shared — Router, Middleware & Docs

> Lokasi: `internal/shared/*` | Dipakai di `internal/app/container.go` & `cmd/api/main.go`

LapisanHTTP cross-cutting: routing, auth, rate-limit, observability, dan OpenAPI.

## Struktur

```
shared/
├── router/router.go:24     # Gin engine + semua route groups
├── middleware/
│   ├── auth.go             # AccessToken, APIKeyOrJWT, GetAccessClaims
│   ├── bot_auth.go         # RequireBotService, BotOrAPIKeyOrJWT, BotOrAccessToken
│   ├── rate_limit.go       # IP & ApiKey bucket (15m TTL)
│   ├── request_id.go       # X-Request-ID uuid
│   ├── timeout.go          # context.WithTimeout 15s → 504
│   ├── logging.go          # JSONAccessLogger
│   └── metrics.go          # Prometheus + PrometheusHandler
└── docs/
    ├── openapi.json
    └── docs.go             # embed OpenAPI bytes
```

## Router — `router/router.go:24`

`func New(cfg, db, authModule, userModule, calendarModule, courseModule, internalModule, assignmentModule, apiKeyModule, telegramSender) *gin.Engine`

*   `GIN_MODE=release` jika `ENV==production`.
*   Global: `RequestID → TimeoutContext → JSONAccessLogger → Recovery → HTTPMetrics → cors` (allow `Authorization, Content-Type, X-Request-ID, X-API-Key`, expose `X-Request-ID`, credentials true, `MaxAge 12h`).
*   Public: `/livez`, `/healthz`, `/readyz` (DB ping 2s), `/metrics`, `/openapi.json`.
*   Groups: `legacy /auth` + `v1` (lihat `backend/README.md` tabel routes). Lihat `router.go:147 registerAuthRoutes`.

## Middleware

| File | Export | Deskripsi |
|------|--------|-----------|
| `auth.go` | `AccessToken(parser)`, `APIKeyOrJWT(parser,validator)`, `GetAccessClaims`, `AuthenticatedUserID` | JWT `Bearer` atau `X-API-Key`/`Authorization: ApiKey`. `validator` = `apikey.Service.ValidateApiKey`. Claims: `jwt.RegisteredClaims` + `Email,Name`. |
| `bot_auth.go` | `RequireBotService(token)`, `BotOrAPIKeyOrJWT`, `BotOrAccessToken` | `X-Bot-Token` header, set `X-Act-As-User` → `AccessClaims.Subject`. |
| `rate_limit.go` | `AuthRateLimit(30,10)`, `ApiKeyRateLimit(60,20)` | `map[string]visitor` + `rate.Limiter` per IP/prefix, cleanup 15m TTL. |
| `request_id.go` | `RequestID()` | Propagate/injeksi `X-Request-ID` uuid. |
| `timeout.go` | `TimeoutContext(15)` | `c.Request.WithContext(timeout)` → 504 jika `DeadlineExceeded`. |
| `logging.go` | `JSONAccessLogger()` | JSON line `level` (info/warn/error by status), `request_id, method, path, status, latency_ms`. |
| `metrics.go` | `HTTPMetrics()`, `PrometheusHandler()` | Counter `ressist_http_requests_total{method,path,status}` + histogram `latency_ms` 5-5000ms. |

## Docs — `shared/docs/`

*   `openapi.json` — spec statis, serve di `GET /openapi.json` & `GET /v1/openapi.json` (`router.go:71`).
*   `docs.go` — `//go:embed openapi.json` → `var OpenAPI []byte`.

## Auth Flow Ringkas

```
Browser → BFF → API
  JWT: Authorization: Bearer <15m>  → middleware.AccessToken → GetAccessClaims
  API key: X-API-Key: rsk_...      → middleware.APIKeyOrJWT → ValidateApiKey → claims
  Bot: X-Bot-Token + X-Act-As-User → middleware.RequireBotService → BotOrAPIKeyOrJWT
```
