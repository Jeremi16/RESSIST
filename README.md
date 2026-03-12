# 📚 Assignment Reminder Bot

A fullstack web application that helps university students receive WhatsApp and Telegram reminders for their assignments. The system supports both **Moodle** (via ICS calendar) and **Google Classroom**, monitors upcoming deadlines, and sends notifications before assignments are due.

## ✨ Features

- 🔐 **External Auth (auth.nodryx.com)** - Secure login via Nodryx Auth service
- 📱 **WhatsApp Reminders** - Get notified directly on WhatsApp
- 💬 **Telegram Reminders** - Alternative notification via Telegram Bot
- 📅 **Moodle Integration** - Connect your Moodle calendar export URL
- 🎓 **Google Classroom Integration** - OAuth connection to Google Classroom
- 🔄 **Multi-LMS Support** - Switch between Moodle and Google Classroom
- ⏰ **Automatic Monitoring** - Checks for deadlines every 15 minutes
- 📊 **Dashboard** - Easy configuration and calendar preview
- 🔧 **Custom Reminder Hours** - Set multiple reminder intervals (e.g., 24h, 12h, 6h)
- 🌅 **Morning Briefing** - Daily summary of upcoming deadlines
- 🔇 **Muted Courses** - Exclude specific courses from reminders
- 🚀 **Neon Database** - Serverless PostgreSQL for reliable data storage

## 🛠️ Tech Stack

### Frontend
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion
- Custom Auth Context

### Backend
- Next.js API Routes
- Node.js

### Database
- Neon PostgreSQL (Serverless)
- Prisma ORM

### Services
- Baileys (WhatsApp Web API)
- Telegraf (Telegram Bot API)
- Google APIs (Google Classroom API)
- node-ical (ICS calendar parsing)
- axios (HTTP requests)
- node-cron (scheduler)

## 📋 Prerequisites

Before running this application, make sure you have:

- Node.js 18+ installed
- Neon PostgreSQL database (sign up at https://neon.tech)
- Account at https://auth.nodryx.com/ (or your own auth service)
- A WhatsApp account (for receiving reminders)
- Google Cloud Project (for Google Classroom integration) - optional

## 🚀 Getting Started

### 1. Clone and Install

```bash
# Install dependencies
npm install
```

### 2. Neon Database Setup

1. Sign up at [Neon](https://neon.tech)
2. Create a new project
3. Copy the connection string from Dashboard → Connection Details
4. Format: `postgresql://user:password@ep-xxx-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require`

### 3. Environment Configuration

Copy the example environment file and configure your variables:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# ==========================================
# Database Configuration (Neon PostgreSQL)
# ==========================================
DATABASE_URL="postgresql://user:password@ep-xxx-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"

# ==========================================
# External Auth Service (auth.nodryx.com)
# ==========================================
AUTH_BASE_URL="https://auth.nodryx.com"
AUTH_API_KEY="your-auth-api-key"
AUTH_JWT_SECRET="your-jwt-secret-from-nodryx"

# ==========================================
# Next.js Configuration
# ==========================================
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
SESSION_SECRET="your-random-session-secret-min-32-chars-long"

# ==========================================
# Telegram Bot Configuration
# ==========================================
TELEGRAM_BOT_TOKEN="your-telegram-bot-token"

# ==========================================
# Google OAuth Configuration (Optional)
# ==========================================
GOOGLE_CLIENT_ID="your-google-oauth-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"
```

### 4. Database Migration

```bash
# Push schema to database
npx prisma db push

# Generate Prisma Client
npx prisma generate
```

### 5. Google Cloud Setup (for Google Classroom)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Google Classroom API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure OAuth consent screen (External or Internal)
6. Add these scopes:
   - `https://www.googleapis.com/auth/classroom.courses.readonly`
   - `https://www.googleapis.com/auth/classroom.coursework.me.readonly`
7. Add authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
8. Copy Client ID and Client Secret to `.env`

### 6. Running the Application

```bash
# Development mode
npm run dev

# Or build and start production
npm run build
npm start
```

### 7. WhatsApp Setup

On first run, the application will:
1. Display a QR code in the terminal
2. Scan the QR code with your WhatsApp (Linked Devices → Link a Device)
3. Your WhatsApp is now connected and ready to receive messages

### 8. Telegram Bot Setup (Optional)

1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Create a new bot with `/newbot`
3. Copy the bot token to `TELEGRAM_BOT_TOKEN` in `.env`
4. Start a conversation with your bot
5. Use the dashboard to configure your chat ID

## 📖 Usage Guide

### For Students

1. **Sign In**: Click "Sign in with Nodryx Auth" on the homepage
   - You'll be redirected to auth.nodryx.com
   - Login with your credentials
   - Automatically redirected back to the app

2. **Choose LMS Source**: Go to Dashboard → Sumber Tugas and select:
   - **Moodle**: Enter your Moodle calendar export URL
   - **Google Classroom**: Click "Connect Google Classroom" and authorize

3. **Configure Notifications**: 
   - WhatsApp: Enter your number (with country code, e.g., 628123456789)
   - Telegram: Enter your chat ID (use `/start` with the bot first)

4. **Set Preferences**:
   - Configure reminder intervals (default: 24 hours before deadline)
   - Enable/disable morning briefing
   - Mute specific courses if needed

5. **Save**: Click "Save Configuration"

6. **Test**: Click "Test Calendar" to verify your assignments are loading

7. **Done!** You'll receive reminders based on your configured intervals

### Getting Your Moodle Calendar URL

1. Log in to your Moodle account (kuliah2.itera.ac.id)
2. Go to **Calendar** → **Export calendar**
3. Select "All events" and "Recent and next 60 days"
4. Click "Get calendar URL"
5. Copy the URL and paste it into the dashboard

### Connecting Google Classroom

1. Go to Dashboard → Sumber Tugas
2. Select "Google Classroom"
3. Click "Hubungkan Google Classroom"
4. Sign in with your Google account
5. Grant permission to view courses and coursework
6. Your assignments will be automatically synced

## 📁 Project Structure

```
.
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── auth/                 # Auth endpoints
│   │   │   ├── google/           # Google OAuth routes
│   │   │   │   └── callback/     # OAuth callback handler
│   │   │   ├── callback/         # Nodryx auth callback
│   │   │   ├── login/            # Login redirect
│   │   │   ├── logout/           # Logout
│   │   │   └── session/          # Get session
│   │   ├── test-calendar/        # Test calendar endpoint
│   │   └── user/                 # User CRUD endpoints
│   │       └── google/
│   │           └── disconnect/   # Disconnect Google
│   ├── dashboard/                # Dashboard page
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
├── components/                   # React components
│   ├── dashboard/                # Dashboard components
│   │   ├── GeneralSettings.tsx   # General settings form
│   │   ├── LMSConfig.tsx         # LMS selection & config
│   │   ├── MoodleConfig.tsx      # Moodle-specific config (legacy)
│   │   └── TelegramConfig.tsx    # Telegram configuration
│   ├── landing-page/             # Landing page sections
│   ├── ui/                       # UI components (shadcn)
│   ├── AuthProvider.tsx          # Auth context provider
│   ├── CalendarView.tsx          # Calendar visualization
│   ├── EventPreview.tsx          # Event list preview
│   ├── TelegramTest.tsx          # Telegram test button
│   └── WhatsAppTest.tsx          # WhatsApp test button
├── lib/                          # Library code
│   ├── lms/                      # LMS abstraction layer
│   │   ├── types.ts              # LMS types and interfaces
│   │   ├── moodleService.ts      # Moodle ICS integration
│   │   ├── googleClassroomService.ts  # Google Classroom API
│   │   ├── lmsFactory.ts         # Service factory
│   │   └── index.ts              # Module exports
│   ├── auth.ts                   # Auth service
│   ├── moodle.ts                 # Legacy Moodle parsing (shared utils)
│   ├── prisma.ts                 # Prisma client
│   ├── scheduler.ts              # Cron job scheduler
│   ├── session.ts                # Session management
│   ├── telegram.ts               # Telegram Bot service
│   └── whatsapp.ts               # WhatsApp Baileys service
├── prisma/
│   └── schema.prisma             # Database schema
├── middleware.ts                 # Route protection middleware
├── next.config.js                # Next.js configuration
├── tailwind.config.js            # Tailwind CSS configuration
└── README.md                     # This file
```

## 🗄️ Database Schema

### Users Table
| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| external_auth_id | String | User ID from auth.nodryx.com |
| email | String | User email (unique) |
| name | String | User display name |
| avatar_url | String | Profile picture URL |
| whatsapp_number | String | WhatsApp number for reminders |
| whatsapp_enabled | Boolean | Enable WhatsApp notifications |
| telegram_chat_id | String | Telegram chat ID |
| telegram_enabled | Boolean | Enable Telegram notifications |
| lms_type | Enum | "moodle" or "google_classroom" |
| moodle_calendar_url | String | Moodle ICS export URL |
| google_access_token | String | Google OAuth access token |
| google_refresh_token | String | Google OAuth refresh token |
| google_token_expiry | DateTime | Google token expiration |
| reminder_hours | String | JSON array of reminder hours |
| morning_briefing | Boolean | Enable daily morning summary |
| muted_courses | String | JSON array of muted course names |
| created_at | DateTime | Account creation timestamp |
| updated_at | DateTime | Last update timestamp |

### Events Table
| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| user_id | String | Foreign key to users |
| title | String | Assignment/event title |
| course | String | Course name |
| deadline | DateTime | Assignment due date |
| source | String | "moodle" or "google_classroom" |
| reminder_24h_sent | Boolean | Whether 24h reminder was sent |
| reminders_sent | String | JSON array of sent reminder hours |
| created_at | DateTime | Event creation timestamp |
| updated_at | DateTime | Last update timestamp |

### Sessions Table
| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| session_token | String | Session identifier |
| user_id | String | Foreign key to users |
| expires | DateTime | Session expiration |

## 🔧 API Endpoints

### Auth Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/auth/login | GET | Redirect to auth.nodryx.com login |
| /api/auth/callback | GET | Handle auth callback from nodryx |
| /api/auth/logout | POST | Logout user |
| /api/auth/google | GET | Initiate Google OAuth flow |
| /api/auth/google/callback | GET | Handle Google OAuth callback |

### User Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/user | GET | Get current user data |
| /api/user | PUT | Update user configuration |
| /api/user/google/disconnect | POST | Disconnect Google Classroom |

### Calendar Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/test-calendar | GET | Test saved calendar configuration |
| /api/test-calendar | POST | Test provided calendar configuration |

## 🔐 Auth Flow

### Nodryx Auth Flow
1. User clicks "Sign in with Nodryx Auth"
2. App redirects to `/api/auth/login`
3. Backend redirects to `https://auth.nodryx.com/login?callback=<callback_url>`
4. User logs in at auth.nodryx.com
5. Auth service redirects to `/api/auth/callback?token=<jwt_token>`
6. Backend verifies token and creates session
7. User redirected to dashboard

### Google OAuth Flow
1. User selects "Google Classroom" and clicks "Connect"
2. App redirects to `/api/auth/google`
3. Backend generates OAuth URL with required scopes
4. User authorizes at Google's consent screen
5. Google redirects to `/api/auth/google/callback?code=xxx`
6. Backend exchanges code for access/refresh tokens
7. Tokens stored in database
8. User redirected to dashboard with success message

## 🧪 Testing

### Test Calendar Connection
```bash
# Test Moodle
curl -X POST http://localhost:3000/api/test-calendar \
  -H "Content-Type: application/json" \
  -d '{"lms_type":"moodle","moodle_calendar_url":"your-url"}'

# Test Google Classroom (requires session cookie)
curl -X POST http://localhost:3000/api/test-calendar \
  -H "Content-Type: application/json" \
  -d '{"lms_type":"google_classroom"}'
```

### Test WhatsApp
Visit `/api/test-whatsapp` or use the test button in dashboard.

### Test Telegram
Visit `/api/test-telegram` or use the test button in dashboard.

## 🐛 Troubleshooting

### WhatsApp Not Connecting
- Make sure you scan the QR code quickly (it expires)
- Check that your phone has internet connection
- Try deleting the `whatsapp-auth` folder and restart

### Google Classroom Connection Issues
- Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are correct
- Ensure Google Classroom API is enabled in Google Cloud Console
- Check that redirect URI matches exactly (including protocol)
- Try revoking access at https://myaccount.google.com/permissions and reconnect

### Calendar Not Loading
- **Moodle**: Verify your Moodle URL is correct and accessible
- **Google**: Check that access token hasn't expired
- Ensure the calendar has upcoming events
- Check server logs for specific error messages

### Database Connection Issues (Neon)
- Verify your DATABASE_URL is correct
- Make sure to include `?sslmode=require` at the end
- Check if your Neon project is active

### Auth Issues
- Verify AUTH_BASE_URL points to correct auth service
- Check AUTH_API_KEY and AUTH_JWT_SECRET are set correctly
- Ensure callback URLs are registered in auth service

### Reminders Not Sending
- Verify WhatsApp/Telegram is connected (check logs)
- Make sure user has messaging service configured
- Check that events are within configured reminder hours
- Verify scheduler is running (check console output)

## 📝 Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | Yes | Neon PostgreSQL connection string |
| AUTH_BASE_URL | Yes | Base URL for auth.nodryx.com |
| AUTH_API_KEY | No | API key for auth service |
| AUTH_JWT_SECRET | Yes | Secret to verify JWT tokens |
| NEXT_PUBLIC_APP_URL | Yes | Public URL of your app |
| SESSION_SECRET | Yes | Secret for session encryption |
| TELEGRAM_BOT_TOKEN | No | Telegram Bot API token |
| GOOGLE_CLIENT_ID | No | Google OAuth Client ID |
| GOOGLE_CLIENT_SECRET | No | Google OAuth Client Secret |
| GOOGLE_REDIRECT_URI | No | Google OAuth callback URL |

## 🤝 Contributing

This project is open for contributions. Ideas for improvements:
- Support for additional LMS platforms (Canvas, Blackboard)
- Email notifications
- Push notifications (PWA)
- Mobile app
- Admin dashboard with analytics
- Bulk user management

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🙏 Acknowledgments

- [auth.nodryx.com](https://auth.nodryx.com) - External authentication service
- [Neon](https://neon.tech) - Serverless PostgreSQL
- [Baileys](https://github.com/WhiskeySockets/Baileys) - WhatsApp Web API
- [Telegraf](https://telegraf.js.org/) - Telegram Bot Framework
- [Google APIs](https://github.com/googleapis/google-api-nodejs-client) - Google API Client
- [Prisma](https://www.prisma.io/) - Database ORM
- [node-ical](https://github.com/jens-maus/node-ical) - ICS parser
