// Vercel Functions entry: /api/* -> Hono BFF (Node runtime).
// vercel.json rewrite { source: "/api/(.*)", destination: "/api" }.
// Jangan import API Bun.* di sini — Vercel Functions jalan di Node.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { app } from "../server/app";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const host = (req.headers.host as string) || "localhost";
  const proto =
    (req.headers["x-forwarded-proto"] as string) || "https";
  const url = new URL(req.url || "/api", `${proto}://${host}`);

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else {
      headers.set(key, value);
    }
  }

  const rawBody = req.body;
  const body =
    req.method === "GET" || req.method === "HEAD"
      ? undefined
      : typeof rawBody === "string"
        ? rawBody
        : rawBody instanceof Uint8Array
          ? Buffer.from(rawBody)
          : rawBody !== undefined
            ? JSON.stringify(rawBody)
            : undefined;

  const honoRes = await app.request(url.pathname + url.search, {
    method: req.method,
    headers,
    body,
  });

  res.statusCode = honoRes.status;
  honoRes.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") return;
    res.setHeader(key, value);
  });

  const setCookie =
    typeof (honoRes.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie === "function"
      ? (honoRes.headers as Headers & { getSetCookie: () => string[] }).getSetCookie()
      : honoRes.headers.get("set-cookie")
        ? [honoRes.headers.get("set-cookie") as string]
        : [];
  if (setCookie.length > 0) res.setHeader("set-cookie", setCookie);

  const buf = Buffer.from(await honoRes.arrayBuffer());
  res.end(buf);
}
