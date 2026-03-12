import { cookies } from 'next/headers'
import { prisma } from './prisma'
import jwt from 'jsonwebtoken'

// Session secret untuk JWT
const SESSION_SECRET = process.env.SESSION_SECRET || 'fallback-secret-for-development-only'

/**
 * Verify JWT token
 */
export async function verifyToken(token: string): Promise<{ userId: string; email: string } | null> {
  try {
    const payload = jwt.verify(token, SESSION_SECRET) as { userId: string; email: string }
    return payload
  } catch (error) {
    return null
  }
}

// Types untuk user
export interface AuthUser {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  whatsapp_number: string | null
  moodle_calendar_url: string | null
}

export interface AuthSession {
  user: AuthUser
  expires: string
}

/**
 * Buat session di database
 */
export async function createSession(userId: string): Promise<string> {
  const sessionToken = generateSessionToken()
  const expires = new Date()
  expires.setDate(expires.getDate() + 30) // Session berlaku 30 hari

  await prisma.session.create({
    data: {
      session_token: sessionToken,
      user_id: userId,
      expires,
    },
  })

  return sessionToken
}

/**
 * Generate random session token
 */
function generateSessionToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

/**
 * Validasi session token
 */
export async function validateSessionToken(token: string): Promise<AuthUser | null> {
  try {
    const session = await prisma.session.findUnique({
      where: { session_token: token },
      include: { user: true },
    })

    if (!session) {
      return null
    }

    // Cek apakah session sudah expired
    if (new Date() > session.expires) {
      // Hapus session yang expired
      await prisma.session.delete({
        where: { id: session.id },
      })
      return null
    }

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      avatar_url: session.user.avatar_url,
      whatsapp_number: session.user.whatsapp_number,
      moodle_calendar_url: session.user.moodle_calendar_url,
    }
  } catch (error) {
    console.error('Session validation error:', error)
    return null
  }
}

/**
 * Hapus session
 */
export async function deleteSession(token: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { session_token: token },
  })
}

/**
 * Get current session dari cookie
 */
export async function getCurrentSession(): Promise<AuthSession | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session_token')?.value

    if (!sessionToken) {
      return null
    }

    const user = await validateSessionToken(sessionToken)

    if (!user) {
      return null
    }

    // Ambil session untuk dapat expires
    const session = await prisma.session.findUnique({
      where: { session_token: sessionToken },
    })

    if (!session) {
      return null
    }

    return {
      user,
      expires: session.expires.toISOString(),
    }
  } catch (error) {
    console.error('Get current session error:', error)
    return null
  }
}
