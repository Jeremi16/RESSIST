import {
  LMSService,
  LMSUserCredentials,
  LMSAssignment,
  LMSError,
  LMSConfigError,
} from "./types";
import { MoodleService } from "./moodleService";
import { GoogleClassroomService } from "./googleClassroomService";

/**
 * LMS Provider types
 */
export type LMSProvider = "moodle" | "google_classroom";

/**
 * Multi-LMS Configuration
 */
export interface MultiLMSConfig {
  moodle?: {
    enabled: boolean;
    calendarUrl?: string | null;
  };
  google_classroom?: {
    enabled: boolean;
    accessToken?: string | null;
    refreshToken?: string | null;
    tokenExpiry?: Date | null;
  };
}

/**
 * Fetch result from a single LMS
 */
export interface LMSFetchResult {
  provider: LMSProvider;
  assignments: LMSAssignment[];
  error?: LMSError;
  refreshedCredentials?: {
    accessToken: string;
    expiryDate: Date;
  };
}

/**
 * LMS Factory
 *
 * This factory provides a centralized way to get the appropriate LMS service
 * based on the user's selected LMS provider.
 */
class LMSFactory {
  private services: Map<LMSProvider, LMSService> = new Map();

  constructor() {
    // Register available LMS services
    this.services.set("moodle", new MoodleService());
    this.services.set("google_classroom", new GoogleClassroomService());
  }

  /**
   * Get the LMS service for a specific provider
   *
   * @param provider The LMS provider ('moodle' or 'google_classroom')
   * @returns The LMSService implementation
   * @throws {LMSConfigError} If the provider is not supported
   */
  getService(provider: LMSProvider): LMSService {
    const service = this.services.get(provider);
    if (!service) {
      throw new LMSConfigError(
        provider,
        `Unsupported LMS provider: ${provider}`,
      );
    }
    return service;
  }

  /**
   * Check if a provider is supported
   *
   * @param provider The LMS provider to check
   * @returns True if supported
   */
  isSupported(provider: string): provider is LMSProvider {
    return this.services.has(provider as LMSProvider);
  }

  /**
   * Get all supported providers
   *
   * @returns Array of supported provider names
   */
  getSupportedProviders(): LMSProvider[] {
    return Array.from(this.services.keys());
  }

  /**
   * Fetch assignments from multiple LMS sources in parallel
   *
   * @param config Multi-LMS configuration
   * @param userId User ID for credentials
   * @returns Array of fetch results from each enabled source
   */
  async fetchFromMultipleSources(
    config: MultiLMSConfig,
    userId: string,
  ): Promise<LMSFetchResult[]> {
    const fetchPromises: Promise<LMSFetchResult>[] = [];

    // Moodle
    if (config.moodle?.enabled && config.moodle.calendarUrl) {
      fetchPromises.push(
        this.fetchFromSingleSource("moodle", {
          userId,
          moodleCalendarUrl: config.moodle.calendarUrl,
        }),
      );
    }

    // Google Classroom
    if (
      config.google_classroom?.enabled &&
      config.google_classroom.accessToken
    ) {
      fetchPromises.push(
        this.fetchFromSingleSource("google_classroom", {
          userId,
          googleAccessToken: config.google_classroom.accessToken,
          googleRefreshToken: config.google_classroom.refreshToken,
          googleTokenExpiry: config.google_classroom.tokenExpiry,
        }),
      );
    }

    // Execute all fetches in parallel
    const results = await Promise.all(fetchPromises);
    return results;
  }

  /**
   * Fetch assignments from a single LMS source
   */
  private async fetchFromSingleSource(
    provider: LMSProvider,
    credentials: LMSUserCredentials,
  ): Promise<LMSFetchResult> {
    try {
      const service = this.getService(provider);

      // Validate credentials before fetching
      const isValid = await service.validateCredentials(credentials);
      if (!isValid) {
        return {
          provider,
          assignments: [],
          error: new LMSConfigError(
            provider,
            `Invalid ${provider} configuration`,
          ),
        };
      }

      const assignments = await service.fetchAssignments(credentials);

      // Check for refreshed credentials (Google Classroom)
      const refreshedCredentials = (assignments as any).newCredentials
        ? {
            accessToken: (assignments as any).newCredentials.access_token,
            expiryDate: new Date(
              (assignments as any).newCredentials.expiry_date ||
                Date.now() + 3600 * 1000,
            ),
          }
        : undefined;

      return {
        provider,
        assignments,
        refreshedCredentials,
      };
    } catch (error) {
      return {
        provider,
        assignments: [],
        error:
          error instanceof LMSError
            ? error
            : new LMSError(
                error instanceof Error ? error.message : "Unknown error",
                provider,
                "FETCH_ERROR",
                true,
              ),
      };
    }
  }
}

// Export singleton instance
export const lmsFactory = new LMSFactory();

/**
 * Fetch assignments from the appropriate LMS
 *
 * @param provider The LMS provider ('moodle' or 'google_classroom')
 * @param credentials User credentials for the LMS
 * @returns Array of assignments in unified format
 */
export async function fetchAssignmentsFromLMS(
  provider: LMSProvider,
  credentials: LMSUserCredentials,
): Promise<LMSAssignment[]> {
  const service = lmsFactory.getService(provider);

  // Validate credentials before fetching
  const isValid = await service.validateCredentials(credentials);
  if (!isValid) {
    throw new LMSConfigError(
      provider,
      `Invalid or missing ${provider} configuration`,
    );
  }

  return await service.fetchAssignments(credentials);
}

/**
 * Fetch assignments from multiple LMS sources
 *
 * @param config Multi-LMS configuration
 * @param userId User ID
 * @returns Combined array of assignments from all sources with metadata
 */
export async function fetchAssignmentsFromMultipleSources(
  config: MultiLMSConfig,
  userId: string,
): Promise<{
  assignments: LMSAssignment[];
  results: LMSFetchResult[];
  totalSources: number;
  successfulSources: number;
  failedSources: number;
}> {
  const results = await lmsFactory.fetchFromMultipleSources(config, userId);

  // Combine all assignments with source tracking
  const allAssignments: LMSAssignment[] = [];

  for (const result of results) {
    if (!result.error) {
      // Tag each assignment with its source
      const taggedAssignments = result.assignments.map((a) => ({
        ...a,
        // Add source prefix to distinguish duplicates
        source: result.provider,
      }));
      allAssignments.push(...taggedAssignments);
    }
  }

  // Sort by deadline
  allAssignments.sort((a, b) => a.deadline.getTime() - b.deadline.getTime());

  // Remove duplicates (same title and deadline from different sources)
  const uniqueAssignments = removeDuplicateAssignments(allAssignments);

  return {
    assignments: uniqueAssignments,
    results,
    totalSources: results.length,
    successfulSources: results.filter((r) => !r.error).length,
    failedSources: results.filter((r) => r.error).length,
  };
}

/**
 * Remove duplicate assignments based on title and deadline
 */
function removeDuplicateAssignments(
  assignments: LMSAssignment[],
): LMSAssignment[] {
  const seen = new Set<string>();
  return assignments.filter((assignment) => {
    const source = (assignment as any).source || "unknown";
    const title = assignment.title.trim().toLowerCase();
    const course = assignment.course.trim().toLowerCase();
    const externalId = assignment.externalId || "";
    const key = `${source}-${course}-${title}-${assignment.deadline.getTime()}-${externalId}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Validate LMS credentials without fetching assignments
 *
 * @param provider The LMS provider
 * @param credentials User credentials to validate
 * @returns True if valid, false otherwise
 */
export async function validateLMSCredentials(
  provider: LMSProvider,
  credentials: LMSUserCredentials,
): Promise<boolean> {
  try {
    const service = lmsFactory.getService(provider);
    return await service.validateCredentials(credentials);
  } catch {
    return false;
  }
}

// Re-export error classes only (types are exported from index.ts)
export { LMSConfigError, LMSAuthError, LMSConnectionError } from "./types";
