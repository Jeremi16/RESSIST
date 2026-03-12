# Google Classroom Integration - Implementation Summary

## Overview

The assignment reminder system has been successfully upgraded to support **both Moodle and Google Classroom** as assignment sources. This document summarizes the changes made.

## Changes Made

### 1. Database Schema (Prisma)

Updated `prisma/schema.prisma` with new fields:

```prisma
model User {
  // ... existing fields ...
  
  // LMS Configuration
  lms_type             LMSType   @default(moodle)  // "moodle" | "google_classroom"
  moodle_calendar_url  String?   // Now nullable, for Moodle users
  
  // Google Classroom OAuth tokens
  google_access_token  String?   // OAuth access token
  google_refresh_token String?   // OAuth refresh token
  google_token_expiry  DateTime? // Token expiration
  
  // ... other fields ...
}

model Event {
  // ... existing fields ...
  source  String  @default("moodle")  // Track assignment source
}
```

**Migration Applied**: Database schema synchronized with `npx prisma db push`

### 2. LMS Abstraction Layer (`lib/lms/`)

Created a modular LMS integration architecture:

| File | Purpose |
|------|---------|
| `types.ts` | Core types, interfaces, and error classes |
| `moodleService.ts` | Moodle ICS parsing implementation |
| `googleClassroomService.ts` | Google Classroom API integration |
| `lmsFactory.ts` | Factory pattern for service selection |
| `index.ts` | Module exports |

**Key Features:**
- Unified `LMSAssignment` format across all providers
- Consistent `LMSService` interface
- Proper error handling with custom error classes
- Token refresh support for Google OAuth

### 3. Google Classroom Service

**API Flow:**
1. Fetch user's courses via `classroom.courses.list()`
2. For each course, fetch coursework via `classroom.courses.courseWork.list()`
3. Extract title, course name, and due date/time
4. Convert to unified `LMSAssignment` format
5. Sort by deadline

**OAuth Scopes Required:**
- `https://www.googleapis.com/auth/classroom.courses.readonly`
- `https://www.googleapis.com/auth/classroom.coursework.me.readonly`

### 4. API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/google` | GET | Initiates Google OAuth flow |
| `/api/auth/google/callback` | GET | Handles OAuth callback, stores tokens |
| `/api/user/google/disconnect` | POST | Disconnects Google, revokes tokens |
| `/api/user` | GET/PUT | Updated to support LMS fields |
| `/api/test-calendar` | GET/POST | Updated to support both LMS types |

### 5. Scheduler Updates

Modified `lib/scheduler.ts` to:
- Support both Moodle and Google Classroom users
- Handle token refresh for Google Classroom
- Route to appropriate service based on `lms_type`
- Proper error handling for auth failures

### 6. UI Components

**New Component: `components/dashboard/LMSConfig.tsx`**
- LMS provider selection (radio buttons)
- Moodle configuration (URL input)
- Google Classroom connection (OAuth button)
- Connection status display
- Disconnect functionality

**Updated: `app/dashboard/page.tsx`**
- New "Sumber Tugas" tab replacing old "Moodle" tab
- Support for LMS switching
- Updated status indicators

## Configuration

### Environment Variables

Add to `.env`:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID="your-google-oauth-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"
```

### Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select a project
3. Enable **Google Classroom API**
4. Create **OAuth 2.0 Client ID** credentials
5. Add authorized redirect URI: `{YOUR_APP_URL}/api/auth/google/callback`
6. Copy Client ID and Secret to `.env`

## User Flow

### For Moodle Users (Existing)
1. Select "Moodle" as source
2. Enter Moodle calendar URL
3. Test and save

### For Google Classroom Users (New)
1. Select "Google Classroom" as source
2. Click "Hubungkan Google Classroom"
3. Authorize on Google's consent screen
4. System automatically fetches assignments

### Switching Between LMS
- User can switch anytime via dashboard
- Switching to Google requires OAuth connection first
- Switching to Moodle requires calendar URL

## Error Handling

| Error Type | Cause | Handling |
|------------|-------|----------|
| `LMSAuthError` | Expired/revoked Google token | Prompt reconnection |
| `LMSConnectionError` | Network issues | Retry with backoff |
| `LMSConfigError` | Invalid configuration | User notification |

## Testing

### Test Moodle Calendar
```bash
curl -X POST http://localhost:3000/api/test-calendar \
  -H "Content-Type: application/json" \
  -d '{"lms_type":"moodle","moodle_calendar_url":"your-url"}'
```

### Test Google Classroom
1. Login to dashboard
2. Connect Google Classroom
3. Go to dashboard overview
4. Verify assignments appear

## Security Considerations

1. **Token Storage**: Google tokens encrypted at rest in PostgreSQL
2. **Token Refresh**: Automatic refresh handled by service
3. **Revocation**: Tokens revoked on disconnect
4. **Session State**: OAuth state parameter prevents CSRF
5. **Scope Limitation**: Only read-only scopes requested

## Next Steps

1. **Update Environment Variables**: Add Google OAuth credentials to production
2. **Test OAuth Flow**: Verify complete OAuth flow in production
3. **Monitor Token Refresh**: Ensure automatic refresh works
4. **Documentation**: Update user-facing documentation
5. **Analytics**: Track LMS provider usage

## Troubleshooting

### Google OAuth Issues
- **Redirect URI mismatch**: Ensure exact match in Google Console
- **Invalid scope**: Verify Google Classroom API is enabled
- **Consent screen not configured**: Complete OAuth consent screen setup

### Database Issues
- **Missing columns**: Run `npx prisma db push`
- **Enum errors**: Ensure `LMSType` enum is in schema

### TypeScript Issues
- **Module errors**: Run `npx prisma generate`
- **Type errors**: Check all imports use correct paths

## Migration Guide for Existing Users

Existing Moodle users are **not affected**:
- `lms_type` defaults to `moodle`
- Existing `moodle_calendar_url` preserved
- No action required

To switch to Google Classroom:
1. Go to Dashboard → Sumber Tugas
2. Select "Google Classroom"
3. Connect account
4. Save configuration

---

**Implementation Complete** ✅
