import { NextRequest } from "next/server";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

/**
 * Resolve application base URL for server-side OAuth flows.
 * Priority:
 * 1. Current request origin (best for multi-env deploys)
 * 2. NEXT_PUBLIC_APP_URL
 * 3. localhost fallback
 */
export function getAppBaseUrl(request?: NextRequest): string {
  if (request?.nextUrl?.origin) {
    return trimTrailingSlash(request.nextUrl.origin);
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return trimTrailingSlash(process.env.NEXT_PUBLIC_APP_URL);
  }

  return "http://localhost:3000";
}

/**
 * Resolve Google OAuth redirect URI.
 * Priority:
 * 1. GOOGLE_REDIRECT_URI (explicit override)
 * 2. {baseUrl}/api/auth/google/callback
 */
export function getGoogleRedirectUri(request?: NextRequest): string {
  if (process.env.GOOGLE_REDIRECT_URI) {
    return trimTrailingSlash(process.env.GOOGLE_REDIRECT_URI);
  }

  return `${getAppBaseUrl(request)}/api/auth/google/callback`;
}
