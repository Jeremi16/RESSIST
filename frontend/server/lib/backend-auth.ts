// Port lib/backend-auth.ts (next/headers cookies()/headers() -> hono Context).
// Alur: refresh_token (httpOnly cookie) -> POST BACKEND/v1/auth/refresh
// -> Bearer access_token -> fetch BACKEND/v1/... (+ rotasi refresh_token).
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { Context } from "hono";
import { COOKIE_NAME, REFRESH_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, clearSession } from "./session";
import { getBackendBaseUrl, getCookieDomain, isProduction } from "./env";

export interface BackendAuthCallResult {
  status: number;
  body: unknown;
  rotatedRefreshToken?: string;
}

function extractRefreshToken(setCookieHeader: string | null): string | undefined {
  if (!setCookieHeader) return undefined;
  const match = setCookieHeader.match(/refresh_token=([^;]+)/);
  return match?.[1];
}

/** Terapkan rotasi/hapus cookie auth backend ke response Hono. */
export function applyBackendAuthCookies(
  c: Context,
  result: Pick<BackendAuthCallResult, "status" | "rotatedRefreshToken">,
): void {
  const domain = getCookieDomain();
  const delOpts = domain ? { domain, path: "/" } : undefined;

  if (result.status === 401) {
    // Mirror lib/backend-auth.ts: sesi dianggap invalid saat backend 401.
    if (delOpts) {
      deleteCookie(c, REFRESH_COOKIE_NAME, delOpts);
      deleteCookie(c, COOKIE_NAME, delOpts);
    } else {
      deleteCookie(c, REFRESH_COOKIE_NAME);
      deleteCookie(c, COOKIE_NAME);
    }
    return;
  }

  if (!result.rotatedRefreshToken) return;

  setCookie(c, REFRESH_COOKIE_NAME, result.rotatedRefreshToken, {
    httpOnly: true,
    path: "/",
    secure: isProduction(),
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    ...(domain ? { domain } : {}),
  });
}

// Deduplikasi refresh concurrent per refresh_token (port Map di backend-auth.ts)
const refreshPromises = new Map<
  string,
  Promise<{ accessToken: string; rotatedRefreshToken?: string } | null>
>();

// Cache access token per refresh_token agar BFF tidak me-refresh ke backend
// di setiap /api/* (sebelumnya tiap request = 1 rotasi = rawan race).
// Diisi juga di bawah token HASIL rotasi, karena cookie browser berganti ke
// token baru setelah rotasi — tanpa ini cache tidak pernah hit dua kali.
// TTL 50 menit < access TTL backend (60 menit) agar tidak pernah pakai token basi.
const ACCESS_CACHE_TTL_MS = 50 * 60 * 1000;
const accessCache = new Map<
  string,
  { accessToken: string; rotatedRefreshToken?: string; exp: number }
>();

function getCachedAccess(
  refreshToken: string,
): { accessToken: string; rotatedRefreshToken?: string } | null {
  const hit = accessCache.get(refreshToken);
  if (!hit) return null;
  if (hit.exp <= Date.now()) {
    accessCache.delete(refreshToken);
    return null;
  }
  return { accessToken: hit.accessToken, rotatedRefreshToken: hit.rotatedRefreshToken };
}

function putCachedAccess(
  keys: string[],
  value: { accessToken: string; rotatedRefreshToken?: string },
): void {
  if (accessCache.size > 2000) {
    const now = Date.now();
    for (const [k, v] of accessCache) {
      if (v.exp <= now) accessCache.delete(k);
    }
    if (accessCache.size > 2000) accessCache.clear();
  }
  const exp = Date.now() + ACCESS_CACHE_TTL_MS;
  for (const k of keys) {
    accessCache.set(k, { ...value, exp });
  }
}

async function refreshAccessToken(
  c: Context,
): Promise<{ accessToken: string; rotatedRefreshToken?: string } | null> {
  const refreshToken = getCookie(c, REFRESH_COOKIE_NAME);
  if (!refreshToken) {
    console.warn("[refreshAccessToken] No refresh_token cookie found");
    return null;
  }

  const cached = getCachedAccess(refreshToken);
  if (cached) return cached;

  if (refreshPromises.has(refreshToken)) {
    return refreshPromises.get(refreshToken)!;
  }

  const promise = (async () => {
    try {
      const response = await fetch(`${getBackendBaseUrl()}/v1/auth/refresh`, {
        method: "POST",
        headers: {
          Cookie: `${REFRESH_COOKIE_NAME}=${refreshToken}`,
          "User-Agent": c.req.header("user-agent") || "ressist-frontend",
          "X-Forwarded-For": c.req.header("x-forwarded-for") || "",
        },
      });

      if (!response.ok) {
        console.error(`[refreshAccessToken] Failed: status ${response.status}`);
        return null;
      }

      const payload = (await response.json()) as { access_token?: string };
      if (!payload.access_token) return null;

      const result = {
        accessToken: payload.access_token,
        rotatedRefreshToken: extractRefreshToken(
          response.headers.get("set-cookie"),
        ),
      };
      // Index di bawah token lama DAN token baru (kalau rotasi) agar request
      // berikut (yang bawa cookie baru) tetap hit cache.
      putCachedAccess(
        result.rotatedRefreshToken
          ? [refreshToken, result.rotatedRefreshToken]
          : [refreshToken],
        result,
      );
      return result;
    } catch (error) {
      console.error("Refresh token error:", error);
      return null;
    } finally {
      setTimeout(() => {
        refreshPromises.delete(refreshToken);
      }, 5000);
    }
  })();

  refreshPromises.set(refreshToken, promise);
  return promise;
}

export async function callBackendAsUser(
  c: Context,
  path: string,
  init: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: unknown;
  } = {},
): Promise<BackendAuthCallResult> {
  const refreshed = await refreshAccessToken(c);
  if (!refreshed) {
    return { status: 401, body: { error: "Unauthorized" } };
  }

  const response = await fetch(`${getBackendBaseUrl()}${path}`, {
    method: init.method || "GET",
    headers: {
      Authorization: `Bearer ${refreshed.accessToken}`,
      "Content-Type": "application/json",
    },
    ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
  });

  let parsedBody: unknown = null;
  try {
    parsedBody = await response.json();
  } catch {
    parsedBody = null;
  }

  return {
    status: response.status,
    body: parsedBody,
    rotatedRefreshToken: refreshed.rotatedRefreshToken,
  };
}

export { clearSession };
