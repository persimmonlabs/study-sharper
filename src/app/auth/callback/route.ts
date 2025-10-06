'use server'

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('redirect_to') ?? requestUrl.searchParams.get('next') ?? '/dashboard'
  const redirectUrl = new URL(next, requestUrl.origin)

  if (!code) {
    redirectUrl.searchParams.set('error', 'missing_verification_code')
    return NextResponse.redirect(redirectUrl)
  }

  const supabase = createRouteHandlerClient<Database>({ cookies })

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    redirectUrl.searchParams.set('error', 'session_exchange_failed')
    return NextResponse.redirect(redirectUrl)
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user?.id) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

      if (!existingProfile) {
        await supabase.from('profiles').insert({
          id: user.id,
          email: user.email ?? '',
          first_name: user.user_metadata?.first_name ?? null,
          last_name: user.user_metadata?.last_name ?? null,
        })
      }
    }
  } catch (profileError) {
    console.error('Error ensuring profile exists after verification', profileError)
  }

  return NextResponse.redirect(redirectUrl)
}
