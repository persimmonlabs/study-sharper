'use client'

import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

// Render marker to verify provider is mounted and running on the client
if (typeof window !== 'undefined') {
  // This will run on every import, once per page load
  // Helps confirm the new bundle is actually loaded
  // eslint-disable-next-line no-console
  console.log('[AuthProvider] Module loaded on client')
}

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
  // eslint-disable-next-line no-console
  console.log('[AuthProvider] Render start')
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
    
    console.log('[AuthProvider] loadProfile called:', { hasUser: !!targetUser, userId: targetUser?.id })
    
    if (!targetUser) {
      console.log('[AuthProvider] No user, clearing profile')
      setProfile(null)
      setProfileLoading(false)
      return
    }

    setProfileLoading(true)

    try {
      console.log('[AuthProvider] Fetching profile from database...')
      
      // Add timeout to prevent hanging
      const profilePromise = supabase
        .from('profiles')
        .select('id, email, first_name, last_name, avatar_url')
        .eq('id', targetUser.id)
        .maybeSingle()
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
      )
      
      const { data, error } = await Promise.race([profilePromise, timeoutPromise]) as any

      if (!mountedRef.current) return

      if (error) {
        console.warn('[AuthProvider] Error loading profile:', error.message)
      }

      // Always set profile, even if database query failed
      const profileData = data || {
        id: targetUser.id,
        email: targetUser.email ?? null,
        first_name: targetUser.user_metadata?.first_name ?? null,
        last_name: targetUser.user_metadata?.last_name ?? null,
        avatar_url: null,
      }

      console.log('[AuthProvider] Profile loaded:', { hasData: !!data, profileId: profileData.id })
      setProfile(profileData)
    } catch (err) {
      if (!mountedRef.current) return
      
      console.error('[AuthProvider] Error loading profile:', err)
      // Set fallback profile even on error
      const fallbackProfile = {
        id: targetUser.id,
        email: targetUser.email ?? null,
        first_name: targetUser.user_metadata?.first_name ?? null,
        last_name: targetUser.user_metadata?.last_name ?? null,
        avatar_url: null,
      }
      console.log('[AuthProvider] Using fallback profile')
      setProfile(fallbackProfile)
    } finally {
      if (mountedRef.current) {
        setProfileLoading(false)
        console.log('[AuthProvider] Profile loading complete - profileLoading set to FALSE')
      }
    }
  }, [])

  useEffect(() => {
    // In React Strict Mode (Next.js dev), effects run twice: mount -> cleanup -> mount.
    // Ensure our "mounted" flag is reset to true at the start of every effect run.
    mountedRef.current = true
    // eslint-disable-next-line no-console
    console.log('[AuthProvider] useEffect initialize registering')
    const initialize = async () => {
      if (initializingRef.current || !mountedRef.current) {
        console.log('[AuthProvider] Skipping initialize - already initializing or unmounted')
        return
      }
      
      initializingRef.current = true
      setLoading(true)
      
      try {
        // Get initial session with timeout
        console.log('[AuthProvider] Starting session check...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mountedRef.current) {
          console.log('[AuthProvider] Component unmounted during session check')
          return
        }
        
        console.log('[AuthProvider] Initial session check:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id,
          error: error?.message
        })
        
        if (error) {
          console.error('[AuthProvider] Initial session error:', error)
          setError('Unable to load authentication state')
          // Still set the states even with error
          setSession(null)
          setUser(null)
          setProfile(null)
        } else {
          setSession(session)
          setUser(session?.user ?? null)
          
          console.log('[AuthProvider] Session set, loading profile...')
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
          console.log('[AuthProvider] Initial loading complete - loading set to FALSE')
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
