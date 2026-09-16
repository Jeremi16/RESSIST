// Port lib/session.ts (next/headers cookies() -> hono/cookie).
// Cookie sesi frontend: el-learning-session (JWT userId/email, TTL via SESSION_TTL_DAYS).
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { Context } from "hono";
import jwt from "jsonwebtoken";
import { getCookieDomain, isProduction } from "./env";

export const SESSION_SECRET =
  process.env.SESSION_SECRET || "fallback-secret-for-development-only";
export const COOKIE_NAME = "el-learning-session";
export const REFRESH_COOKIE_NAME = "refresh_token";

// TTL sesi 3 hari + sliding (backend memperpanjang refresh token tiap rotasi).
// Override via SESSION_TTL_DAYS. Harus selaras dengan REFRESH_TOKEN_TTL_HOURS
// backend (72) agar cookie dan record DB kedaluwarsa bersamaan.
function getSessionTtlDays(): number {
  const raw = Number(process.env.SESSION_TTL_DAYS || "3");
  if (!Number.isFinite(raw) || raw <= 0) return 3;
  return Math.floor(raw);
}

export const SESSION_TTL_DAYS = getSessionTtlDays();
export const SESSION_MAX_AGE_SECONDS = SESSION_TTL_DAYS * 24 * 60 * 60;

export interface SessionPayload {
  userId: string;
  email: string;
}

const baseCookieAttrs = () => ({
  httpOnly: true,
  path: "/",
  secure: isProduction(),
  sameSite: "lax" as const,
  ...(getCookieDomain() ? { domain: getCookieDomain() } : {}),
});

export function createSession(c: Context, payload: SessionPayload | string) {
  const sessionData =
    typeof payload === "string" ? { userId: payload, email: "" } : payload;
  const token = jwt.sign(sessionData, SESSION_SECRET, { expiresIn: SESSION_MAX_AGE_SECONDS });
  setCookie(c, COOKIE_NAME, token, {
    ...baseCookieAttrs(),
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function verifySession(c: Context): SessionPayload | null {
  const token = getCookie(c, COOKIE_NAME);
  if (!token) return null;
  try {
    return jwt.verify(token, SESSION_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

/** Verify raw token (dipakai auth middleware). */
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, SESSION_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

export function clearSession(c: Context) {
  const domain = getCookieDomain();
  if (domain) {
    deleteCookie(c, COOKIE_NAME, { domain, path: "/" });
    deleteCookie(c, REFRESH_COOKIE_NAME, { domain, path: "/" });
  } else {
    deleteCookie(c, COOKIE_NAME);
    deleteCookie(c, REFRESH_COOKIE_NAME);
  }
}
