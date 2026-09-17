// Unified API client: web (BFF cookie) vs Capacitor native (Bearer).
//
// Web behaviour is unchanged: relative "/api/..." with same-origin cookies,
// 401 retried once after 800ms (rotation race) — see session-fetch.ts.
//
// Native behaviour: BFF-style path is mapped to the Go backend (VITE_API_URL/v1/...),
// Authorization: Bearer <access_jwt> is attached, and on 401 the client rotates
// via POST /v1/auth/refresh with X-Refresh-Token, then retries once.
// Refresh token lives in localStorage for now; Phase 4/5 upgrades the store
// to SecureStore/Preferences without changing call sites.

import { getNativeApiBase, isNative } from "@/src/lib/platform";
import { Preferences } from "@capacitor/preferences";

export { getNativeApiBase };

const ACCESS_KEY = "ressist.access_token";
const REFRESH_KEY = "ressist.refresh_token";

// ---- token store (memory + fast mirror + durable Preferences; native only) ----

let memoryAccess: string | null = null;
let memoryRefresh: string | null = null;

function readMirror(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeMirror(key: string, value: string | null): void {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // ignore (private mode)
  }
}

/** Hydrate memory from durable storage. Called once at native startup (main.tsx). */
export async function loadMobileSession(): Promise<void> {
  if (!isNative()) return;
  try {
    const [{ value: access }, { value: refresh }] = await Promise.all([
      Preferences.get({ key: ACCESS_KEY }),
      Preferences.get({ key: REFRESH_KEY }),
    ]);
    if (access) {
      memoryAccess = access;
      writeMirror(ACCESS_KEY, access);
    }
    if (refresh) {
      memoryRefresh = refresh;
      writeMirror(REFRESH_KEY, refresh);
    }
  } catch {
    // fall back to mirrors below
  }
  if (!memoryAccess) memoryAccess = readMirror(ACCESS_KEY);
  if (!memoryRefresh) memoryRefresh = readMirror(REFRESH_KEY);
}

export function getAccessToken(): string | null {
  if (memoryAccess) return memoryAccess;
  memoryAccess = readMirror(ACCESS_KEY);
  return memoryAccess;
}

export function getRefreshToken(): string | null {
  if (memoryRefresh) return memoryRefresh;
  memoryRefresh = readMirror(REFRESH_KEY);
  return memoryRefresh;
}

/** Called after POST /v1/auth/google/native and after each refresh rotation. */
export function setMobileSession(access: string, refresh?: string | null): void {
  memoryAccess = access || null;
  if (refresh !== undefined) memoryRefresh = refresh;
  writeMirror(ACCESS_KEY, memoryAccess);
  if (refresh !== undefined) writeMirror(REFRESH_KEY, memoryRefresh);
  if (isNative()) {
    // Durable store; fire-and-forget (mirrors already updated synchronously).
    if (access) void Preferences.set({ key: ACCESS_KEY, value: access }).catch(() => {});
    if (refresh !== undefined) {
      if (refresh) void Preferences.set({ key: REFRESH_KEY, value: refresh }).catch(() => {});
      else void Preferences.remove({ key: REFRESH_KEY }).catch(() => {});
    }
  }
}

export function clearMobileSession(): void {
  memoryAccess = null;
  memoryRefresh = null;
  writeMirror(ACCESS_KEY, null);
  writeMirror(REFRESH_KEY, null);
  if (isNative()) {
    void Preferences.remove({ key: ACCESS_KEY }).catch(() => {});
    void Preferences.remove({ key: REFRESH_KEY }).catch(() => {});
  }
}

// ---- BFF -> backend path mapping (native only) ----

function mapToBackend(path: string): { method: string; path: string } | null {
  const [rawPath, rawQuery] = path.split("?");
  const q = rawQuery ? `?${rawQuery}` : "";
  switch (rawPath) {
    case "/api/assignments":
      return { method: "GET", path: `/v1/assignments${q}` };
    case "/api/assignments/complete":
      return { method: "POST", path: "/v1/assignments/complete" };
    case "/api/courses":
      return { method: "GET", path: `/v1/courses${q}` };
    case "/api/user":
      return { method: "AUTO", path: `/v1/user${q}` };
    case "/api/user/telegram/verify-code":
      return { method: "POST", path: "/v1/user/telegram/verify-code" };
    case "/api/test-calendar":
      // GET -> preview (query preserved); POST -> test (body = test params)
      return { method: "AUTO", path: "__calendar__" };
    case "/api/telegram/test-reminder":
      return { method: "POST", path: "/v1/telegram/test-reminder" };
    case "/api/telegram/test-briefing":
      return { method: "POST", path: "/v1/telegram/test-briefing" };
    case "/api/api-keys":
      return { method: "AUTO", path: `/v1/api-keys${q}` };
    default:
      if (rawPath.startsWith("/api/api-keys/")) {
        return { method: "AUTO", path: `/v1/api-keys/${rawPath.slice("/api/api-keys/".length)}` };
      }
      return null;
  }
}

function calendarPath(callerMethod: string, path: string): string {
  const [, rawQuery] = path.split("?");
  const q = rawQuery ? `?${rawQuery}` : "";
  if (callerMethod === "POST") return "/v1/calendar/test";
  return `/v1/calendar/preview${q}`;
}

// ---- refresh ----

let refreshPromise: Promise<boolean> | null = null;

async function rotateNativeSession(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const refresh = getRefreshToken();
      if (!refresh) return false;
      const base = getNativeApiBase();
      if (!base) return false;
      const res = await fetch(`${base}/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Refresh-Token": refresh },
      });
      if (!res.ok) {
        if (res.status === 401) clearMobileSession();
        return false;
      }
      const data = (await res.json().catch(() => ({}))) as {
        access_token?: string;
        refresh_token?: string;
      };
      if (!data.access_token) return false;
      setMobileSession(data.access_token, data.refresh_token ?? null);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

// ---- main entry: drop-in replacement for fetch("/api/...") ----

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  if (!isNative()) {
    // Web: unchanged BFF flow (cookies + 401 retry for rotation race).
    const first = await fetch(input, { credentials: "same-origin", ...init });
    if (first.status !== 401) return first;
    await new Promise((r) => setTimeout(r, 800));
    try {
      return await fetch(input, { credentials: "same-origin", ...init });
    } catch {
      return first;
    }
  }

  // Native: map to backend + Bearer.
  const base = getNativeApiBase();
  const callerMethod = (init.method ?? "GET").toUpperCase();
  const mapped = mapToBackend(input);

  // Auth-lifecycle endpoints handled specially below.
  if (input.startsWith("/api/auth/")) return nativeAuthFetch(input, init);

  if (!mapped) return new Response(JSON.stringify({ error: "unsupported native endpoint" }), { status: 501 });
  if (!base) return new Response(JSON.stringify({ error: "VITE_API_URL is not set" }), { status: 500 });

  let backendPath = mapped.path;
  if (backendPath === "__calendar__") backendPath = calendarPath(callerMethod, input);
  const method = mapped.method === "AUTO" ? callerMethod : mapped.method;

  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && method !== "GET" && init.body) {
    headers.set("Content-Type", "application/json");
  }
  const access = getAccessToken();
  if (access) headers.set("Authorization", `Bearer ${access}`);

  let res = await fetch(`${base}${backendPath}`, { ...init, method, headers });
  if (res.status !== 401) return res;
  const rotated = await rotateNativeSession();
  if (!rotated) return res;
  const retryHeaders = new Headers(init.headers);
  if (!retryHeaders.has("Content-Type") && method !== "GET" && init.body) {
    retryHeaders.set("Content-Type", "application/json");
  }
  const retryAccess = getAccessToken();
  if (retryAccess) retryHeaders.set("Authorization", `Bearer ${retryAccess}`);
  try {
    return await fetch(`${base}${backendPath}`, { ...init, method, headers: retryHeaders });
  } catch {
    return res;
  }
}

async function nativeAuthFetch(input: string, init: RequestInit): Promise<Response> {
  const base = getNativeApiBase();
  const [rawPath] = input.split("?");
  const json = (ok: boolean) =>
    new Response(JSON.stringify(ok ? { authenticated: true } : { authenticated: false }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  switch (rawPath) {
    case "/api/auth/status":
      // No BFF session cookie on native — authed iff we hold tokens.
      return json(!!getRefreshToken() || !!getAccessToken());
    case "/api/auth/logout": {
      try {
        if (base) {
          const refresh = getRefreshToken();
          await fetch(`${base}/v1/auth/logout`, {
            method: "POST",
            headers: refresh ? { "X-Refresh-Token": refresh } : {},
          });
        }
      } catch {
        // best effort
      }
      clearMobileSession();
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    case "/api/auth/backend/sync": {
      // After GoogleNative we already hold tokens — just validate via /me.
      if (!base) return new Response(JSON.stringify({ error: "VITE_API_URL is not set" }), { status: 500 });
      const access = getAccessToken();
      const res = await fetch(`${base}/v1/auth/me`, {
        headers: access ? { Authorization: `Bearer ${access}` } : {},
      });
      if (res.status === 401) {
        const rotated = await rotateNativeSession();
        if (!rotated) return new Response(JSON.stringify({ error: "invalid session" }), { status: 401 });
        const retryAccess = getAccessToken();
        const retry = await fetch(`${base}/v1/auth/me`, {
          headers: retryAccess ? { Authorization: `Bearer ${retryAccess}` } : {},
        });
        if (!retry.ok) return new Response(JSON.stringify({ error: "invalid session" }), { status: 401 });
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (!res.ok) return new Response(JSON.stringify({ error: "invalid session" }), { status: 401 });
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    case "/api/auth/backend/sync-lms": {
      if (!base) return new Response(JSON.stringify({ error: "VITE_API_URL is not set" }), { status: 500 });
      const doPost = async () => {
        const access = getAccessToken();
        return fetch(`${base}/v1/auth/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(access ? { Authorization: `Bearer ${access}` } : {}),
          },
          body: init.body ?? "{}",
        });
      };
      let res = await doPost();
      if (res.status === 401 && (await rotateNativeSession())) res = await doPost();
      return res;
    }
    default:
      return new Response(JSON.stringify({ error: "use native Google sign-in for OAuth" }), { status: 400 });
  }
}
