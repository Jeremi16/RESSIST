import { NextResponse } from 'next/server'

/**
 * Login API Route
 * 
 * Redirects to Google OAuth login.
 * All authentication is now handled through Google OAuth.
 * 
 * GET /api/auth/login - Redirects to Google OAuth
 */
export async function GET() {
  return NextResponse.redirect('/api/auth/google/login')
}

/**
 * POST /api/auth/login
 * 
 * Returns error since email/password login is no longer supported.
 * Users must use Google OAuth instead.
 */
export async function POST() {
  return NextResponse.json(
    { 
      error: 'Email/password login is no longer supported. Please use Google Sign In.',
      redirect: '/api/auth/google/login'
    },
    { status: 400 }
  )
}
