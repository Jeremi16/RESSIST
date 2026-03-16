import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/session";

export interface BackendAuthCallResult {
  status: number;
  body: unknown;
  rotatedRefreshToken?: string;
}

const REFRESH_COOKIE_NAME = "refresh_token";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getBackendBaseUrl(): string {
  const candidate =
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    process.env.BACKEND_API_URL?.trim() ||
    "http://localhost:8080";
  return trimTrailingSlash(candidate);
}

function extractRefreshToken(
  setCookieHeader: string | null,
): string | undefined {
  if (!setCookieHeader) return undefined;
  const match = setCookieHeader.match(/refresh_token=([^;]+)/);
  return match?.[1];
}

export function applyBackendAuthCookies(
  response: NextResponse,
  result: Pick<BackendAuthCallResult, "status" | "rotatedRefreshToken">,
): NextResponse {
  if (result.status === 401) {
    response.cookies.delete(REFRESH_COOKIE_NAME);
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  if (!result.rotatedRefreshToken) {
    return response;
  }

  response.cookies.set({
    name: REFRESH_COOKIE_NAME,
    value: result.rotatedRefreshToken,
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
  });
  return response;
}

const refreshPromises = new Map<
  string,
  Promise<{
    accessToken: string;
    rotatedRefreshToken?: string;
  } | null>
>();

async function refreshAccessToken(): Promise<{
  accessToken: string;
  rotatedRefreshToken?: string;
} | null> {
  const cookieStore = await cookies();
  const incomingHeaders = await headers();
  const refreshToken = cookieStore.get("refresh_token")?.value;
  if (!refreshToken) {
    return null;
  }

  if (refreshPromises.has(refreshToken)) {
    return refreshPromises.get(refreshToken)!;
  }

  const promise = (async () => {
    try {
      const response = await fetch(`${getBackendBaseUrl()}/v1/auth/refresh`, {
        method: "POST",
        headers: {
          Cookie: `refresh_token=${refreshToken}`,
          "User-Agent": incomingHeaders.get("user-agent") || "resisst-frontend",
          "X-Forwarded-For": incomingHeaders.get("x-forwarded-for") || "",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as { access_token?: string };
      if (!payload.access_token) {
        return null;
      }

      return {
        accessToken: payload.access_token,
        rotatedRefreshToken: extractRefreshToken(
          response.headers.get("set-cookie"),
        ),
      };
    } catch (error) {
      console.error("Refresh token error:", error);
      return null;
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
  path: string,
  init: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: unknown;
  } = {},
): Promise<BackendAuthCallResult> {
  const refreshed = await refreshAccessToken();
  if (!refreshed) {
    return {
      status: 401,
      body: { error: "Unauthorized" },
    };
  }

  const response = await fetch(`${getBackendBaseUrl()}${path}`, {
    method: init.method || "GET",
    headers: {
      Authorization: `Bearer ${refreshed.accessToken}`,
      "Content-Type": "application/json",
    },
    ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    cache: "no-store",
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
