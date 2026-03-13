import { NextRequest, NextResponse } from "next/server";
import { callBackendAsUser } from "@/lib/backend-auth";

export interface EventPreview {
  title: string;
  course: string;
  deadline: string;
  timeRemaining: string;
  deadlineDate: Date;
  source: string;
}

function withRotatedRefreshCookie(
  response: NextResponse,
  rotatedRefreshToken?: string,
): NextResponse {
  if (!rotatedRefreshToken) return response;

  response.cookies.set({
    name: "refresh_token",
    value: rotatedRefreshToken,
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
  });
  return response;
}

export async function GET(request: NextRequest) {
  const forceRefresh = request.nextUrl.searchParams.get("force") === "true";
  const path = forceRefresh
    ? "/v1/calendar/preview?force=true"
    : "/v1/calendar/preview";

  const result = await callBackendAsUser(path, { method: "GET" });
  const response = NextResponse.json(result.body, { status: result.status });
  return withRotatedRefreshCookie(response, result.rotatedRefreshToken);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await callBackendAsUser("/v1/calendar/test", {
    method: "POST",
    body,
  });

  const response = NextResponse.json(result.body, { status: result.status });
  return withRotatedRefreshCookie(response, result.rotatedRefreshToken);
}
