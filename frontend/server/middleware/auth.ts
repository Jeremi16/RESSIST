// Port middleware.ts (NextRequest/NextResponse + jose -> Hono).
// Di SPA, guard halaman dilakukan <ProtectedRoute> (client).
// Middleware ini dipakai saat BFF serve dist/ langsung (bun run server / single-serve),
// dan mengekspor PUBLIC_PATHS agar konsisten dengan client.
import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { COOKIE_NAME, verifySessionToken } from "../lib/session";

// Mirror PUBLIC_PATHS middleware.ts (sudah EN-only, tanpa alias ID)
export const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/",
  "/features",
  "/version",
  "/documentation",
  "/help",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/harga",
  "/blog",
  "/karir",
  "/keamanan",
  "/kebijakan-cookie",
  "/panduan",
  "/roadmap",
  "/status",
];

const AUTH_PATHS = ["/login", "/register"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname);
}

export async function authMiddleware(c: Context, next: Next) {
  const { pathname } = new URL(c.req.url);

  // Skip API, asset statis, dan file (mirror matcher middleware.ts)
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/assets") ||
    pathname.includes(".")
  ) {
    return next();
  }

  const token = getCookie(c, COOKIE_NAME);
  const isAuthenticated = token ? !!verifySessionToken(token) : false;

  if (isAuthenticated && AUTH_PATHS.includes(pathname)) {
    return c.redirect("/dashboard", 302);
  }

  if (!isAuthenticated && !isPublicPath(pathname)) {
    return c.redirect("/login", 302);
  }

  return next();
}
