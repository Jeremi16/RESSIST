import { NextRequest, NextResponse } from "next/server";
import { callBackendAsUser } from "@/lib/backend-auth";

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

export async function GET() {
  const result = await callBackendAsUser("/v1/user", { method: "GET" });
  const response = NextResponse.json(result.body, { status: result.status });
  return withRotatedRefreshCookie(response, result.rotatedRefreshToken);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const result = await callBackendAsUser("/v1/user", {
    method: "PUT",
    body,
  });
  const response = NextResponse.json(result.body, { status: result.status });
  return withRotatedRefreshCookie(response, result.rotatedRefreshToken);
}
