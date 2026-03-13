import { prisma } from "../prisma";
import {
  fetchAssignmentsFromMultipleSources,
  LMSFetchResult,
  LMSProvider,
  MultiLMSConfig,
} from "./lmsFactory";
import { LMSAssignment } from "./types";

const LMS_SYNC_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const UPCOMING_WINDOW_DAYS = 60;
const ALL_PROVIDERS: LMSProvider[] = ["moodle", "google_classroom"];
const UPSERT_BATCH_SIZE = 50;

type AssignmentWithSource = LMSAssignment & { source: LMSProvider };

interface UserLMSConfig {
  id: string;
  moodle_enabled: boolean;
  moodle_calendar_url: string | null;
  google_classroom_enabled: boolean;
  google_access_token: string | null;
  google_refresh_token: string | null;
  google_token_expiry: Date | null;
  lms_last_synced_at: Date | null;
}

export interface UserAssignmentSyncResult {
  assignments: AssignmentWithSource[];
  results: LMSFetchResult[];
  fromCache: boolean;
  successfulSources: number;
  failedSources: number;
  lastSyncedAt: Date | null;
  nextRefreshAt: Date | null;
}

interface SyncUserAssignmentsOptions {
  forceRefresh?: boolean;
  readFromCacheOnly?: boolean;
}

function normalizeText(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function buildAssignmentSyncKey(assignment: AssignmentWithSource): string {
  if (assignment.externalId) {
    return `${assignment.source}:${assignment.externalId}`;
  }

  return `${assignment.source}:${normalizeText(assignment.course)}:${normalizeText(assignment.title)}`;
}

function buildConfigFromUser(user: UserLMSConfig): {
  config: MultiLMSConfig;
  enabledProviders: LMSProvider[];
} {
  const config: MultiLMSConfig = {};
  const enabledProviders: LMSProvider[] = [];

  if (user.moodle_enabled && user.moodle_calendar_url) {
    config.moodle = {
      enabled: true,
      calendarUrl: user.moodle_calendar_url,
    };
    enabledProviders.push("moodle");
  }

  if (user.google_classroom_enabled && user.google_access_token) {
    config.google_classroom = {
      enabled: true,
      accessToken: user.google_access_token,
      refreshToken: user.google_refresh_token,
      tokenExpiry: user.google_token_expiry,
    };
    enabledProviders.push("google_classroom");
  }

  return { config, enabledProviders };
}

function shouldRefresh(lastSyncedAt: Date | null): boolean {
  if (!lastSyncedAt) return true;
  return Date.now() - lastSyncedAt.getTime() >= LMS_SYNC_COOLDOWN_MS;
}

function computeNextRefreshAt(lastSyncedAt: Date | null): Date | null {
  if (!lastSyncedAt) return null;
  return new Date(lastSyncedAt.getTime() + LMS_SYNC_COOLDOWN_MS);
}

async function removeDisabledProviderEvents(
  userId: string,
  enabledProviders: LMSProvider[],
): Promise<void> {
  const now = new Date();

  if (enabledProviders.length === 0) {
    await prisma.event.deleteMany({
      where: {
        user_id: userId,
        deadline: { gt: now },
      },
    });
    return;
  }

  await prisma.event.deleteMany({
    where: {
      user_id: userId,
      deadline: { gt: now },
      source: {
        in: ALL_PROVIDERS.filter(
          (provider) => !enabledProviders.includes(provider),
        ),
      },
    },
  });
}

async function loadCachedAssignments(
  userId: string,
  enabledProviders: LMSProvider[],
): Promise<AssignmentWithSource[]> {
  if (enabledProviders.length === 0) return [];

  const now = new Date();
  const cutoff = new Date(
    now.getTime() + UPCOMING_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );

  const events = await prisma.event.findMany({
    where: {
      user_id: userId,
      source: { in: enabledProviders },
      deadline: {
        gt: now,
        lte: cutoff,
      },
    },
    orderBy: {
      deadline: "asc",
    },
  });

  return events.map((event) => ({
    title: event.title,
    course: event.course || "Unknown Course",
    deadline: event.deadline,
    externalId: event.source_id || undefined,
    source: (event.source as LMSProvider) || "moodle",
  }));
}

function buildCachedResults(
  assignments: AssignmentWithSource[],
  enabledProviders: LMSProvider[],
): LMSFetchResult[] {
  return enabledProviders.map((provider) => ({
    provider,
    assignments: assignments.filter(
      (assignment) => assignment.source === provider,
    ),
  }));
}

async function persistAssignmentsFromResults(
  userId: string,
  results: LMSFetchResult[],
): Promise<void> {
  const now = new Date();
  const successResults = results.filter((result) => !result.error);

  for (const result of successResults) {
    const assignments = result.assignments.map((assignment) => ({
      ...assignment,
      source: result.provider,
    })) as AssignmentWithSource[];

    const syncKeySet = new Set<string>();
    const upsertOperations = assignments.map((assignment) => {
      const syncKey = buildAssignmentSyncKey(assignment);
      syncKeySet.add(syncKey);

      return prisma.event.upsert({
        where: {
          user_id_sync_key: {
            user_id: userId,
            sync_key: syncKey,
          },
        },
        update: {
          title: assignment.title,
          course: assignment.course || null,
          deadline: assignment.deadline,
          source: result.provider,
          source_id: assignment.externalId || null,
        },
        create: {
          user_id: userId,
          sync_key: syncKey,
          title: assignment.title,
          course: assignment.course || null,
          deadline: assignment.deadline,
          source: result.provider,
          source_id: assignment.externalId || null,
          reminder_24h_sent: false,
          reminders_sent: "[]",
        },
      });
    });

    for (let i = 0; i < upsertOperations.length; i += UPSERT_BATCH_SIZE) {
      await prisma.$transaction(
        upsertOperations.slice(i, i + UPSERT_BATCH_SIZE),
      );
    }

    await prisma.event.deleteMany({
      where: {
        user_id: userId,
        source: result.provider,
        deadline: { gt: now },
        ...(syncKeySet.size > 0
          ? { sync_key: { notIn: Array.from(syncKeySet) } }
          : {}),
      },
    });
  }
}

async function updateUserSyncMetadata(
  userId: string,
  results: LMSFetchResult[],
  shouldUpdateLastSyncedAt: boolean,
): Promise<Date | null> {
  const googleResult = results.find((r) => r.provider === "google_classroom");
  const refreshed = googleResult?.refreshedCredentials;

  const data: {
    google_access_token?: string;
    google_token_expiry?: Date;
    lms_last_synced_at?: Date;
  } = {};

  if (refreshed) {
    data.google_access_token = refreshed.accessToken;
    data.google_token_expiry = refreshed.expiryDate;
  }

  if (shouldUpdateLastSyncedAt) {
    data.lms_last_synced_at = new Date();
  }

  if (Object.keys(data).length === 0) {
    return null;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: { lms_last_synced_at: true },
  });

  return updated.lms_last_synced_at;
}

export async function syncUserAssignments(
  userId: string,
  options: SyncUserAssignmentsOptions = {},
): Promise<UserAssignmentSyncResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      moodle_enabled: true,
      moodle_calendar_url: true,
      google_classroom_enabled: true,
      google_access_token: true,
      google_refresh_token: true,
      google_token_expiry: true,
      lms_last_synced_at: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const { config, enabledProviders } = buildConfigFromUser(user);
  await removeDisabledProviderEvents(user.id, enabledProviders);

  if (enabledProviders.length === 0) {
    return {
      assignments: [],
      results: [],
      fromCache: true,
      successfulSources: 0,
      failedSources: 0,
      lastSyncedAt: user.lms_last_synced_at,
      nextRefreshAt: computeNextRefreshAt(user.lms_last_synced_at),
    };
  }

  const forceRefresh = options.forceRefresh === true;
  const readFromCacheOnly = options.readFromCacheOnly === true;

  if (readFromCacheOnly && !forceRefresh) {
    const assignments = await loadCachedAssignments(user.id, enabledProviders);
    const results = buildCachedResults(assignments, enabledProviders);

    return {
      assignments,
      results,
      fromCache: true,
      successfulSources: results.length,
      failedSources: 0,
      lastSyncedAt: user.lms_last_synced_at,
      nextRefreshAt: computeNextRefreshAt(user.lms_last_synced_at),
    };
  }

  if (!forceRefresh && !shouldRefresh(user.lms_last_synced_at)) {
    const assignments = await loadCachedAssignments(user.id, enabledProviders);
    const results = buildCachedResults(assignments, enabledProviders);

    return {
      assignments,
      results,
      fromCache: true,
      successfulSources: results.length,
      failedSources: 0,
      lastSyncedAt: user.lms_last_synced_at,
      nextRefreshAt: computeNextRefreshAt(user.lms_last_synced_at),
    };
  }

  const fetched = await fetchAssignmentsFromMultipleSources(config, user.id);
  const hasSuccess = fetched.successfulSources > 0;

  if (hasSuccess) {
    await persistAssignmentsFromResults(user.id, fetched.results);
  }

  const updatedLastSyncedAt = await updateUserSyncMetadata(
    user.id,
    fetched.results,
    hasSuccess,
  );
  const lastSyncedAt = updatedLastSyncedAt || user.lms_last_synced_at;

  const assignments = await loadCachedAssignments(user.id, enabledProviders);

  if (!hasSuccess && assignments.length === 0) {
    const firstError = fetched.results.find((r) => r.error)?.error;
    if (firstError) {
      throw firstError;
    }
  }

  return {
    assignments,
    results: fetched.results,
    fromCache: !hasSuccess,
    successfulSources: fetched.successfulSources,
    failedSources: fetched.failedSources,
    lastSyncedAt,
    nextRefreshAt: computeNextRefreshAt(lastSyncedAt),
  };
}
