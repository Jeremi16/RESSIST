import { NextRequest, NextResponse } from "next/server";
import { applyBackendAuthCookies, callBackendAsUser } from "@/lib/backend-auth";

export async function POST(request: NextRequest) {
  try {
    console.log('[test-briefing] Calling backend');
    
    const result = await callBackendAsUser("/v1/telegram/test-briefing", {
      method: "POST",
    });
    
    console.log('[test-briefing] Backend response:', result.status, result.body);
    
    const response = NextResponse.json(result.body, { status: result.status });
    return applyBackendAuthCookies(response, result);
  } catch (error) {
    console.error('[test-briefing] Error:', error);
    return NextResponse.json(
      { error: "Internal server error", message: String(error) },
      { status: 500 }
    );
  }
}
