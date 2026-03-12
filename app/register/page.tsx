import { redirect } from 'next/navigation'

/**
 * Register Page - Redirected to Login
 * 
 * Registration is now handled through Google OAuth only.
 * All @iter.ac.id users can automatically register by logging in.
 */
export default function RegisterPage() {
  redirect('/login')
}
