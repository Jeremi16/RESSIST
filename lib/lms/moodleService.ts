import axios from "axios";
import {
  LMSService,
  LMSAssignment,
  LMSUserCredentials,
  LMSConnectionError,
  LMSConfigError,
  LMSError,
} from "./types";

/**
 * Moodle calendar event from ICS parsing
 */
interface MoodleCalendarEvent {
  uid?: string;
  title: string;
  course: string;
  start: Date;
  end: Date;
  description?: string;
}

/**
 * Moodle Service - LMSService implementation for Moodle ICS calendar
 *
 * This service fetches assignment data from Moodle by parsing ICS calendar exports.
 * Users must provide their Moodle calendar URL which can be obtained from:
 * Moodle > Calendar > Export Calendar > Get calendar URL
 */
export class MoodleService implements LMSService {
  readonly provider = "moodle";

  /**
   * Fetch ICS file from Moodle calendar URL
   */
  private async fetchICSFile(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`[MoodleService] Axios Error: ${error.message}`, {
          status: error.response?.status,
          code: error.code,
          url: url.substring(0, 50) + "...",
        });
        if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
          throw new LMSConnectionError(
            "moodle",
            "Connection to Moodle timed out",
          );
        }
        if (error.response?.status === 404) {
          throw new LMSConfigError(
            "moodle",
            "Moodle calendar URL not found (404)",
          );
        }
        throw new LMSConnectionError(
          "moodle",
          `Failed to fetch ICS file: ${error.message}`,
        );
      }
      console.error("[MoodleService] Unknown Error:", error);
      throw new LMSConnectionError(
        "moodle",
        "Failed to fetch ICS file: Unknown error",
      );
    }
  }

  /**
   * Parse ICS calendar data into events
   */
  private parseICS(icsData: string): MoodleCalendarEvent[] {
    try {
      const events: MoodleCalendarEvent[] = [];
      const lines = icsData.split(/\r\n|\n|\r/);

      let currentEvent: Partial<MoodleCalendarEvent> | null = null;
      let inEvent = false;
      let descriptionLines: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Handle folded lines (lines starting with space)
        if (line.startsWith(" ") && descriptionLines.length > 0) {
          descriptionLines[descriptionLines.length - 1] += line.substring(1);
          continue;
        }

        if (line === "BEGIN:VEVENT") {
          inEvent = true;
          currentEvent = {};
          descriptionLines = [];
        } else if (line === "END:VEVENT") {
          if (currentEvent && currentEvent.title) {
            events.push({
              uid: currentEvent.uid,
              title: currentEvent.title,
              course: currentEvent.course || "Umum",
              start: currentEvent.start || new Date(),
              end: currentEvent.end || currentEvent.start || new Date(),
              description: currentEvent.description,
            });
          }
          inEvent = false;
          currentEvent = null;
        } else if (inEvent && currentEvent) {
          if (line.startsWith("SUMMARY:")) {
            currentEvent.title = line
              .substring(8)
              .replace(/\\,/g, ",")
              .replace(/\\n/g, "\n");
          } else if (line.startsWith("UID:")) {
            currentEvent.uid = line.substring(4).trim();
          } else if (line.startsWith("CATEGORIES:")) {
            currentEvent.course = line
              .substring(11)
              .replace(/\\,/g, ",")
              .trim();
          } else if (line.startsWith("DTSTART")) {
            const dateStr = line.split(":")[1];
            const utcDate = this.parseICalDate(dateStr);
            currentEvent.start = utcDate;
          } else if (line.startsWith("DTEND")) {
            const dateStr = line.split(":")[1];
            const utcDate = this.parseICalDate(dateStr);
            currentEvent.end = utcDate;
          } else if (line.startsWith("DESCRIPTION:")) {
            descriptionLines.push(
              line.substring(12).replace(/\\,/g, ",").replace(/\\n/g, "\n"),
            );
            currentEvent.description = descriptionLines.join("");
          }
        }
      }

      return events.sort((a, b) => a.start.getTime() - b.start.getTime());
    } catch (error) {
      console.error("[MoodleService] ICS Parse Error:", error);
      throw new LMSError(
        `Failed to parse ICS data: ${error instanceof Error ? error.message : "Unknown error"}`,
        "moodle",
        "PARSE_ERROR",
        false,
      );
    }
  }

  /**
   * Parse iCal date string to Date object
   */
  private parseICalDate(dateStr: string): Date {
    if (!dateStr) return new Date();

    // Handle UTC format (ends with Z)
    if (dateStr.endsWith("Z")) {
      return new Date(
        Date.UTC(
          parseInt(dateStr.substring(0, 4)),
          parseInt(dateStr.substring(4, 6)) - 1,
          parseInt(dateStr.substring(6, 8)),
          parseInt(dateStr.substring(9, 11)),
          parseInt(dateStr.substring(11, 13)),
          parseInt(dateStr.substring(13, 15)),
        ),
      );
    }

    // Handle local format
    if (dateStr.length >= 15 && dateStr.includes("T")) {
      return new Date(
        parseInt(dateStr.substring(0, 4)),
        parseInt(dateStr.substring(4, 6)) - 1,
        parseInt(dateStr.substring(6, 8)),
        parseInt(dateStr.substring(9, 11)),
        parseInt(dateStr.substring(11, 13)),
        parseInt(dateStr.substring(13, 15)),
      );
    }

    // Handle date-only format (YYYYMMDD)
    if (dateStr.length === 8) {
      return new Date(
        parseInt(dateStr.substring(0, 4)),
        parseInt(dateStr.substring(4, 6)) - 1,
        parseInt(dateStr.substring(6, 8)),
      );
    }

    return new Date(dateStr);
  }

  /**
   * Filter upcoming events within the specified hours ahead
   */
  private getUpcomingEvents(
    events: MoodleCalendarEvent[],
    hoursAhead: number = 168,
  ): LMSAssignment[] {
    const now = new Date();
    const cutoff = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

    return events
      .filter((event) => {
        const eventTime = event.end || event.start;
        return eventTime > now && eventTime <= cutoff;
      })
      .map((event) => ({
        title: event.title,
        course: event.course,
        deadline: event.end || event.start,
        externalId: event.uid,
        description: event.description,
      }));
  }

  /**
   * Validate Moodle calendar URL configuration
   */
  async validateCredentials(credentials: LMSUserCredentials): Promise<boolean> {
    if (!credentials.moodleCalendarUrl) {
      return false;
    }

    try {
      const url = new URL(credentials.moodleCalendarUrl);
      const pathname = url.pathname.toLowerCase();
      const hasIcsPath = pathname.includes(".ics");
      const hasMoodleExportPath =
        pathname.includes("/calendar/export") ||
        pathname.includes("export_execute.php");
      const hasMoodleToken =
        url.searchParams.has("authtoken") && url.searchParams.has("userid");

      return hasIcsPath || hasMoodleExportPath || hasMoodleToken;
    } catch {
      return false;
    }
  }

  /**
   * Fetch assignments from Moodle calendar
   *
   * @param credentials User credentials containing moodleCalendarUrl
   * @returns Array of assignments in unified format
   * @throws {LMSConfigError} If Moodle URL is not configured
   * @throws {LMSConnectionError} If connection to Moodle fails
   */
  async fetchAssignments(
    credentials: LMSUserCredentials,
  ): Promise<LMSAssignment[]> {
    if (!credentials.moodleCalendarUrl) {
      throw new LMSConfigError(
        "moodle",
        "Moodle calendar URL is not configured",
      );
    }

    console.debug(
      `[MoodleService] Fetching assignments for URL: ${credentials.moodleCalendarUrl.substring(0, 50)}...`,
    );
    const icsData = await this.fetchICSFile(credentials.moodleCalendarUrl);
    console.debug(
      `[MoodleService] Received ICS data, length: ${icsData.length}`,
    );

    const events = this.parseICS(icsData);
    console.debug(`[MoodleService] Parsed ${events.length} events`);

    const upcoming = this.getUpcomingEvents(events, 1440); // 60 days ahead
    console.debug(
      `[MoodleService] Found ${upcoming.length} upcoming assignments`,
    );

    return upcoming;
  }
}

// Export singleton instance
export const moodleService = new MoodleService();
