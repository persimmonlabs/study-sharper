'use client'

import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface Profile {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  theme?: string | null
}

type AuthContextValue = {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  signOut: () => Promise<void>
  profile: Profile | null
  profileLoading: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  
  // Prevent concurrent operations
  const initializingRef = useRef(false)
  const mountedRef = useRef(true)

  const loadProfile = useCallback(async (targetUser: User | null) => {
    if (!mountedRef.current) return
    
    if (!targetUser) {
      setProfile(null)
      setProfileLoading(false)
      return
    }

    setProfileLoading(true)

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, avatar_url')
        .eq('id', targetUser.id)
        .maybeSingle()

      if (!mountedRef.current) return

      if (error) {
        console.warn('Error loading profile:', error.message)
      }

      // Always set profile, even if database query failed
      const profileData = data || {
        id: targetUser.id,
        email: targetUser.email ?? null,
        first_name: targetUser.user_metadata?.first_name ?? null,
        last_name: targetUser.user_metadata?.last_name ?? null,
        avatar_url: null,
      }

      setProfile(profileData)
    } catch (err) {
      if (!mountedRef.current) return
      
      console.error('Error loading profile:', err)
      // Set fallback profile even on error
      setProfile({
        id: targetUser.id,
        email: targetUser.email ?? null,
        first_name: targetUser.user_metadata?.first_name ?? null,
        last_name: targetUser.user_metadata?.last_name ?? null,
        avatar_url: null,
      })
    } finally {
      if (mountedRef.current) {
        setProfileLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    const initialize = async () => {
      if (initializingRef.current || !mountedRef.current) {
        return
      }
      
      initializingRef.current = true
      setLoading(true)
      
      try {
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mountedRef.current) return
        
        console.log('[AuthProvider] Initial session check:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id,
          error: error?.message
        })
        
        if (error) {
          console.error('[AuthProvider] Initial session error:', error)
          setError('Unable to load authentication state')
        } else {
          setSession(session)
          setUser(session?.user ?? null)
          await loadProfile(session?.user ?? null)
          setError(null)
          
          console.log('[AuthProvider] Initial state set:', {
            hasUser: !!(session?.user),
            userId: session?.user?.id
          })
        }
      } catch (err) {
        if (!mountedRef.current) return
        
        console.error('[AuthProvider] Initialization error:', err)
        setError('Unable to initialize authentication')
        setSession(null)
        setUser(null)
        setProfile(null)
      } finally {
        if (mountedRef.current) {
          setLoading(false)
          console.log('[AuthProvider] Initial loading complete')
        }
        initializingRef.current = false
      }
    }

    initialize()

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return
      
      console.log('[AuthProvider] Auth state changed:', {
        event,
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id
      })
      
      // Update state immediately
      setSession(session)
      setUser(session?.user ?? null)
      setError(null)
      
      console.log('[AuthProvider] User state updated:', {
        hasUser: !!(session?.user),
        userId: session?.user?.id
      })
      
      // Load profile for new/changed users
      await loadProfile(session?.user ?? null)
      
      // CRITICAL FIX: Set loading to false after auth state change
      if (mountedRef.current) {
        setLoading(false)
        console.log('[AuthProvider] Auth loading set to false after state change')
      }
    })

    return () => {
      console.log('[AuthProvider] Cleanup - unmounting')
      mountedRef.current = false
      subscription.unsubscribe()
      initializingRef.current = false
    }
  }, [loadProfile])

  const refresh = useCallback(async () => {
    if (!mountedRef.current || initializingRef.current) return
    
    setLoading(true)
    console.log('[AuthProvider] Manual refresh triggered')
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (!mountedRef.current) return
      
      console.log('[AuthProvider] Manual refresh session check:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
        error: error?.message
      })
      
      if (error) {
        console.error('[AuthProvider] Refresh error:', error)
        setError('Unable to refresh authentication state')
      } else {
        setSession(session)
        setUser(session?.user ?? null)
        await loadProfile(session?.user ?? null)
        setError(null)
        
        console.log('[AuthProvider] Manual refresh complete, user set:', {
          hasUser: !!(session?.user),
          userId: session?.user?.id
        })
      }
    } catch (err) {
      if (!mountedRef.current) return
      
      console.error('[AuthProvider] Refresh error:', err)
      setError('Unable to refresh authentication state')
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [loadProfile])

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
      // State will be updated by onAuthStateChange listener
    } catch (err) {
      console.error('[AuthProvider] Sign out error:', err)
      // Force state reset even if signOut fails
      if (mountedRef.current) {
        setSession(null)
        setUser(null)
        setProfile(null)
        setError(null)
      }
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    await loadProfile(user)
  }, [loadProfile, user])

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      error,
      refresh,
      signOut,
      profile,
      profileLoading,
      refreshProfile,
    }),
    [user, session, loading, error, refresh, signOut, profile, profileLoading, refreshProfile]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
