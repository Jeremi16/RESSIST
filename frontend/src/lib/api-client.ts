// Web API client (BFF cookie flow).
//
// All fetch("/api/...") calls from the UI go to the Hono BFF (same-origin
// cookies). A single retry after 800ms covers the transient 401 from a
// refresh-token rotation race between BFF instances — without it the frontend
// would call /api/auth/logout and irreversibly revoke a still-valid session.
//
// Mobile apps (mobile-kmp/) talk to the Go backend directly with Bearer
// tokens and never use this module.

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const first = await fetch(input, { credentials: "same-origin", ...init });
  if (first.status !== 401) return first;
  await new Promise((r) => setTimeout(r, 800));
  try {
    return await fetch(input, { credentials: "same-origin", ...init });
  } catch {
    return first;
  }
}
