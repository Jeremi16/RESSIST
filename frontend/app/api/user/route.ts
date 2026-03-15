import { NextRequest, NextResponse } from "next/server";
import { applyBackendAuthCookies, callBackendAsUser } from "@/lib/backend-auth";

export async function GET() {
  const result = await callBackendAsUser("/v1/user", { method: "GET" });
  const response = NextResponse.json(result.body, { status: result.status });
  return applyBackendAuthCookies(response, result);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const result = await callBackendAsUser("/v1/user", {
    method: "PUT",
    body,
  });
  const response = NextResponse.json(result.body, { status: result.status });
  return applyBackendAuthCookies(response, result);
}
