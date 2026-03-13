import { NextRequest, NextResponse } from "next/server";

function getBackendBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    process.env.BACKEND_API_URL?.trim() ||
    "http://localhost:8080"
  ).replace(/\/+$/, "");
}

/**
 * Compatibility bridge:
 * if Google is still configured to call frontend callback, forward to backend callback.
 */
export async function GET(request: NextRequest) {
  const target = new URL(`${getBackendBaseUrl()}/v1/auth/google/callback`);
  for (const [key, value] of request.nextUrl.searchParams.entries()) {
    target.searchParams.append(key, value);
  }
  return NextResponse.redirect(target.toString());
}
