import { NextRequest, NextResponse } from "next/server";
import { applyBackendAuthCookies, callBackendAsUser } from "@/lib/backend-auth";

export interface EventPreview {
  title: string;
  full_title: string;
  course: string;
  original_course: string;
  course_id?: string | null;
  class_code?: string | null;
  description?: string | null;
  url?: string | null;
  deadline: string;
  timeRemaining: string;
  deadlineDate: Date;
  source: string;
}

export async function GET(request: NextRequest) {
  const forceRefresh = request.nextUrl.searchParams.get("force") === "true";
  const sort = request.nextUrl.searchParams.get("sort");
  const query = new URLSearchParams();
  if (forceRefresh) query.set("force", "true");
  if (sort) query.set("sort", sort);

  const path = query.size
    ? `/v1/calendar/preview?${query.toString()}`
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
