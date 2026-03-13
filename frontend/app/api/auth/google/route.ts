/**
 * Google OAuth Initiation Route
 *
 * This route initiates the Google OAuth flow for connecting Google Classroom.
 * It generates the authorization URL with the required scopes and redirects the user to Google.
 *
 * GET /api/auth/google - Redirects user to Google OAuth consent screen
 */

import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { verifySession } from "@/lib/session";
import { GOOGLE_CLASSROOM_SCOPES } from "@/lib/lms";
import { getAppBaseUrl, getGoogleRedirectUri } from "@/lib/google-oauth";

/**
 * Create OAuth2 client with configured credentials
 */
function createOAuth2Client(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials not configured");
  }

  const redirectUri = getGoogleRedirectUri(request);
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * GET handler - Initiates Google OAuth flow
 */
export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create OAuth2 client
    const oauth2Client = createOAuth2Client(request);

    // Generate authorization URL with required scopes
    const authorizationUrl = oauth2Client.generateAuthUrl({
      access_type: "offline", // Request refresh token
      scope: GOOGLE_CLASSROOM_SCOPES,
      include_granted_scopes: true,
      // Store user ID in state to retrieve after callback
      state: Buffer.from(
        JSON.stringify({
          userId: session.userId,
          redirect: "/dashboard?tab=lms",
        }),
      ).toString("base64"),
      // Prompt for consent to ensure we get a refresh token
      prompt: "consent",
    });

    // Redirect user to Google OAuth consent screen
    return NextResponse.redirect(authorizationUrl);
  } catch (error) {
    console.error("Error initiating Google OAuth:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to initiate Google OAuth";

    // Redirect to dashboard with error
    const baseUrl = getAppBaseUrl(request);
    return NextResponse.redirect(
      `${baseUrl}/dashboard?error=${encodeURIComponent(errorMessage)}`,
    );
  }
}
