'use client'

import { createContext, useContext, ReactNode } from 'react'

// Mock user for testing
const MOCK_USER = {
  id: 'test-user-id',
  external_auth_id: 'test-external-id',
  email: 'test@example.com',
  name: 'Test User',
  avatar_url: null,
  whatsapp_number: null,
  moodle_calendar_url: null,
}

interface AuthContextType {
  session: {
    user: typeof MOCK_USER
    expires: string
  } | null
  isLoading: boolean
  signIn: () => void
  signOut: () => void
  refreshSession: () => void
}

const AuthContext = createContext<AuthContextType>({
  session: {
    user: MOCK_USER,
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  isLoading: false,
  signIn: () => {},
  signOut: () => {},
  refreshSession: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  // Auth disabled - always return mock user for testing
  const mockSession = {
    user: MOCK_USER,
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }

  return (
    <AuthContext.Provider
      value={{
        session: mockSession,
        isLoading: false,
        signIn: () => {},
        signOut: () => {},
        refreshSession: () => {},
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  return context
}
