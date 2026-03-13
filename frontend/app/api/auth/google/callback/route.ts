/**
 * Google OAuth Login Callback Route
 *
 * Handles Google OAuth callback, validates domain (@student.itera.ac.id),
 * creates/logs in user, and stores Google tokens for Classroom API access.
 */

import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { getAppBaseUrl, getGoogleRedirectUri } from "@/lib/google-oauth";

const SESSION_SECRET =
  process.env.SESSION_SECRET || "fallback-secret-for-development-only";
const COOKIE_NAME = "el-learning-session";

/**
 * Create OAuth2 client
 */
function createOAuth2Client(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = getGoogleRedirectUri(request);

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials not configured");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Validate email domain - only @student.itera.ac.id
 */
function validateEmailDomain(email: string): boolean {
  return email.toLowerCase().endsWith("@student.itera.ac.id");
}

/**
 * Create session cookie
 */
async function createSessionCookie(userId: string) {
  const token = jwt.sign({ userId, email: "" }, SESSION_SECRET, {
    expiresIn: "7d",
  });

  const cookieStore = await cookies();
  cookieStore.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
  });
}

/**
 * GET handler
 */
export async function GET(request: NextRequest) {
  const baseUrl = getAppBaseUrl(request);

  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      console.error("Google OAuth error:", error);
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent(`Google login error: ${error}`)}`,
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent("Authorization code not received")}`,
      );
    }

    const oauth2Client = createOAuth2Client(request);

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent("Failed to get access token")}`,
      );
    }

    // Store tokens for later use
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token || null;
    const tokenExpiry = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000);

    // Set credentials to get user info
    oauth2Client.setCredentials(tokens);

    // Get user info
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    if (!userInfo.email) {
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent("Failed to get user email")}`,
      );
    }

    // Validate domain
    if (!validateEmailDomain(userInfo.email)) {
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent("Hanya email @student.itera.ac.id yang diizinkan")}`,
      );
    }

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email: userInfo.email },
    });

    if (!user) {
      // Create new user with Google tokens
      user = await prisma.user.create({
        data: {
          email: userInfo.email,
          google_id: userInfo.id || null,
          name: userInfo.name || userInfo.email.split("@")[0],
          avatar_url: userInfo.picture || null,
          email_verified: userInfo.verified_email === true,
          // Store Google tokens for Classroom API
          google_access_token: accessToken,
          google_refresh_token: refreshToken,
          google_token_expiry: tokenExpiry,
          // Auto-enable Google Classroom since we have the tokens
          google_classroom_enabled: true,
          lms_last_synced_at: null,
        },
      });
      console.log(`✅ New user created: ${user.email}`);
    } else {
      // Update user and store/refresh Google tokens
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          google_id: userInfo.id || user.google_id,
          name: userInfo.name || user.name,
          avatar_url: userInfo.picture || user.avatar_url,
          email_verified: userInfo.verified_email === true,
          // Update Google tokens
          google_access_token: accessToken,
          // Only update refresh token if we got a new one
          ...(refreshToken && { google_refresh_token: refreshToken }),
          google_token_expiry: tokenExpiry,
          // Auto-enable Google Classroom
          google_classroom_enabled: true,
          lms_last_synced_at: null,
        },
      });
      console.log(`✅ User updated: ${user.email}`);
    }

    // Create session
    await createSessionCookie(user.id);

    // Redirect to dashboard
    return NextResponse.redirect(`${baseUrl}/dashboard`);
  } catch (error) {
    console.error("Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to complete login";

    return NextResponse.redirect(
      `${baseUrl}/login?error=${encodeURIComponent(errorMessage)}`,
    );
  }
}
