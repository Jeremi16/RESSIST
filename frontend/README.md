# Resisst Frontend — Vite + Bun

SPA React (Vite) + Mini BFF Hono (Bun/Node). Backend utama = Go API di `backend/`
(deploy Coolify `resisst-api.nodryx.com`).

## Arsitektur

```
Browser (dist/, react-router-dom) --/api/*--> BFF Hono --Bearer--> Go backend :8080
```

- Semua `fetch("/api/...")` dari UI masuk BFF (`server/`), BFF refresh
  `refresh_token` (httpOnly cookie) lalu proxy ke Go dengan `Bearer`.
- Tidak ada akses DB / secret di browser. Secret hanya di BFF (Vercel Functions).

## Perintah (engine Bun)

```bash
bun install --frozen-lockfile
bun run dev        # Vite :5173 (proxy /api -> BFF :3001)
bun run dev:bff    # Hono BFF :3001 (butuh Go backend jalan)
bun run build      # tsc --noEmit && vite build -> dist/
bun run preview    # preview dist/
bun run lint       # tsc --noEmit
```

## Env

Salin `.env.example` ke `.env`. Aturan:

- `VITE_*` → ikut ke-bundle ke browser (publik): `VITE_APP_URL`, `VITE_API_URL`.
- Tanpa prefix → server-only (BFF): `BACKEND_API_URL`, `SESSION_SECRET`, `COOKIE_DOMAIN`.
- Legacy `NEXT_PUBLIC_*` masih dibaca sebagai fallback, jangan pakai untuk env baru.

## Routing

- Path full EN, konten Bahasa Indonesia (`/about`, `/contact`, `/documentation`,
  `/features`, `/help`, `/privacy`, `/terms`, `/blog`, `/version`, `/harga`,
  `/karir`, `/keamanan`, `/kebijakan-cookie`, `/panduan`, `/roadmap`, `/status`,
  `/login`, `/dashboard`, `/profile`).
- 7 alias ID redirect permanen ke EN: `/tentang→/about`, `/kontak→/contact`,
  `/dokumentasi→/documentation`, `/fitur→/features`, `/bantuan→/help`,
  `/privasi→/privacy`, `/ketentuan→/terms` (lihat `src/App.tsx` + `vercel.json`).
- Guard auth: `<ProtectedRoute>` (`src/components/ProtectedRoute.tsx`) +
  Hono `server/middleware/auth.ts` saat single-serve.

## Struktur

```
index.html            # entry (font Inter/Poppins/Space Grotesk via Google Fonts)
vite.config.ts        # plugin react + tailwind + tsconfig-paths, proxy /api -> :3001
src/
  main.tsx            # createRoot + RouterProvider
  App.tsx             # createBrowserRouter (EN-only + alias ID + ProtectedRoute)
  globals.css         # tailwind + var(--font-main/heading/brand)
  pages/              # Login, Dashboard, Profile (port app/ Next)
  lib/api-types.ts    # tipe shared (EventPreview)
  components/ProtectedRoute.tsx
app/                  # halaman statis (Home + info EN->ID re-export)
components/           # UI (Link/router sudah react-router-dom)
server/               # Hono BFF: app.ts (semua /api/*), lib/, middleware/
api/index.ts          # entry Vercel Functions (Node, tanpa API Bun.*)
```

## Deploy (Vercel)

- Dashboard Vercel → project **Root Directory = `frontend`**.
- `vercel.json` sudah set: `framework: vite`, build `bun run build`, output `dist`,
  rewrite `/api/*` → Functions, redirect 301 ID→EN, SPA fallback `index.html`.
- Env di Vercel: `VITE_APP_URL`, `VITE_API_URL=https://resisst-api.nodryx.com`,
  `BACKEND_API_URL` (sama), `SESSION_SECRET`, `COOKIE_DOMAIN` (bila custom domain).
- Go di Coolify: `CORS_ALLOWED_ORIGINS=https://<vercel-app>` (+ `SESSION_SECRET` sinkron).

## Single-serve (Nixpacks/Coolify, opsional)

`nixpacks.toml` start = `SERVE_STATIC=1 bun run server/index.ts` — 1 proses Bun
serve `dist/` + `/api/*` (dengan guard halaman `authMiddleware`).
