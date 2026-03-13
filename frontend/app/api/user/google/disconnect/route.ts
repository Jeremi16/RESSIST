import { NextResponse } from "next/server";
import { callBackendAsUser } from "@/lib/backend-auth";

export async function POST() {
  const result = await callBackendAsUser("/v1/user/google/disconnect", {
    method: "POST",
  });

  const response = NextResponse.json(result.body, { status: result.status });
  if (result.rotatedRefreshToken) {
    response.cookies.set({
      name: "refresh_token",
      value: result.rotatedRefreshToken,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
    });
  }
  return response;
}
