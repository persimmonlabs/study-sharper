'use client'

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
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

  const loadProfile = useCallback(async (targetUser: User | null) => {
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

      if (error) {
        throw error
      }

      if (data) {
        setProfile(data)
      } else {
        setProfile({
          id: targetUser.id,
          email: targetUser.email ?? null,
          first_name: targetUser.user_metadata?.first_name ?? null,
          last_name: targetUser.user_metadata?.last_name ?? null,
          avatar_url: null,
        })
      }
    } catch (err) {
      console.error('Error loading profile', err)
      setProfile({
        id: targetUser.id,
        email: targetUser.email ?? null,
        first_name: targetUser.user_metadata?.first_name ?? null,
        last_name: targetUser.user_metadata?.last_name ?? null,
        avatar_url: null,
      })
    } finally {
      setProfileLoading(false)
    }
  }, [])

  useEffect(() => {
    const initialize = async () => {
      setLoading(true)
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          throw error
        }

        setSession(session)
        setUser(session?.user ?? null)
        await loadProfile(session?.user ?? null)
        setError(null)
      } catch (err) {
        console.error('Error loading auth session', err)
        setError('Unable to load authentication state')
        setSession(null)
        setUser(null)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }

    initialize()

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      await loadProfile(session?.user ?? null)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [loadProfile])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error) {
        throw error
      }

      setSession(session)
      setUser(session?.user ?? null)
      await loadProfile(session?.user ?? null)
      setError(null)
    } catch (err) {
      console.error('Error refreshing auth session', err)
      setError('Unable to refresh authentication state')
    } finally {
      setLoading(false)
    }
  }, [loadProfile])

  const signOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setProfile(null)
  }

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
    [user, session, loading, error, refresh, profile, profileLoading, refreshProfile]
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
