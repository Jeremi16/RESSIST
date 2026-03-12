/**
 * Unified LMS Assignment type
 * All LMS services must return assignments in this format
 */
export interface LMSAssignment {
  /** Assignment title */
  title: string
  /** Course name */
  course: string
  /** Assignment deadline */
  deadline: Date
  /** Unique identifier from the LMS (optional) */
  externalId?: string
  /** Assignment description (optional) */
  description?: string
  /** Link to the assignment (optional) */
  link?: string
}

/**
 * User data required for LMS integration
 */
export interface LMSUserCredentials {
  /** User ID */
  userId: string
  /** Moodle calendar URL (for Moodle users) */
  moodleCalendarUrl?: string | null
  /** Google access token (for Google Classroom users) */
  googleAccessToken?: string | null
  /** Google refresh token (for Google Classroom users) */
  googleRefreshToken?: string | null
  /** Google token expiry date */
  googleTokenExpiry?: Date | null
}

/**
 * LMS Service interface
 * All LMS integrations must implement this interface
 */
export interface LMSService {
  /**
   * Fetch assignments from the LMS
   * @param credentials User credentials for the LMS
   * @returns Array of assignments in unified format
   */
  fetchAssignments(credentials: LMSUserCredentials): Promise<LMSAssignment[]>

  /**
   * Validate the user's credentials/configuration
   * @param credentials User credentials to validate
   * @returns True if valid, false otherwise
   */
  validateCredentials(credentials: LMSUserCredentials): Promise<boolean>

  /**
   * Get the LMS provider name
   */
  readonly provider: string
}

/**
 * Error types for LMS operations
 */
export class LMSError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly code: string,
    public readonly retryable: boolean = false
  ) {
    super(message)
    this.name = 'LMSError'
  }
}

/**
 * Error for expired/invalid credentials
 */
export class LMSAuthError extends LMSError {
  constructor(provider: string, message: string = 'Authentication failed') {
    super(message, provider, 'AUTH_ERROR', false)
    this.name = 'LMSAuthError'
  }
}

/**
 * Error for network/connection issues
 */
export class LMSConnectionError extends LMSError {
  constructor(provider: string, message: string = 'Connection failed') {
    super(message, provider, 'CONNECTION_ERROR', true)
    this.name = 'LMSConnectionError'
  }
}

/**
 * Error for invalid configuration
 */
export class LMSConfigError extends LMSError {
  constructor(provider: string, message: string = 'Invalid configuration') {
    super(message, provider, 'CONFIG_ERROR', false)
    this.name = 'LMSConfigError'
  }
}
