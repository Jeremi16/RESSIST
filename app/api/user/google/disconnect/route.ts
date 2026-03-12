/**
 * Google Disconnect Route
 *
 * This route allows users to disconnect their Google Classroom account.
 * It revokes the access token and clears the stored tokens from the database.
 *
 * POST /api/user/google/disconnect - Disconnects Google Classroom
 */

import { NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";

/**
 * POST handler - Disconnects Google Classroom
 */
export async function POST() {
  try {
    // Verify user is authenticated
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's current Google tokens
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        google_access_token: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Revoke the access token if it exists
    if (user.google_access_token) {
      try {
        const oauth2Client = new google.auth.OAuth2();
        await oauth2Client.revokeToken(user.google_access_token);
        console.log(`✅ Google token revoked for user ${user.id}`);
      } catch (error) {
        // Log but continue - the token might already be expired/revoked
        console.warn("Failed to revoke Google token:", error);
      }
    }

    // Clear Google tokens and disable Google Classroom
    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.userId },
        data: {
          google_classroom_enabled: false,
          google_access_token: null,
          google_refresh_token: null,
          google_token_expiry: null,
          lms_last_synced_at: null,
        },
      }),
      prisma.event.deleteMany({
        where: {
          user_id: session.userId,
          source: "google_classroom",
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Google Classroom disconnected successfully",
    });
  } catch (error) {
    console.error("Error disconnecting Google Classroom:", error);

    return NextResponse.json(
      { error: "Failed to disconnect Google Classroom" },
      { status: 500 },
    );
  }
}
