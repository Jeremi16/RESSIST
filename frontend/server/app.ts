// Hono BFF — port 19 app/api/**/route.ts (Next.js) ke Hono.
// Dipakai dua mode:
// - Lokal: bun run server/index.ts (port 3001, di-proxy vite.config.ts)
// - Vercel: api/index.ts (Functions, Node runtime — tanpa API Bun)
import { Hono, type Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import {
  applyBackendAuthCookies,
  callBackendAsUser,
} from "./lib/backend-auth";
import {
  COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  clearSession,
  createSession,
} from "./lib/session";
import { getAppBaseUrl, getBackendBaseUrl, getCookieDomain, isProduction } from "./lib/env";

export const app = new Hono().basePath("/api");

// ---------- helper: proxy generik ----------
async function proxy(
  c: Context,
  path: string,
  init?: { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown },
) {
  const result = await callBackendAsUser(c, path, init);
  applyBackendAuthCookies(c, result);
  return c.json(result.body, result.status as 200);
}

// ---------- assignments ----------
app.get("/assignments", (c) => proxy(c, "/v1/assignments", { method: "GET" }));

app.post("/assignments/complete", async (c) => {
  let body: { assignment_id?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
  if (!body.assignment_id) {
    return c.json({ error: "assignment_id is required" }, 400);
  }
  return proxy(c, "/v1/assignments/complete", {
    method: "POST",
    body: { assignment_id: body.assignment_id },
  });
});

// ---------- courses ----------
app.get("/courses", (c) => proxy(c, "/v1/courses", { method: "GET" }));

// ---------- user ----------
app.get("/user", (c) => proxy(c, "/v1/user", { method: "GET" }));

app.put("/user", async (c) => {
  const body = await c.req.json();
  return proxy(c, "/v1/user", { method: "PUT", body });
});

app.post("/user/google/disconnect", (c) =>
  proxy(c, "/v1/user/google/disconnect", { method: "POST" }),
);

app.post("/user/telegram/verify-code", (c) =>
  proxy(c, "/v1/user/telegram/verify-code", { method: "POST" }),
);

// ---------- calendar ----------
app.get("/test-calendar", (c) => {
  const query = new URLSearchParams();
  if (c.req.query("force") === "true") query.set("force", "true");
  const sort = c.req.query("sort");
  if (sort) query.set("sort", sort);
  const path = query.size
    ? `/v1/calendar/preview?${query.toString()}`
    : "/v1/calendar/preview";
  return proxy(c, path, { method: "GET" });
});

app.post("/test-calendar", async (c) => {
  const body = await c.req.json();
  return proxy(c, "/v1/calendar/test", { method: "POST", body });
});

app.get("/calendar/raw", (c) => proxy(c, "/v1/calendar/raw", { method: "GET" }));

// ---------- telegram ----------
app.post("/telegram/test-briefing", (c) =>
  proxy(c, "/v1/telegram/test-briefing", { method: "POST" }),
);

app.post("/telegram/test-reminder", (c) =>
  proxy(c, "/v1/telegram/test-reminder", { method: "POST" }),
);

// ---------- legacy direct-DB (dulu prisma+baileys di frontend) ----------
// WhatsApp/Telegram testing sekarang milik backend Go; stub eksplisit agar UI
// lama (WhatsAppQR/WhatsAppTest) gagal dengan pesan jelas, bukan 404.
app.all("/test-whatsapp", (c) =>
  c.json(
    { error: "whatsapp testing moved to backend — endpoint deprecated" },
    501,
  ),
);
app.all("/test-telegram", (c) =>
  c.json(
    { error: "telegram testing moved to backend — endpoint deprecated" },
    501,
  ),
);

// ---------- auth: google ----------
// Beda domain (frontend vercel.app, backend railway.app) fix:
// Backend set-cookie di domain backend tidak akan terbawa ke frontend.
// Jadi login & callback di-proxy via BFF agar cookie di-set di domain frontend.
// Lihat: handler.go:347 setCookie domain=COOKIE_DOMAIN -> butuh proxy.

function getSetCookieHeaders(res: Response): string[] {
  // Node 18+/Vercel: Headers.getSetCookie() ada; fallback ke get("set-cookie")
  const anyHeaders = res.headers as unknown as { getSetCookie?: () => string[] };
  if (typeof anyHeaders.getSetCookie === "function") {
    return anyHeaders.getSetCookie();
  }
  const single = res.headers.get("set-cookie");
  return single ? [single] : [];
}

app.get("/auth/google/login", async (c) => {
  const backendUrl = `${getBackendBaseUrl()}/v1/auth/google/login`;
  const res = await fetch(backendUrl, {
    method: "GET",
    redirect: "manual",
    headers: {
      "User-Agent": c.req.header("user-agent") || "ressist-frontend",
      "X-Forwarded-For": c.req.header("x-forwarded-for") || "",
    },
  });

  // Forward oauth_state cookie dari backend ke domain frontend
  for (const sc of getSetCookieHeaders(res)) {
    const m = sc.match(/oauth_state=([^;]+)/);
    if (m?.[1]) {
      setCookie(c, "oauth_state", m[1], {
        httpOnly: true,
        path: "/",
        secure: isProduction(),
        sameSite: "lax",
        maxAge: 600,
        ...(getCookieDomain() ? { domain: getCookieDomain() } : {}),
      });
    }
  }

  const location = res.headers.get("location");
  if (location) {
    console.log(`[auth/login] backend redirect_uri state set, location=${location.slice(0,150)} cookies=${getSetCookieHeaders(res).join("|").slice(0,200)}`);
    return c.redirect(location, 302);
  }
  // fallback: biarkan browser redirect langsung ke backend
  return c.redirect(backendUrl, 302);
});

app.get("/auth/google/callback", async (c) => {
  const target = new URL(`${getBackendBaseUrl()}/v1/auth/google/callback`);
  const incoming = new URL(c.req.url);
  incoming.searchParams.forEach((value, key) => {
    target.searchParams.append(key, value);
  });

  // Forward cookies (oauth_state) dari frontend ke backend
  const cookieHeader = c.req.header("cookie") ?? "";
  const res = await fetch(target.toString(), {
    method: "GET",
    redirect: "manual",
    headers: {
      Cookie: cookieHeader,
      "User-Agent": c.req.header("user-agent") || "ressist-frontend",
      "X-Forwarded-For": c.req.header("x-forwarded-for") || "",
    },
  });

  // Capture refresh_token yang di-set backend, lalu set ulang di domain frontend
  for (const sc of getSetCookieHeaders(res)) {
    const refreshMatch = sc.match(/refresh_token=([^;]+)/);
    if (refreshMatch?.[1]) {
      setCookie(c, REFRESH_COOKIE_NAME, refreshMatch[1], {
        httpOnly: true,
        path: "/",
        secure: isProduction(),
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60,
        ...(getCookieDomain() ? { domain: getCookieDomain() } : {}),
      });
    }
    // oauth_state di-clear backend setelah validasi -> hapus juga di frontend
    if (sc.includes("oauth_state=") && sc.match(/Max-Age=0|Expires=Thu, 01 Jan 1970/i)) {
      const domain = getCookieDomain();
      if (domain) {
        // deleteCookie via setCookie maxAge 0 tidak ada di hono, pakai header manual
        c.header("Set-Cookie", `oauth_state=; Path=/; Max-Age=0; ${domain ? `Domain=${domain}; ` : ""}SameSite=Lax`);
      }
    }
  }

  const location = res.headers.get("location");
  if (location) {
    if (location.includes("state_mismatch")) {
      console.error(`[auth/callback] state_mismatch: incoming cookie=${cookieHeader.slice(0,120)} backend_status=${res.status} forwarded_cookies=${getSetCookieHeaders(res).join("|").slice(0,300)}`);
    }
    return c.redirect(location, 302);
  }

  // fallback kalau backend tidak redirect (mis. error json)
  try {
    const body = (await res.text()) as string;
    if (body) return c.html(body, res.status as 200);
  } catch {
    // ignore
  }
  return c.redirect(`${getAppBaseUrl()}/login`, 302);
});

// Alias lama /api/auth/google -> login
app.get("/auth/google", (c) => c.redirect("/api/auth/google/login", 302));

// Stub: login/register password tidak ada (OAuth-only)
app.get("/auth/login", (c) => c.redirect("/api/auth/google/login", 302));
app.post("/auth/login", (c) =>
  c.json({ error: "Use Google OAuth login instead" }, 400),
);
app.post("/auth/register", (c) =>
  c.json({ error: "Registration is handled through Google OAuth only" }, 400),
);

// ---------- auth: logout ----------
async function revokeBackendSession(c: Context) {
  const cookieHeader = c.req.header("cookie") ?? "";
  const match = cookieHeader.match(/refresh_token=([^;]+)/);
  if (!match?.[1]) return;
  try {
    await fetch(`${getBackendBaseUrl()}/v1/auth/logout`, {
      method: "POST",
      headers: { Cookie: `${REFRESH_COOKIE_NAME}=${match[1]}` },
    });
  } catch {
    // best effort
  }
}

app.get("/auth/logout", async (c) => {
  await revokeBackendSession(c);
  clearSession(c);
  return c.redirect(`${getAppBaseUrl()}/login`, 302);
});

app.post("/auth/logout", async (c) => {
  await revokeBackendSession(c);
  clearSession(c);
  return c.json({ success: true, message: "Logged out successfully" });
});

// ---------- auth: backend sync ( dipakai Login ?auth=success ) ----------
app.post("/auth/backend/sync", async (c) => {
  const cookieHeader = c.req.header("cookie") ?? "";
  const incomingRefresh = cookieHeader.match(/refresh_token=([^;]+)/)?.[1];

  if (!incomingRefresh) {
    applyBackendAuthCookies(c, { status: 401 });
    return c.json({ error: "missing backend refresh token" }, 401);
  }

  const backendBaseUrl = getBackendBaseUrl();
  const refreshResponse = await fetch(`${backendBaseUrl}/v1/auth/refresh`, {
    method: "POST",
    headers: {
      Cookie: `${REFRESH_COOKIE_NAME}=${incomingRefresh}`,
      "User-Agent": c.req.header("user-agent") || "ressist-frontend",
      "X-Forwarded-For": c.req.header("x-forwarded-for") || "",
    },
  });

  if (!refreshResponse.ok) {
    applyBackendAuthCookies(c, { status: 401 });
    return c.json({ error: "failed to refresh backend session" }, 401);
  }

  const refreshData = (await refreshResponse.json()) as {
    access_token?: string;
  };
  if (!refreshData.access_token) {
    applyBackendAuthCookies(c, { status: 401 });
    return c.json({ error: "missing access token from backend" }, 401);
  }

  const meResponse = await fetch(`${backendBaseUrl}/v1/auth/me`, {
    headers: { Authorization: `Bearer ${refreshData.access_token}` },
  });
  if (!meResponse.ok) {
    applyBackendAuthCookies(c, { status: 401 });
    return c.json({ error: "failed to fetch backend user profile" }, 401);
  }

  const meData = (await meResponse.json()) as { id: string; email?: string };
  if (!meData.id) {
    applyBackendAuthCookies(c, { status: 401 });
    return c.json({ error: "backend user profile is invalid" }, 401);
  }

  createSession(c, { userId: meData.id, email: meData.email || "" });

  const setCookieHeader = refreshResponse.headers.get("set-cookie");
  const rotated = setCookieHeader?.match(/refresh_token=([^;]+)/)?.[1];
  if (rotated) {
    setCookie(c, REFRESH_COOKIE_NAME, rotated, {
      httpOnly: true,
      path: "/",
      secure: isProduction(),
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
    });
  }

  return c.json({ success: true });
});

// ---------- auth: LMS sync latar (dipicu Login setelah navigate, tanpa await) ----------
// Dipisah dari /auth/backend/sync agar login → dashboard instan.
// Response mengikuti /v1/auth/sync: { synced, newAssignmentsCount, newAssignments }.
app.post("/auth/backend/sync-lms", (c) =>
  proxy(c, "/v1/auth/sync", { method: "POST" }),
);

// ---------- api keys (manage via website, JWT only) ----------
app.get("/api-keys", (c) => proxy(c, "/v1/api-keys", { method: "GET" }));
app.post("/api-keys", async (c) => {
  const body = await c.req.json();
  return proxy(c, "/v1/api-keys", { method: "POST", body });
});
app.delete("/api-keys/:id", (c) =>
  proxy(c, `/v1/api-keys/${c.req.param("id")}`, { method: "DELETE" }),
);

// ---------- debug (dev only) ----------
app.get("/debug/cookies", (c) => {
  const cookieHeader = c.req.header("cookie") ?? "";
  const names = cookieHeader
    .split(";")
    .map((p) => p.trim().split("=")[0])
    .filter(Boolean);
  return c.json({ cookies: names, sessionCookie: COOKIE_NAME });
});

export default app;
