// Env helpers — pengganti process.env.NEXT_PUBLIC_* di lib/backend-auth.ts dkk.
// Prioritas: BACKEND_API_URL/VITE_API_URL (baru) -> NEXT_PUBLIC_* (legacy, fallback).
function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getBackendBaseUrl(): string {
  const candidate =
    process.env.BACKEND_API_URL?.trim() ||
    process.env.VITE_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    "http://localhost:8080";
  return trimTrailingSlash(candidate);
}

export function getAppBaseUrl(): string {
  const candidate =
    process.env.APP_URL?.trim() ||
    process.env.VITE_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "http://localhost:5173";
  return trimTrailingSlash(candidate);
}

export function getCookieDomain(): string {
  return (
    process.env.COOKIE_DOMAIN?.trim() ||
    process.env.NEXT_PUBLIC_COOKIE_DOMAIN?.trim() ||
    ""
  );
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}
