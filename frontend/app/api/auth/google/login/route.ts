import { NextResponse } from "next/server";

function getBackendBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    process.env.BACKEND_API_URL?.trim() ||
    "http://localhost:8080"
  ).replace(/\/+$/, "");
}

/**
 * Backend-first OAuth entrypoint.
 * Frontend route is retained as stable URL for the UI and old links.
 */
export async function GET() {
  return NextResponse.redirect(`${getBackendBaseUrl()}/v1/auth/google/login`);
}
