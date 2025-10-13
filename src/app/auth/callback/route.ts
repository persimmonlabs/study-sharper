'use server'

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('redirect_to') ?? requestUrl.searchParams.get('next') ?? '/dashboard'
  
  console.log('[AUTH CALLBACK] Processing authentication callback')
  console.log('[AUTH CALLBACK] Request URL:', requestUrl.toString())
  console.log('[AUTH CALLBACK] Code present:', !!code)
  console.log('[AUTH CALLBACK] Next destination:', next)

  // If no code, redirect to login with error
  if (!code) {
    console.error('[AUTH CALLBACK] No verification code provided')
    const loginUrl = new URL('/auth/login', requestUrl.origin)
    loginUrl.searchParams.set('error', 'missing_verification_code')
    return NextResponse.redirect(loginUrl)
  }

  const supabase = createRouteHandlerClient<Database>({ cookies })

  // Exchange code for session
  const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

  if (sessionError) {
    console.error('[AUTH CALLBACK] Session exchange failed:', sessionError.message)
    const loginUrl = new URL('/auth/login', requestUrl.origin)
    loginUrl.searchParams.set('error', 'session_exchange_failed')
    return NextResponse.redirect(loginUrl)
  }

  console.log('[AUTH CALLBACK] Session created successfully for user:', sessionData.user?.id)

  // Ensure profile exists for the user
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (user?.id) {
      console.log('[AUTH CALLBACK] Checking profile for user:', user.id)
      
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

      if (profileCheckError) {
        console.error('[AUTH CALLBACK] Error checking profile:', profileCheckError.message)
      }

      if (!existingProfile) {
        console.log('[AUTH CALLBACK] Creating new profile for user')
        
        // Extract name from Google metadata
        const fullName = user.user_metadata?.full_name || ''
        const nameParts = fullName.split(' ')
        const firstName = user.user_metadata?.first_name || nameParts[0] || null
        const lastName = user.user_metadata?.last_name || nameParts.slice(1).join(' ') || null
        
        const { error: insertError } = await supabase.from('profiles').insert({
          id: user.id,
          email: user.email ?? '',
          first_name: firstName,
          last_name: lastName,
          avatar_url: user.user_metadata?.avatar_url || null,
        })

        if (insertError) {
          console.error('[AUTH CALLBACK] Error creating profile:', insertError.message)
        } else {
          console.log('[AUTH CALLBACK] Profile created successfully')
        }
      } else {
        console.log('[AUTH CALLBACK] Profile already exists')
      }
    }
  } catch (profileError) {
    console.error('[AUTH CALLBACK] Unexpected error ensuring profile exists:', profileError)
  }

  // Construct final redirect URL
  const redirectUrl = new URL(next, requestUrl.origin)
  console.log('[AUTH CALLBACK] Redirecting to:', redirectUrl.toString())
  
  return NextResponse.redirect(redirectUrl)
}
