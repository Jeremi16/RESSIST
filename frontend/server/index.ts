// Entry lokal: bun run server/index.ts (atau bun run dev:bff)
// Serve Hono BFF di :3001. vite.config.ts proxy /api -> sini saat dev.
// Runtime-agnostic (Node & Bun) via @hono/node-server — tanpa API Bun.*
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { app } from "./app";
import { authMiddleware } from "./middleware/auth";

const root = new Hono();
root.route("/", app);

// Single-serve opsional (Nixpacks fallback): serve dist/ + guard halaman.
// Di Vercel tidak dipakai (static di CDN, /api di Functions).
if (process.env.SERVE_STATIC === "1") {
  root.use("*", authMiddleware);
  root.use("/*", serveStatic({ root: "./dist" }));
  root.get("*", serveStatic({ path: "./dist/index.html" }));
}

const port = Number(process.env.BFF_PORT || 3001);
console.log(`[bff] listening on http://localhost:${port}`);
serve({ fetch: root.fetch, port });
