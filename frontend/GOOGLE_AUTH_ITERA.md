# Google OAuth Login - ITERA Only

Sistem autentikasi telah diubah untuk menggunakan **Google OAuth sebagai metode login utama**, dengan batasan domain email **`@iter.ac.id` saja**.

## Perubahan Utama

### 1. Database Schema

**Tabel `users` yang baru:**
```prisma
model User {
  id              String  @id @default(cuid())
  email           String  @unique
  google_id       String? @unique  // Google sub/ID
  name            String?
  avatar_url      String?
  email_verified  Boolean @default(false)
  
  // LMS Configuration (Moodle & Google Classroom)
  moodle_enabled              Boolean @default(false)
  moodle_calendar_url         String?
  google_classroom_enabled    Boolean @default(false)
  google_access_token         String?
  google_refresh_token        String?
  google_token_expiry         DateTime?
  
  // Settings
  reminder_hours      String @default("[24]")
  morning_briefing    Boolean @default(false)
  muted_courses       String @default("[]")
  
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt
}
```

**Field yang dihapus:**
- ❌ `external_auth_id` (dari nodryx auth)
- ❌ `password` (tidak perlu lagi, pakai Google)

### 2. Auth Flow

```
User akses /login
      ↓
Klik "Lanjutkan dengan Google"
      ↓
Redirect ke Google OAuth
      ↓
User login dengan Google
      ↓
Google redirect ke /api/auth/google/callback
      ↓
Validasi email domain (harus @iter.ac.id)
      ↓
Cek/Create user di database
      ↓
Create session (JWT cookie)
      ↓
Redirect ke /dashboard
```

### 3. Domain Restriction

**Hanya email dengan domain berikut yang diizinkan:**
- `@student.itera.ac.id` (Mahasiswa ITERA)

**Contoh email yang diizinkan:**
- `john.doe@student.itera.ac.id` ✅
- `alice@student.itera.ac.id` ✅
- `budi123@student.itera.ac.id` ✅

**Contoh email yang ditolak:**
- `dosen@itera.ac.id` ❌ (bukan student)
- `staff@itera.ac.id` ❌ (bukan student)
- `user@gmail.com` ❌
- `student@iter.ac.id` ❌ (salah domain)
- `anyone@yahoo.com` ❌

### 4. API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/google/login` | GET | Mulai Google OAuth flow |
| `/api/auth/google/callback` | GET | Handle callback, validasi domain, create session |
| `/api/auth/login` | GET/POST | Redirect ke Google OAuth |
| `/api/auth/logout` | GET/POST | Clear session |
| `/register` | - | Redirect ke `/login` |

### 5. Environment Variables

**Wajib ada:**
```env
# Database
DATABASE_URL="postgresql://..."

# Session
SESSION_SECRET="your-random-secret-min-32-chars"

# Google OAuth (REQUIRED untuk login)
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"
```

**Tidak lagi digunakan:**
```env
# Dihapus - tidak pakai nodryx lagi
AUTH_BASE_URL="https://auth.nodryx.com"
AUTH_API_KEY="..."
AUTH_JWT_SECRET="..."
```

## Setup Google Cloud Console

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat project baru atau pilih existing
3. Enable **Google+ API** atau **People API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure OAuth consent screen:
   - User Type: External
   - App name: Ressist
   - User support email: your-email
   - Developer contact: your-email
6. Add scopes:
   - `openid`
   - `userinfo.profile`
   - `userinfo.email`
7. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/google/callback` (dev)
   - `https://yourdomain.com/api/auth/google/callback` (prod)
8. Copy Client ID dan Client Secret ke `.env`

## User Flow

### Login
1. User akses `/login`
2. Klik tombol "Lanjutkan dengan Google"
3. Pilih akun Google di popup
4. Jika email @iter.ac.id → Login sukses
5. Jika email lain → Error: "Hanya email @iter.ac.id yang diizinkan"

### Register
- Tidak ada halaman register terpisah
- User otomatis terdaftar saat pertama kali login dengan Google
- Data yang diambil: email, name, profile picture

### Logout
- Klik logout di dashboard
- Session dihapus
- Redirect ke login page

## Error Handling

| Error | Penyebab | Solusi |
|-------|----------|--------|
| "Hanya email @iter.ac.id yang diizinkan" | Domain email salah | Gunakan akun Google ITERA |
| "Failed to get access token" | Google OAuth error | Coba lagi |
| "Invalid session state" | CSRF atau session expired | Login ulang |

## Keamanan

1. **Domain Validation**: Hardcoded check untuk `@iter.ac.id`
2. **Session**: JWT cookie + refresh token, expiry 3 hari + sliding (via `SESSION_TTL_DAYS` / `REFRESH_TOKEN_TTL_HOURS=72`)
3. **CSRF Protection**: State parameter di OAuth flow
4. **HttpOnly Cookie**: Session cookie tidak bisa diakses JS
5. **Secure**: Cookie hanya HTTPS di production

## Middleware

Middleware sekarang melakukan:
- Proteksi route yang membutuhkan auth (dashboard, etc)
- Redirect ke login jika belum auth
- Redirect ke dashboard jika sudah auth tapi akses /login

```typescript
// Protected paths (harus login)
/dashboard
/api/user
/api/test-calendar

// Public paths (bebas akses)
/
/login
/api/auth/*
```

## Perbandingan Sebelum vs Sesudah

| Fitur | Sebelum (Nodryx) | Sesudah (Google OAuth) |
|-------|------------------|------------------------|
| Metode Login | Email/Password via Nodryx | Google OAuth |
| Domain Restriction | Tidak ada | Hanya @iter.ac.id |
| Registrasi | Manual di Nodryx | Otomatis saat login |
| Session | Token Nodryx | JWT Cookie |
| Avatar | Dari Nodryx | Dari Google |

## Testing

```bash
# 1. Pastikan env sudah di-set
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# 2. Jalankan dev server
npm run dev

# 3. Buka http://localhost:3000/login

# 4. Klik "Lanjutkan dengan Google"

# 5. Login dengan akun @iter.ac.id
#    - Harusnya sukses redirect ke dashboard

# 6. Test dengan akun non-iter.ac.id
#    - Harusnya error domain tidak diizinkan
```

## Troubleshooting

### "redirect_uri_mismatch"
- Pastikan redirect URI di Google Console sama persis dengan `GOOGLE_REDIRECT_URI`
- Perhatikan http vs https, trailing slash, dll

### "Hanya email @student.itera.ac.id yang diizinkan"
- User mencoba login dengan email non-student
- Harus pakai akun Google student ITERA (nama@student.itera.ac.id)

### Session tidak tersimpan
- Cek browser cookie settings
- Cek `SESSION_SECRET` sudah di-set
- Cek tidak ada error di console server

## Migration Notes

**Untuk existing users dari sistem lama:**
- Users perlu login ulang dengan Google OAuth
- Data lama (Moodle URL, settings) tetap ada jika email sama
- Data tidak bisa dimigrate otomatis karena tidak ada password

**Recommended:**
1. Informasikan ke users tentang perubahan login
2. Users login ulang dengan Google
3. Re-configure Moodle URL dan settings

---

**Implementation Complete** ✅
