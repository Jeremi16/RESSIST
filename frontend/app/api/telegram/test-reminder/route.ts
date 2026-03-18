import { NextRequest, NextResponse } from "next/server";
import { applyBackendAuthCookies, callBackendAsUser } from "@/lib/backend-auth";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const result = await callBackendAsUser("/v1/telegram/test-reminder", {
      method: "POST",
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
