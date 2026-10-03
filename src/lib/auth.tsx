import type { User } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { startGoogleSignIn, watchUser } from './authCore'
import { isAuthConfigured, supabase } from './supabase'

type AuthStatus = 'loading' | 'signedOut' | 'signedIn'

type AuthApi = {
  status: AuthStatus
  user: User | null
  /** Redirects to Google; throws if it cannot start. */
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthApi | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(isAuthConfigured ? 'loading' : 'signedOut')
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    if (!isAuthConfigured) return
    return watchUser(supabase, (u) => {
      setUser(u)
      setStatus(u ? 'signedIn' : 'signedOut')
    })
  }, [])

  const signInWithGoogle = useCallback(async () => {
    await startGoogleSignIn(supabase, window.location.origin)
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  const value = useMemo(() => ({ status, user, signInWithGoogle, signOut }), [status, user, signInWithGoogle, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
