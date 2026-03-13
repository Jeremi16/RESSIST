import { NextRequest } from "next/server";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function normalizeEnvValue(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const hasDoubleQuotes =
    trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2;
  const hasSingleQuotes =
    trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2;

  const unquoted =
    hasDoubleQuotes || hasSingleQuotes ? trimmed.slice(1, -1).trim() : trimmed;

  return unquoted || undefined;
}

/**
 * Resolve application base URL for server-side OAuth flows.
 * Priority:
 * 1. NEXT_PUBLIC_APP_URL
 * 2. NEXTAUTH_URL
 * 3. Current request origin
 * 4. localhost fallback
 */
export function getAppBaseUrl(request?: NextRequest): string {
  const envAppUrl = normalizeEnvValue(process.env.NEXT_PUBLIC_APP_URL);
  if (envAppUrl) {
    return trimTrailingSlash(envAppUrl);
  }

  const nextAuthUrl = normalizeEnvValue(process.env.NEXTAUTH_URL);
  if (nextAuthUrl) {
    return trimTrailingSlash(nextAuthUrl);
  }

  if (request?.nextUrl?.origin) {
    return trimTrailingSlash(request.nextUrl.origin);
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
  const explicitRedirect = normalizeEnvValue(process.env.GOOGLE_REDIRECT_URI);
  if (explicitRedirect) {
    return trimTrailingSlash(explicitRedirect);
  }

  return `${getAppBaseUrl(request)}/api/auth/google/callback`;
}
