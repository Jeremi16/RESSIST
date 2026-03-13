import { NextRequest, NextResponse } from "next/server";
import {
  fetchAssignmentsFromMultipleSources,
  MultiLMSConfig,
  LMSAuthError,
  LMSConnectionError,
  LMSConfigError,
  syncUserAssignments,
} from "@/lib/lms";
import { fetchAndParseMoodleCalendar, formatTimeRemaining } from "@/lib/moodle";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";

export interface EventPreview {
  title: string;
  course: string;
  deadline: string;
  timeRemaining: string;
  deadlineDate: Date;
  source: string;
}

/**
 * POST handler - Test calendar connection with provided credentials
 * Supports testing single or multiple LMS sources
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      moodle_calendar_url,
      test_moodle = true,
      test_google = false,
    } = body;

    const session = await verifySession();

    // Build config based on what user wants to test
    const config: MultiLMSConfig = {};

    // Moodle testing
    if (test_moodle && moodle_calendar_url) {
      config.moodle = {
        enabled: true,
        calendarUrl: moodle_calendar_url,
      };
    }

    // Google Classroom testing (requires session)
    if (test_google && session) {
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: {
          google_access_token: true,
          google_refresh_token: true,
          google_token_expiry: true,
        },
      });

      if (user?.google_access_token) {
        config.google_classroom = {
          enabled: true,
          accessToken: user.google_access_token,
          refreshToken: user.google_refresh_token,
          tokenExpiry: user.google_token_expiry,
        };
      }
    }

    // Check if at least one source is configured
    if (!config.moodle && !config.google_classroom) {
      return NextResponse.json(
        { error: "No LMS source configured for testing" },
        { status: 400 },
      );
    }

    // Fetch from configured sources
    const { assignments, results, successfulSources, failedSources } =
      await fetchAssignmentsFromMultipleSources(
        config,
        session?.userId || "test",
      );

    // Handle refreshed tokens for Google Classroom
    const googleResult = results.find((r) => r.provider === "google_classroom");
    if (googleResult?.refreshedCredentials && session) {
      await prisma.user.update({
        where: { id: session.userId },
        data: {
          google_access_token: googleResult.refreshedCredentials.accessToken,
          google_token_expiry: googleResult.refreshedCredentials.expiryDate,
        },
      });
    }

    // Format the events for preview
    const events: EventPreview[] = assignments.map((assignment) => ({
      title: assignment.title,
      course: assignment.course,
      deadline: assignment.deadline.toISOString(),
      timeRemaining: formatTimeRemaining(assignment.deadline),
      deadlineDate: assignment.deadline,
      source: (assignment as any).source || "unknown",
    }));

    // Build source info for response
    const sourceInfo = results.map((r) => ({
      provider: r.provider,
      count: r.assignments.length,
      error: r.error
        ? {
            code: r.error.code,
            message: r.error.message,
          }
        : undefined,
    }));

    return NextResponse.json({
      events,
      sources: sourceInfo,
      total: assignments.length,
      successfulSources,
      failedSources,
    });
  } catch (error) {
    console.error("Error testing calendar:", error);

    // Handle specific error types
    if (error instanceof LMSAuthError) {
      return NextResponse.json(
        { error: "Authentication failed. Please reconnect your account." },
        { status: 401 },
      );
    }
    if (error instanceof LMSConnectionError) {
      return NextResponse.json(
        { error: `Connection failed: ${error.message}` },
        { status: 503 },
      );
    }
    if (error instanceof LMSConfigError) {
      return NextResponse.json(
        { error: `Configuration error: ${error.message}` },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to test calendar" },
      { status: 500 },
    );
  }
}

/**
 * GET handler - Fetch calendar preview for current user
 * Uses the user's configured LMS sources
 */
export async function GET(request: NextRequest) {
  try {
    // Verify session
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const forceRefresh = request.nextUrl.searchParams.get("force") === "true";

    const {
      assignments,
      results,
      successfulSources,
      failedSources,
      fromCache,
      lastSyncedAt,
      nextRefreshAt,
    } = await syncUserAssignments(session.userId, {
      forceRefresh,
      readFromCacheOnly: !forceRefresh,
    });

    // Format the events for preview
    const events: EventPreview[] = assignments.map((assignment) => ({
      title: assignment.title,
      course: assignment.course,
      deadline: assignment.deadline.toISOString(),
      timeRemaining: formatTimeRemaining(assignment.deadline),
      deadlineDate: assignment.deadline,
      source: (assignment as any).source || "unknown",
    }));

    // Build source info
    const sourceInfo = results.map((r) => ({
      provider: r.provider,
      count: r.assignments.length,
      success: !r.error,
    }));

    return NextResponse.json({
      events,
      sources: sourceInfo,
      total: assignments.length,
      successfulSources,
      failedSources,
      fromCache,
      lastSyncedAt,
      nextRefreshAt,
    });
  } catch (error) {
    console.error("Error fetching calendar preview:", error);

    if (error instanceof LMSAuthError) {
      return NextResponse.json(
        { error: "Authentication failed. Please reconnect your account." },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch calendar preview" },
      { status: 500 },
    );
  }
}
