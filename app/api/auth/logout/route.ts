/**
 * Logout Route
 * 
 * Clears the user session and redirects to login page.
 * 
 * GET /api/auth/logout - Logs out user and redirects
 * POST /api/auth/logout - Logs out user (API call)
 */

import { NextResponse } from 'next/server'
import { clearSession } from '@/lib/session'

export async function GET() {
  await clearSession()
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return NextResponse.redirect(`${baseUrl}/login`)
}

export async function POST() {
  await clearSession()
  
  return NextResponse.json({ 
    success: true, 
    message: 'Logged out successfully' 
  })
}
