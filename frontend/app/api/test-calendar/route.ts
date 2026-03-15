import { NextRequest, NextResponse } from "next/server";
import { applyBackendAuthCookies, callBackendAsUser } from "@/lib/backend-auth";

export interface EventPreview {
  title: string;
  course: string;
  deadline: string;
  timeRemaining: string;
  deadlineDate: Date;
  source: string;
}

export async function GET(request: NextRequest) {
  const forceRefresh = request.nextUrl.searchParams.get("force") === "true";
  const path = forceRefresh
    ? "/v1/calendar/preview?force=true"
    : "/v1/calendar/preview";

  const result = await callBackendAsUser(path, { method: "GET" });
  const response = NextResponse.json(result.body, { status: result.status });
  return applyBackendAuthCookies(response, result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await callBackendAsUser("/v1/calendar/test", {
    method: "POST",
    body,
  });

  const response = NextResponse.json(result.body, { status: result.status });
  return applyBackendAuthCookies(response, result);
}
