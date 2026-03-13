import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { createSession } from "@/lib/session";

function getBackendBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    process.env.BACKEND_API_URL?.trim() ||
    "http://localhost:8080"
  ).replace(/\/+$/, "");
}

function extractRefreshToken(setCookieHeader: string | null): string | null {
  if (!setCookieHeader) return null;

  const match = setCookieHeader.match(/refresh_token=([^;]+)/);
  if (!match || !match[1]) return null;
  return match[1];
}

export async function POST() {
  const cookieStore = await cookies();
  const incomingRefresh = cookieStore.get("refresh_token")?.value;

  if (!incomingRefresh) {
    return NextResponse.json(
      { error: "missing backend refresh token" },
      { status: 401 },
    );
  }

  const backendBaseUrl = getBackendBaseUrl();
  const incomingHeaders = await headers();

  const refreshResponse = await fetch(`${backendBaseUrl}/v1/auth/refresh`, {
    method: "POST",
    headers: {
      Cookie: `refresh_token=${incomingRefresh}`,
      "User-Agent": incomingHeaders.get("user-agent") || "resisst-frontend",
      "X-Forwarded-For": incomingHeaders.get("x-forwarded-for") || "",
    },
    cache: "no-store",
  });

  if (!refreshResponse.ok) {
    return NextResponse.json(
      { error: "failed to refresh backend session" },
      { status: 401 },
    );
  }

  const refreshData = (await refreshResponse.json()) as {
    access_token?: string;
  };
  const accessToken = refreshData.access_token;

  if (!accessToken) {
    return NextResponse.json(
      { error: "missing access token from backend" },
      { status: 401 },
    );
  }

  const meResponse = await fetch(`${backendBaseUrl}/v1/auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!meResponse.ok) {
    return NextResponse.json(
      { error: "failed to fetch backend user profile" },
      { status: 401 },
    );
  }

  const meData = (await meResponse.json()) as {
    id: string;
    email?: string;
  };

  if (!meData.id) {
    return NextResponse.json(
      { error: "backend user profile is invalid" },
      { status: 401 },
    );
  }

  await createSession({
    userId: meData.id,
    email: meData.email || "",
  });

  const response = NextResponse.json({
    success: true,
  });

  const rotatedRefresh = extractRefreshToken(refreshResponse.headers.get("set-cookie"));
  if (rotatedRefresh) {
    response.cookies.set({
      name: "refresh_token",
      value: rotatedRefresh,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
    });
  }

  return response;
}
