import { NextRequest, NextResponse } from "next/server";
import { applyBackendAuthCookies, callBackendAsUser } from "@/lib/backend-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({
      assignment_title: "Tugas Pemrograman Web",
      course_name: "Pemrograman Web",
      hours_until_due: 24
    }));
    
    console.log('[test-reminder] Calling backend with body:', body);
    
    const result = await callBackendAsUser("/v1/telegram/test-reminder", {
      method: "POST",
      body,
    });
    
    console.log('[test-reminder] Backend response:', result.status, result.body);
    
    const response = NextResponse.json(result.body, { status: result.status });
    return applyBackendAuthCookies(response, result);
  } catch (error) {
    console.error('[test-reminder] Error:', error);
    return NextResponse.json(
      { error: "Internal server error", message: String(error) },
      { status: 500 }
    );
  }
}
