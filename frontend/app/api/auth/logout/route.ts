/**
 * Logout Route
 *
 * Clears the user session and redirects to login page.
 *
 * GET /api/auth/logout - Logs out user and redirects
 * POST /api/auth/logout - Logs out user (API call)
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearSession, COOKIE_NAME } from "@/lib/session";

function getBackendBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    process.env.BACKEND_API_URL?.trim() ||
    "http://localhost:8080"
  ).replace(/\/+$/, "");
}

async function revokeBackendSession(): Promise<void> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refresh_token")?.value;
  if (!refreshToken) return;

  try {
    await fetch(`${getBackendBaseUrl()}/v1/auth/logout`, {
      method: "POST",
      headers: {
        Cookie: `refresh_token=${refreshToken}`,
      },
      cache: "no-store",
    });
  } catch {
    // Best effort revoke
  }
}

export async function GET() {
  await revokeBackendSession();
  await clearSession();

  const response = NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login`,
  );
  response.cookies.delete("refresh_token");
  response.cookies.delete(COOKIE_NAME);
  return response;
}

export async function POST() {
  await revokeBackendSession();
  await clearSession();

  const response = NextResponse.json({
    success: true,
    message: "Logged out successfully",
  });
  response.cookies.delete("refresh_token");
  response.cookies.delete(COOKIE_NAME);
  return response;
}
