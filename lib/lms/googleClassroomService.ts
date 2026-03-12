import { google, classroom_v1 } from "googleapis";
import {
  LMSService,
  LMSAssignment,
  LMSUserCredentials,
  LMSAuthError,
  LMSConnectionError,
  LMSConfigError,
  LMSError,
} from "./types";

/**
 * Google Classroom API scopes required for accessing coursework
 */
export const GOOGLE_CLASSROOM_SCOPES = [
  "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
  "https://www.googleapis.com/auth/classroom.courses.readonly",
];

/**
 * Google Classroom Service - LMSService implementation for Google Classroom
 *
 * This service fetches assignment data from Google Classroom using the Google Classroom API.
 * Users must authenticate via OAuth2 to grant access to their coursework.
 *
 * Required OAuth scopes:
 * - classroom.coursework.me.readonly (view student's coursework)
 * - classroom.courses.readonly (view courses)
 */
export class GoogleClassroomService implements LMSService {
  readonly provider = "google_classroom";

  /**
   * Create an OAuth2 client for Google API
   */
  private createOAuth2Client(): any {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret) {
      throw new LMSConfigError(
        "google_classroom",
        "Google OAuth credentials not configured (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)",
      );
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  /**
   * Set up authentication for Google Classroom API
   */
  private async authenticate(credentials: LMSUserCredentials): Promise<any> {
    if (!credentials.googleAccessToken) {
      throw new LMSAuthError(
        "google_classroom",
        "Google access token not found",
      );
    }

    const oauth2Client = this.createOAuth2Client();

    oauth2Client.setCredentials({
      access_token: credentials.googleAccessToken,
      refresh_token: credentials.googleRefreshToken,
    });

    // Check if token is expired and refresh if needed
    const expiryDate = credentials.googleTokenExpiry;
    if (
      expiryDate &&
      new Date() >= expiryDate &&
      credentials.googleRefreshToken
    ) {
      try {
        const { credentials: newCredentials } =
          await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(newCredentials);

        // Note: The caller is responsible for updating the database with new tokens
        (oauth2Client as any).newCredentials = newCredentials;
      } catch (error) {
        throw new LMSAuthError(
          "google_classroom",
          "Failed to refresh Google access token: " +
            (error instanceof Error ? error.message : "Unknown error"),
        );
      }
    }

    return oauth2Client;
  }

  /**
   * Convert Google Classroom due date/time to JavaScript Date
   *
   * Google Classroom API returns dueDate + dueTime in UTC-style wall-clock values.
   * We store it directly as a UTC timestamp.
   */
  private convertDueDateToDate(
    dueDate?: classroom_v1.Schema$Date | null,
    dueTime?: classroom_v1.Schema$TimeOfDay | null,
  ): Date | null {
    if (!dueDate) return null;

    const year = dueDate.year || new Date().getFullYear();
    const month = (dueDate.month || 1) - 1; // JavaScript months are 0-indexed
    const day = dueDate.day || 1;

    let hours = 23;
    let minutes = 59;

    if (dueTime) {
      hours = dueTime.hours ?? 23;
      minutes = dueTime.minutes ?? 59;
    }

    const utcTimestamp = Date.UTC(year, month, day, hours, minutes, 0, 0);
    return new Date(utcTimestamp);
  }

  /**
   * Fetch coursework (assignments) for a specific course
   */
  private async fetchCourseWork(
    classroom: classroom_v1.Classroom,
    courseId: string,
  ): Promise<LMSAssignment[]> {
    try {
      const assignments: LMSAssignment[] = [];
      const now = new Date();
      let pageToken: string | undefined;

      do {
        const response = await classroom.courses.courseWork.list({
          courseId,
          pageSize: 100,
          pageToken,
          courseWorkStates: ["PUBLISHED"],
        });

        if (response.data.courseWork) {
          for (const work of response.data.courseWork) {
            if (!work.dueDate) continue;

            const deadline = this.convertDueDateToDate(
              work.dueDate,
              work.dueTime,
            );
            if (!deadline || deadline <= now) continue;

            assignments.push({
              title: work.title || "Untitled Assignment",
              course: work.courseId || "Unknown Course",
              deadline: deadline,
              externalId: work.id || undefined,
              description: work.description || undefined,
              link: work.alternateLink || undefined,
            });
          }
        }

        pageToken = response.data.nextPageToken || undefined;
      } while (pageToken);

      return assignments;
    } catch (error: any) {
      // Handle specific error cases
      if (error.code === 403) {
        // Permission denied - user might not be enrolled in this course anymore
        return [];
      }
      if (error.code === 404) {
        // Course not found
        return [];
      }
      throw error;
    }
  }

  /**
   * Fetch course details to get course names
   */
  private async fetchCourseNames(
    classroom: classroom_v1.Classroom,
    courseIds: string[],
  ): Promise<Map<string, string>> {
    const courseNames = new Map<string, string>();

    for (const courseId of courseIds) {
      try {
        const response = await classroom.courses.get({ id: courseId });
        if (response.data.name) {
          courseNames.set(courseId, response.data.name);
        }
      } catch (error: any) {
        // If we can't get the course name, use the ID
        if (error.code === 403 || error.code === 404) {
          courseNames.set(courseId, "Unknown Course");
        }
      }
    }

    return courseNames;
  }

  /**
   * Validate Google credentials
   */
  async validateCredentials(credentials: LMSUserCredentials): Promise<boolean> {
    if (!credentials.googleAccessToken) {
      return false;
    }

    try {
      const oauth2Client = await this.authenticate(credentials);
      const classroom = google.classroom({ version: "v1", auth: oauth2Client });

      // Try to list courses as a validation check
      await classroom.courses.list({ pageSize: 1 });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Fetch assignments from Google Classroom
   *
   * This method:
   * 1. Gets all courses the user is enrolled in
   * 2. For each course, fetches all coursework
   * 3. Converts coursework to unified assignment format with WIB timezone
   * 4. Resolves course IDs to course names
   *
   * @param credentials User credentials containing Google OAuth tokens
   * @returns Array of assignments in unified format
   * @throws {LMSAuthError} If Google authentication fails
   * @throws {LMSConnectionError} If connection to Google fails
   */
  async fetchAssignments(
    credentials: LMSUserCredentials,
  ): Promise<LMSAssignment[]> {
    if (!credentials.googleAccessToken) {
      throw new LMSConfigError(
        "google_classroom",
        "Google access token is not configured",
      );
    }

    let oauth2Client: any;
    try {
      oauth2Client = await this.authenticate(credentials);
    } catch (error) {
      if (error instanceof LMSAuthError) throw error;
      throw new LMSAuthError(
        "google_classroom",
        "Failed to authenticate with Google: " +
          (error instanceof Error ? error.message : "Unknown error"),
      );
    }

    const classroom = google.classroom({ version: "v1", auth: oauth2Client });

    try {
      // Step 1: Get all courses the user is enrolled in
      const courses: classroom_v1.Schema$Course[] = [];
      let pageToken: string | undefined;

      do {
        const coursesResponse = await classroom.courses.list({
          pageSize: 100,
          pageToken,
          courseStates: ["ACTIVE"],
        });

        if (coursesResponse.data.courses) {
          courses.push(...coursesResponse.data.courses);
        }

        pageToken = coursesResponse.data.nextPageToken || undefined;
      } while (pageToken);

      if (courses.length === 0) {
        return [];
      }

      const courseIds = courses.map((c) => c.id!).filter(Boolean);

      // Step 2: Fetch coursework from all courses
      const allAssignments: LMSAssignment[] = [];
      for (const courseId of courseIds) {
        try {
          const courseAssignments = await this.fetchCourseWork(
            classroom,
            courseId,
          );
          allAssignments.push(...courseAssignments);
        } catch (error) {
          // Log error but continue with other courses
          console.error(
            `Error fetching coursework for course ${courseId}:`,
            error,
          );
        }
      }

      // Step 3: Get course names and update assignments
      const courseNames = await this.fetchCourseNames(classroom, courseIds);
      for (const assignment of allAssignments) {
        const courseName = courseNames.get(assignment.course);
        if (courseName) {
          assignment.course = courseName;
        }
      }

      // Step 4: Sort by deadline
      allAssignments.sort(
        (a, b) => a.deadline.getTime() - b.deadline.getTime(),
      );

      // Store new credentials if they were refreshed
      if (oauth2Client.newCredentials) {
        (allAssignments as any).newCredentials = oauth2Client.newCredentials;
      }

      return allAssignments;
    } catch (error: any) {
      // Handle specific Google API errors
      if (error.code === 401) {
        throw new LMSAuthError(
          "google_classroom",
          "Google access token expired or invalid",
        );
      }
      if (error.code === 403) {
        throw new LMSAuthError(
          "google_classroom",
          "Access to Google Classroom denied",
        );
      }
      if (
        error.code === "ECONNABORTED" ||
        error.code === "ETIMEDOUT" ||
        error.code === "ENOTFOUND"
      ) {
        throw new LMSConnectionError(
          "google_classroom",
          "Connection to Google Classroom timed out",
        );
      }

      throw new LMSError(
        `Failed to fetch Google Classroom assignments: ${error.message || "Unknown error"}`,
        "google_classroom",
        "FETCH_ERROR",
        true,
      );
    }
  }

  /**
   * Get new credentials if they were refreshed during the last operation
   * This is a workaround to get refreshed tokens back to the caller
   */
  getRefreshedCredentials(
    assignments: LMSAssignment & { newCredentials?: any },
  ): any | null {
    return assignments.newCredentials || null;
  }
}

// Export singleton instance
export const googleClassroomService = new GoogleClassroomService();

// Re-export scopes for OAuth configuration
export { GOOGLE_CLASSROOM_SCOPES as GOOGLE_OAUTH_SCOPES };
