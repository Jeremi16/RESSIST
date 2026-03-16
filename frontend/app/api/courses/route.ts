import { NextResponse } from "next/server";
import { applyBackendAuthCookies, callBackendAsUser } from "@/lib/backend-auth";

export async function GET() {
  const result = await callBackendAsUser("/v1/courses", { method: "GET" });
  const response = NextResponse.json(result.body, { status: result.status });
  return applyBackendAuthCookies(response, result);
}
