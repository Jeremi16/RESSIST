import cron from "node-cron";
import { prisma } from "./prisma";
import { syncUserAssignments } from "./lms";
import { formatTimeRemaining } from "./moodle";
import {
  getWhatsAppStatus,
  initializeWhatsApp,
  sendWhatsAppMessage,
  createReminderMessage,
} from "./whatsapp";
import {
  getTelegramStatus,
  initializeTelegram,
  sendTelegramMessage,
  createTelegramReminderMessage,
} from "./telegram";

let isSchedulerRunning = false;

/**
 * Start the reminder scheduler
 * Runs every 15 minutes to check for upcoming deadlines
 */
export function startScheduler(): void {
  if (isSchedulerRunning) {
    console.log("Scheduler is already running");
    return;
  }

  console.log("🕐 Starting reminder scheduler...");

  // Run every 15 minutes for more precise custom reminder timing
  cron.schedule("*/15 * * * *", async () => {
    console.log(`[${new Date().toISOString()}] Running reminder check...`);

    // Initialize WhatsApp if needed
    const waStatus = getWhatsAppStatus();
    if (!waStatus.connected) {
      try {
        await initializeWhatsApp();
      } catch (error) {
        console.log("WhatsApp initialization failed during scheduler");
      }
    }

    // Initialize Telegram if needed
    const tgStatus = getTelegramStatus();
    if (!tgStatus.connected) {
      try {
        await initializeTelegram();
      } catch (error) {
        console.log("Telegram initialization failed during scheduler");
      }
    }

    await checkAndSendReminders();
  });

  // Morning Briefing - every day at 07:00 WIB (00:00 UTC)
  cron.schedule("0 0 * * *", async () => {
    console.log(`[${new Date().toISOString()}] Running morning briefing...`);

    const tgStatus = getTelegramStatus();
    if (!tgStatus.connected) {
      try {
        await initializeTelegram();
      } catch (error) {
        console.log("Telegram initialization failed during morning briefing");
      }
    }

    await sendMorningBriefings();
  });

  isSchedulerRunning = true;
  console.log(
    "✅ Scheduler started - reminders every 15 min, morning briefing at 07:00 WIB",
  );
}

/**
 * Stop the scheduler
 */
export function stopScheduler(): void {
  isSchedulerRunning = false;
  console.log("Scheduler stopped");
}

// ─────────────────────────────────────────────────────────────────────────────
// MORNING BRIEFING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send morning briefings to users who have it enabled
 */
export async function sendMorningBriefings(): Promise<void> {
  const tgConnected = getTelegramStatus().connected;

  if (!tgConnected) {
    console.log("Telegram not connected, skipping morning briefing");
    return;
  }

  try {
    // Get users with morning briefing enabled and at least one LMS configured
    const users = await prisma.user.findMany({
      where: {
        morning_briefing: true,
        telegram_chat_id: { not: null },
        telegram_enabled: true,
        OR: [
          { moodle_enabled: true, moodle_calendar_url: { not: null } },
          {
            google_classroom_enabled: true,
            google_access_token: { not: null },
          },
        ],
      },
    });

    console.log(`Sending morning briefing to ${users.length} users`);

    for (const user of users) {
      if (!user.telegram_chat_id) continue;

      try {
        const { assignments, results, successfulSources } =
          await syncUserAssignments(user.id);

        // Build source status for message
        const sourceStatus: string[] = [];
        if (user.moodle_enabled && user.moodle_calendar_url) {
          const moodleResult = results.find((r) => r.provider === "moodle");
          sourceStatus.push(moodleResult?.error ? "❌ Moodle" : "✅ Moodle");
        }
        if (user.google_classroom_enabled && user.google_access_token) {
          const googleResult = results.find(
            (r) => r.provider === "google_classroom",
          );
          sourceStatus.push(
            googleResult?.error ? "❌ Google Classroom" : "✅ Google Classroom",
          );
        }

        if (assignments.length === 0) {
          // No upcoming assignments, send a positive message
          let message = `☀️ *Selamat Pagi${user.name ? ", " + user.name : ""}!*\n\n`;
          message += `📡 Sumber: ${sourceStatus.join(", ")}\n\n`;
          message += `🎉 Tidak ada tugas mendatang saat ini. Nikmati harimu!\n\n`;
          message += `_Pesan otomatis Morning Briefing_`;

          await sendTelegramMessage(user.telegram_chat_id, message);
          continue;
        }

        // Build briefing message
        const now = new Date();
        const todayDeadlines = assignments.filter((e) => {
          const diff = e.deadline.getTime() - now.getTime();
          return diff > 0 && diff <= 24 * 60 * 60 * 1000;
        });

        const thisWeekDeadlines = assignments.filter((e) => {
          const diff = e.deadline.getTime() - now.getTime();
          return diff > 24 * 60 * 60 * 1000 && diff <= 7 * 24 * 60 * 60 * 1000;
        });

        let message = `☀️ *Selamat Pagi${user.name ? ", " + user.name : ""}!*\n`;
        message += `📅 Ringkasan tugas - ${now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" })}\n`;
        message += `📡 Sumber: ${sourceStatus.join(", ")}\n\n`;

        if (todayDeadlines.length > 0) {
          message += `🔴 *Deadline Hari Ini (${todayDeadlines.length} tugas):*\n`;
          for (const event of todayDeadlines) {
            const time = event.deadline.toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Jakarta",
            });
            message += `  • ${event.title} (${event.course}) - pukul ${time} WIB\n`;
          }
          message += "\n";
        }

        if (thisWeekDeadlines.length > 0) {
          message += `🟡 *Deadline Minggu Ini (${thisWeekDeadlines.length} tugas):*\n`;
          for (const event of thisWeekDeadlines) {
            const dateStr = event.deadline.toLocaleDateString("id-ID", {
              weekday: "short",
              day: "numeric",
              month: "short",
              timeZone: "Asia/Jakarta",
            });
            const time = event.deadline.toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Jakarta",
            });
            message += `  • ${event.title} (${event.course}) - ${dateStr}, ${time} WIB\n`;
          }
          message += "\n";
        }

        if (
          todayDeadlines.length === 0 &&
          thisWeekDeadlines.length === 0 &&
          assignments.length > 0
        ) {
          message += `✅ Tidak ada deadline mendesak minggu ini!\n`;
          message += `📝 Total ${assignments.length} tugas mendatang.\n\n`;
        }

        message += `Semangat menjalani hari ini! 💪\n_Pesan otomatis Morning Briefing_`;

        await sendTelegramMessage(user.telegram_chat_id, message);
        console.log(
          `✅ Morning briefing sent to user ${user.id} (${assignments.length} tugas dari ${successfulSources} sumber)`,
        );
      } catch (error) {
        console.error(
          `Error sending morning briefing to user ${user.id}:`,
          error,
        );
      }
    }
  } catch (error) {
    console.error("Error in morning briefing:", error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM REMINDER INTERVALS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check and send reminders for all users
 */
export async function checkAndSendReminders(): Promise<void> {
  const waConnected = getWhatsAppStatus().connected;
  const tgConnected = getTelegramStatus().connected;

  if (!waConnected && !tgConnected) {
    console.log(
      "Neither WhatsApp nor Telegram connected, skipping reminder check",
    );
    return;
  }

  try {
    // Get all users with at least one messaging service and at least one LMS configured
    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { whatsapp_number: { not: null }, whatsapp_enabled: true },
              { telegram_chat_id: { not: null }, telegram_enabled: true },
            ],
          },
          {
            OR: [
              { moodle_enabled: true, moodle_calendar_url: { not: null } },
              {
                google_classroom_enabled: true,
                google_access_token: { not: null },
              },
            ],
          },
        ],
      },
    });

    console.log(`Checking reminders for ${users.length} users`);

    for (const user of users) {
      try {
        await processUserReminders(user);
      } catch (error) {
        console.error(`Error processing reminders for user ${user.id}:`, error);
      }
    }
  } catch (error) {
    console.error("Error in reminder check:", error);
  }
}

interface SchedulerUser {
  id: string;
  email: string;
  name: string | null;
  whatsapp_number: string | null;
  whatsapp_enabled: boolean;
  telegram_chat_id: string | null;
  telegram_enabled: boolean;
  moodle_enabled: boolean;
  moodle_calendar_url: string | null;
  google_classroom_enabled: boolean;
  google_access_token: string | null;
  google_refresh_token: string | null;
  google_token_expiry: Date | null;
  reminder_hours: string;
  muted_courses: string;
}

function parseMutedCourses(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {}
  return [];
}

function parseReminderHours(raw: string): number[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map(Number).filter((n) => !isNaN(n) && n > 0);
    }
  } catch {}
  return [24];
}

function parseRemindersSent(raw: string): number[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(Number);
  } catch {}
  return [];
}

/**
 * Process reminders for a single user
 */
async function processUserReminders(user: SchedulerUser): Promise<void> {
  const waCanSend = !!(user.whatsapp_number && user.whatsapp_enabled);
  const tgCanSend = !!(user.telegram_chat_id && user.telegram_enabled);
  if (!waCanSend && !tgCanSend) return;

  const now = new Date();
  const reminderHours = parseReminderHours(user.reminder_hours);
  const mutedCourses = parseMutedCourses(user.muted_courses);
  const maxHours = Math.max(...reminderHours);
  const maxWindowEnd = new Date(now.getTime() + maxHours * 60 * 60 * 1000);

  try {
    const { results } = await syncUserAssignments(user.id);

    // Log fetch results
    const sources = results
      .map(
        (r) =>
          `${r.provider}${r.error ? "(error)" : `(${r.assignments.length})`}`,
      )
      .join(", ");
    console.log(`User ${user.id}: Sync sources [${sources}]`);

    const enabledSources = [
      user.moodle_enabled && user.moodle_calendar_url ? "moodle" : null,
      user.google_classroom_enabled && user.google_access_token
        ? "google_classroom"
        : null,
    ].filter(Boolean) as Array<"moodle" | "google_classroom">;

    if (enabledSources.length === 0) return;

    const reminderCandidates = await prisma.event.findMany({
      where: {
        user_id: user.id,
        source: { in: enabledSources },
        deadline: {
          gt: now,
          lte: maxWindowEnd,
        },
      },
      orderBy: {
        deadline: "asc",
      },
    });

    // Process each assignment from cached DB events
    for (const event of reminderCandidates) {
      const courseName = event.course || "";
      if (courseName && mutedCourses.includes(courseName)) continue;

      // Check each reminder interval
      const alreadySent = parseRemindersSent(event.reminders_sent);
      const hoursUntilDeadline =
        (event.deadline.getTime() - now.getTime()) / (60 * 60 * 1000);

      for (const hours of reminderHours) {
        if (alreadySent.includes(hours)) continue;

        // Send if we're within the window for this reminder
        if (hoursUntilDeadline <= hours) {
          const timeRemaining = formatTimeRemaining(event.deadline);
          let sent = false;

          if (waCanSend && user.whatsapp_number) {
            const message = createReminderMessage(
              event.title,
              event.course || "Mata Kuliah",
              event.deadline,
              timeRemaining,
            );
            const waSent = await sendWhatsAppMessage(
              user.whatsapp_number,
              message,
            );
            if (waSent) sent = true;
          }

          if (tgCanSend && user.telegram_chat_id) {
            const tgMessage = createTelegramReminderMessage(
              event.title,
              event.course || "Mata Kuliah",
              event.deadline,
              timeRemaining,
            );
            const tgSent = await sendTelegramMessage(
              user.telegram_chat_id,
              tgMessage,
            );
            if (tgSent) sent = true;
          }

          if (sent) {
            alreadySent.push(hours);
            await prisma.event.update({
              where: { id: event.id },
              data: {
                reminders_sent: JSON.stringify(alreadySent),
                reminder_24h_sent:
                  alreadySent.includes(24) || event.reminder_24h_sent,
              },
            });
            console.log(
              `Sent ${hours}h reminder for "${event.title}" (${event.course}) to user ${user.id}`,
            );
          }
        }
      }
    }

    // Clean up old events (past deadlines) for this user
    await prisma.event.deleteMany({
      where: {
        user_id: user.id,
        deadline: {
          lt: now,
        },
      },
    });
  } catch (error) {
    console.error(
      `Error processing calendar for user ${user.id}:`,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus(): {
  running: boolean;
  whatsappConnected: boolean;
  telegramConnected: boolean;
} {
  return {
    running: isSchedulerRunning,
    whatsappConnected: getWhatsAppStatus().connected,
    telegramConnected: getTelegramStatus().connected,
  };
}
