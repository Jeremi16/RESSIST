import { NextRequest, NextResponse } from "next/server";
import { applyBackendAuthCookies, callBackendAsUser } from "@/lib/backend-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assignment_id } = body;

    if (!assignment_id) {
      return NextResponse.json(
        { error: "assignment_id is required" },
        { status: 400 }
      );
    }

    const result = await callBackendAsUser("/v1/assignments/complete", {
      method: "POST",
      body: { assignment_id },
    });

    const response = NextResponse.json(result.body, { status: result.status });
    return applyBackendAuthCookies(response, result);
  } catch (error) {
    console.error('[complete-assignment] Error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
