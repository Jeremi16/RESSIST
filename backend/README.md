# resisst-api (Go + GORM)

Backend service for auth and API endpoints, designed to run on homeserver at `resisst-api.nodryx.com`.

Full API reference:

- `backend/API_DOCUMENTATION.md`

## Quick start

1. Copy env:

```bash
cp .env.example .env
```

2. Install modules:

```bash
go mod tidy
```

3. Run API:

```bash
go run ./cmd/api
```

API default port: `8080`

## Implemented endpoints

Health and observability:

- `GET /livez`
- `GET /readyz`
- `GET /healthz` (legacy alias)
- `GET /metrics` (Prometheus)
- `GET /openapi.json`

Versioned API (recommended):

- `GET /v1/auth/google/login`
- `GET /v1/auth/google/callback`
- `POST /v1/auth/refresh`
- `POST /v1/auth/logout`
- `GET /v1/auth/me` (Bearer access token)
- `GET /v1/openapi.json`

Legacy compatibility routes remain available under `/auth/*`.

## Google OAuth

Set redirect URI in Google Cloud Console to:

`https://resisst-api.nodryx.com/auth/google/callback`

or (versioned path if you proxy/rewrite):

`https://resisst-api.nodryx.com/v1/auth/google/callback`

## Notes

- `AUTO_MIGRATE` defaults to `true` for development and `false` for production.
- Auth routes are protected with IP-based rate limiting.
- Requests have timeout context and the server supports graceful shutdown.
- Frontend should call backend API via `NEXT_PUBLIC_API_URL`.
