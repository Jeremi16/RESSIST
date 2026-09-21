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

function getSetCookieHeaders(headers: Headers): string[] {
  // Node 18+/Vercel: Headers.getSetCookie() ada; fallback ke get("set-cookie").
  // WAJIB baca semuanya: backend bisa mengirim beberapa Set-Cookie dan token
  // hasil rotasi hilang (= sesi mati saat grace habis) kalau hanya baca satu.
  const anyHeaders = headers as unknown as { getSetCookie?: () => string[] };
  if (typeof anyHeaders.getSetCookie === "function") {
    return anyHeaders.getSetCookie();
  }
  const single = headers.get("set-cookie");
  return single ? [single] : [];
}

function extractRefreshToken(headers: Headers): string | undefined {
  for (const sc of getSetCookieHeaders(headers)) {
    const match = sc.match(/refresh_token=([^;]+)/);
    if (match?.[1]) return match[1];
  }
  return undefined;
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
type RefreshSuccess = { accessToken: string; rotatedRefreshToken?: string };
// unauthorized=true HANYA saat backend balas 401 (token invalid/expired/
// reuse = sesi benar-benar mati). unauthorized=false = transient
// (429/5xx/network) — sesi HARUS dipertahankan, jangan hapus cookie.
type RefreshFailure = { unauthorized: boolean; status: number };

const refreshPromises = new Map<
  string,
  Promise<RefreshSuccess | RefreshFailure>
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
): Promise<RefreshSuccess | RefreshFailure> {
  const refreshToken = getCookie(c, REFRESH_COOKIE_NAME);
  if (!refreshToken) {
    console.warn("[refreshAccessToken] No refresh_token cookie found");
    return { unauthorized: true, status: 401 };
  }

  const cached = getCachedAccess(refreshToken);
  if (cached) return cached;

  if (refreshPromises.has(refreshToken)) {
    return refreshPromises.get(refreshToken)!;
  }

  const promise = (async (): Promise<RefreshSuccess | RefreshFailure> => {
    try {
      const response = await fetch(`${getBackendBaseUrl()}/v1/auth/refresh`, {
        method: "POST",
        headers: {
          Cookie: `${REFRESH_COOKIE_NAME}=${refreshToken}`,
          "User-Agent": c.req.header("user-agent") || "ressist-frontend",
          "X-Forwarded-For": c.req.header("x-forwarded-for") || "",
        },
      });

      if (response.status === 401) {
        console.error(`[refreshAccessToken] Backend rejected session (401)`);
        return { unauthorized: true, status: 401 };
      }
      if (!response.ok) {
        // Transient (429 rate-limit / 5xx): JANGAN anggap sesi mati.
        console.error(`[refreshAccessToken] Transient failure: status ${response.status}`);
        return { unauthorized: false, status: response.status };
      }

      const payload = (await response.json()) as { access_token?: string };
      if (!payload.access_token) {
        console.error(`[refreshAccessToken] 200 without access_token (shape drift)`);
        return { unauthorized: false, status: 502 };
      }

      const result: RefreshSuccess = {
        accessToken: payload.access_token,
        rotatedRefreshToken: extractRefreshToken(response.headers),
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
      // Network error / backend down: transient, sesi dipertahankan.
      console.error("Refresh token error:", error);
      return { unauthorized: false, status: 502 };
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
  if (!("accessToken" in refreshed)) {
    if (refreshed.unauthorized) {
      // Sesi benar-benar mati (backend 401): hapus cookie via pemanggil.
      return { status: 401, body: { error: "Unauthorized" } };
    }
    // Transient (429/5xx/network): teruskan status asli agar UI tampil
    // "coba lagi", BUKAN auto-logout. applyBackendAuthCookies hanya
    // menghapus cookie saat 401, jadi sesi tetap utuh.
    return { status: refreshed.status, body: { error: "Upstream error" } };
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
