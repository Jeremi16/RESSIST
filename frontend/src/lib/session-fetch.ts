// Helper sesi: retry 1x saat 401 sebelum menganggap sesi mati.
//
// 401 pertama bisa transient (race rotasi refresh token antar instance BFF,
// latency jaringan). Tanpa retry, frontend langsung memanggil
// /api/auth/logout yang me-revoke refresh token server-side — irreversible,
// user terlempar ke /login padahal sesi masih valid.
export async function fetchWithSessionRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  retryDelayMs = 800,
): Promise<Response> {
  const first = await fetch(input, init);
  if (first.status !== 401) return first;
  await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  try {
    return await fetch(input, init);
  } catch {
    return first;
  }
}
