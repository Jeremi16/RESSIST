/**
 * Google OAuth Login Initiation Route
 *
 * This route initiates the Google OAuth flow for authentication.
 * Only allows emails from @iter.ac.id domain.
 *
 * GET /api/auth/google/login - Redirects user to Google OAuth consent screen
 */

import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getAppBaseUrl, getGoogleRedirectUri } from "@/lib/google-oauth";

/**
 * Create OAuth2 client with configured credentials
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
 * GET handler - Initiates Google OAuth login flow
 */
export async function GET(request: NextRequest) {
  try {
    const oauth2Client = createOAuth2Client(request);

    // Generate authorization URL
    // Include profile and email scopes for user info
    const authorizationUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "openid",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
      include_granted_scopes: true,
      prompt: "consent",
    });

    // Redirect user to Google OAuth consent screen
    return NextResponse.redirect(authorizationUrl);
  } catch (error) {
    console.error("Error initiating Google OAuth login:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to initiate login";

    const baseUrl = getAppBaseUrl(request);
    return NextResponse.redirect(
      `${baseUrl}/login?error=${encodeURIComponent(errorMessage)}`,
    );
  }
}
