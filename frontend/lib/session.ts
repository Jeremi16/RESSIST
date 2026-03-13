import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

export const SESSION_SECRET = process.env.SESSION_SECRET || 'fallback-secret-for-development-must-be-long'
export const COOKIE_NAME = 'el-learning-session'

export interface SessionPayload {
  userId: string
  email: string
}

export async function createSession(payload: SessionPayload | string) {
  // Support both object and string (userId only)
  const sessionData = typeof payload === 'string' 
    ? { userId: payload, email: '' } 
    : payload
    
  const token = jwt.sign(sessionData, SESSION_SECRET, { expiresIn: '7d' })
  
  const cookieStore = await cookies()
  cookieStore.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  })
}

export async function verifySession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (!token) {
    return null
  }

  try {
    const payload = jwt.verify(token, SESSION_SECRET) as SessionPayload
    return payload
  } catch (error) {
    return null
  }
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}
