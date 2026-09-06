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
import { getAppBaseUrl, getBackendBaseUrl, isProduction } from "./lib/env";

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
app.get("/auth/google/login", (c) =>
  c.redirect(`${getBackendBaseUrl()}/v1/auth/google/login`, 302),
);

app.get("/auth/google/callback", (c) => {
  const target = new URL(`${getBackendBaseUrl()}/v1/auth/google/callback`);
  const incoming = new URL(c.req.url);
  incoming.searchParams.forEach((value, key) => {
    target.searchParams.append(key, value);
  });
  return c.redirect(target.toString(), 302);
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
      "User-Agent": c.req.header("user-agent") || "resisst-frontend",
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

  let syncResult: {
    synced?: boolean;
    newAssignmentsCount?: number;
    newAssignments?: unknown[];
  } = {};
  try {
    const syncResponse = await fetch(`${backendBaseUrl}/v1/auth/sync`, {
      method: "POST",
      headers: { Authorization: `Bearer ${refreshData.access_token}` },
    });
    if (syncResponse.ok) {
      try {
        const parsed = (await syncResponse.json()) as {
          synced?: boolean;
          newAssignmentsCount?: number;
          newAssignments?: unknown[];
        };
        syncResult = parsed;
      } catch {
        // keep default
      }
    }
  } catch {
    // keep default
  }

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

  return c.json({
    success: true,
    synced: syncResult.synced ?? false,
    newAssignmentsCount: syncResult.newAssignmentsCount ?? 0,
    newAssignments: Array.isArray(syncResult.newAssignments)
      ? syncResult.newAssignments
      : [],
  });
});

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
