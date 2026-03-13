// LMS Module - Unified interface for Learning Management Systems
//
// This module provides a unified interface for fetching assignments
// from different LMS providers (Moodle, Google Classroom).
//
// Usage:
//   import { fetchAssignmentsFromMultipleSources, MultiLMSConfig } from '@/lib/lms'
//
//   // Fetch from multiple sources in parallel
//   const { assignments, results } = await fetchAssignmentsFromMultipleSources(config, userId)

// Core types (interfaces and type aliases)
export type { LMSService, LMSAssignment, LMSUserCredentials } from "./types";

// Error classes
export {
  LMSError,
  LMSAuthError,
  LMSConnectionError,
  LMSConfigError,
} from "./types";

// Factory and convenience functions
export {
  lmsFactory,
  fetchAssignmentsFromLMS,
  fetchAssignmentsFromMultipleSources,
  validateLMSCredentials,
} from "./lmsFactory";

// Multi-LMS types
export type { LMSProvider, LMSFetchResult, MultiLMSConfig } from "./lmsFactory";

// Sync cache service
export { syncUserAssignments } from "./syncService";
export type { UserAssignmentSyncResult } from "./syncService";

// Individual services
export { MoodleService, moodleService } from "./moodleService";
export {
  GoogleClassroomService,
  googleClassroomService,
  GOOGLE_CLASSROOM_SCOPES,
} from "./googleClassroomService";
