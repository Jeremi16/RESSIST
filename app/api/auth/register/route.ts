import { NextResponse } from 'next/server'

/**
 * Register API Route
 * 
 * Registration is now handled through Google OAuth.
 * All @iter.ac.id users can automatically register by logging in.
 * 
 * POST /api/auth/register - Returns error with redirect
 */
export async function POST() {
  return NextResponse.json(
    { 
      error: 'Registration is now handled through Google Sign In. Please use Google OAuth to register.',
      redirect: '/login'
    },
    { status: 400 }
  )
}
