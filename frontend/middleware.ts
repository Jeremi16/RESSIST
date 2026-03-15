import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_SECRET =
  process.env.SESSION_SECRET || "fallback-secret-for-development-only";

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/",
  "/features",
  "/fitur",
  "/version",
  "/documentation",
  "/dokumentasi",
  "/help",
  "/bantuan",
  "/about",
  "/tentang",
  "/contact",
  "/kontak",
  "/privacy",
  "/privasi",
  "/terms",
  "/ketentuan",
  "/harga",
  "/blog",
  "/karir",
  "/keamanan",
  "/kebijakan-cookie",
  "/panduan",
  "/roadmap",
  "/status",
];

// Paths that should redirect to dashboard if already authenticated
const AUTH_PATHS = ["/login", "/register"];

/**
 * Verify JWT token using jose (edge-compatible)
 */
async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(SESSION_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

/**
 * Middleware untuk proteksi route
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes and static files
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Get session/auth cookies
  const token = request.cookies.get("el-learning-session")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;
  let isAuthenticated = false;

  if (token) {
    const payload = await verifyToken(token);
    isAuthenticated = !!payload;
  }

  // Fallback: if OAuth refresh cookie already exists, treat as authenticated
  // so users can proceed to dashboard while frontend session is synced in background.
  if (!isAuthenticated && refreshToken) {
    isAuthenticated = true;
  }

  console.log(`[Middleware] ${pathname} - Auth: ${isAuthenticated}`);

  // Jika sudah login dan mencoba akses /login atau /register, redirect ke dashboard
  if (isAuthenticated && AUTH_PATHS.includes(pathname)) {
    console.log("[Middleware] Redirecting authenticated user to dashboard");
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Jika belum login dan mengakses protected route, redirect ke login
  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  if (!isAuthenticated && !isPublicPath) {
    console.log("[Middleware] Redirecting unauthenticated user to login");
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const matcher = ["/((?!api|_next/static|_next/image|favicon.ico).*)"];
