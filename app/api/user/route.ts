import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";

function isLikelyMoodleCalendarUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    const pathname = url.pathname.toLowerCase();
    return (
      pathname.includes(".ics") ||
      pathname.includes("/calendar/export") ||
      pathname.includes("export_execute.php") ||
      (url.searchParams.has("authtoken") && url.searchParams.has("userid"))
    );
  } catch {
    return false;
  }
}

/**
 * GET handler - Fetch current user data
 */
export async function GET() {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar_url: true,
        whatsapp_number: true,
        whatsapp_enabled: true,
        telegram_chat_id: true,
        telegram_enabled: true,
        // LMS Configuration
        moodle_enabled: true,
        moodle_calendar_url: true,
        google_classroom_enabled: true,
        google_token_expiry: true,
        // Settings
        reminder_hours: true,
        morning_briefing: true,
        muted_courses: true,
        created_at: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Transform response to include google_connected boolean instead of token
    const response = {
      ...user,
      google_connected: !!user.google_token_expiry,
      telegram_bot_username: process.env.TELEGRAM_BOT_USERNAME || "resisst_bot",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PUT handler - Update user data
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      // Messaging settings
      whatsapp_number,
      whatsapp_enabled,
      telegram_chat_id,
      telegram_enabled,
      // LMS settings - Multi source
      moodle_enabled,
      moodle_calendar_url,
      google_classroom_enabled,
      // General settings
      reminder_hours,
      morning_briefing,
      muted_courses,
    } = body;

    // Validate WhatsApp number format (basic validation)
    if (whatsapp_number !== undefined) {
      const cleanedNumber = whatsapp_number.replace(/\D/g, "");
      if (cleanedNumber.length < 10) {
        return NextResponse.json(
          { error: "Invalid WhatsApp number" },
          { status: 400 },
        );
      }
    }

    // Validate Moodle URL format (only if provided and Moodle is enabled)
    if (moodle_calendar_url !== undefined && moodle_enabled !== false) {
      if (moodle_calendar_url) {
        if (!isLikelyMoodleCalendarUrl(moodle_calendar_url)) {
          return NextResponse.json(
            { error: "Invalid Moodle calendar URL" },
            { status: 400 },
          );
        }
      }
    }

    // Validate Google Classroom is connected if trying to enable it
    if (google_classroom_enabled === true) {
      const existingUser = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { google_access_token: true },
      });

      if (!existingUser?.google_access_token) {
        return NextResponse.json(
          { error: "Please connect Google Classroom first before enabling it" },
          { status: 400 },
        );
      }
    }

    // Build update data
    const updateData: any = {
      // Messaging
      whatsapp_number:
        whatsapp_number !== undefined ? whatsapp_number || null : undefined,
      whatsapp_enabled:
        whatsapp_enabled !== undefined ? whatsapp_enabled : undefined,
      telegram_chat_id:
        telegram_chat_id !== undefined ? telegram_chat_id || null : undefined,
      telegram_enabled:
        telegram_enabled !== undefined ? telegram_enabled : undefined,
      // LMS - Multi source
      moodle_enabled: moodle_enabled !== undefined ? moodle_enabled : undefined,
      moodle_calendar_url:
        moodle_calendar_url !== undefined
          ? moodle_calendar_url || null
          : undefined,
      google_classroom_enabled:
        google_classroom_enabled !== undefined
          ? google_classroom_enabled
          : undefined,
      // Settings
      reminder_hours: reminder_hours !== undefined ? reminder_hours : undefined,
      morning_briefing:
        morning_briefing !== undefined ? morning_briefing : undefined,
      muted_courses: muted_courses !== undefined ? muted_courses : undefined,
    };

    const hasLMSConfigChange =
      moodle_enabled !== undefined ||
      moodle_calendar_url !== undefined ||
      google_classroom_enabled !== undefined;

    if (hasLMSConfigChange) {
      updateData.lms_last_synced_at = null;
    }

    // Remove undefined values
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const user = await prisma.user.update({
      where: { id: session.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        avatar_url: true,
        whatsapp_number: true,
        whatsapp_enabled: true,
        telegram_chat_id: true,
        telegram_enabled: true,
        moodle_enabled: true,
        moodle_calendar_url: true,
        google_classroom_enabled: true,
        google_token_expiry: true,
        reminder_hours: true,
        morning_briefing: true,
        muted_courses: true,
        created_at: true,
      },
    });

    // Transform response
    const response = {
      ...user,
      google_connected: !!user.google_token_expiry,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
