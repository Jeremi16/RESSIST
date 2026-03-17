import { NextResponse } from "next/server";
import { applyBackendAuthCookies, callBackendAsUser } from "@/lib/backend-auth";

export async function POST() {
  const result = await callBackendAsUser("/v1/user/telegram/verify-code", {
    method: "POST",
  });
  const response = NextResponse.json(result.body, { status: result.status });
  return applyBackendAuthCookies(response, result);
}
