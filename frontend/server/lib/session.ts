// Port lib/session.ts (next/headers cookies() -> hono/cookie).
// Cookie sesi frontend: el-learning-session (JWT userId/email, 7 hari).
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { Context } from "hono";
import jwt from "jsonwebtoken";
import { getCookieDomain, isProduction } from "./env";

export const SESSION_SECRET =
  process.env.SESSION_SECRET || "fallback-secret-for-development-only";
export const COOKIE_NAME = "el-learning-session";
export const REFRESH_COOKIE_NAME = "refresh_token";

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
  const token = jwt.sign(sessionData, SESSION_SECRET, { expiresIn: "7d" });
  setCookie(c, COOKIE_NAME, token, {
    ...baseCookieAttrs(),
    maxAge: 7 * 24 * 60 * 60,
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
