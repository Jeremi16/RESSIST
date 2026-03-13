import { NextResponse } from "next/server";

/**
 * Backward-compatible alias to the login entrypoint.
 */
export async function GET() {
  return NextResponse.redirect("/api/auth/google/login");
}
