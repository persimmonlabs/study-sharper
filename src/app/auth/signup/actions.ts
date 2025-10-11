'use server'

import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/supabase'

type CreateProfileInput = {
  id: string
  email: string
  first_name: string
  last_name: string
}

export async function createProfile({ id, email, first_name, last_name }: CreateProfileInput) {
  if (!id || !email) {
    throw new Error('Invalid profile payload')
  }

  const normalizedInput = {
    id,
    email,
    first_name: first_name || null,
    last_name: last_name || null,
  }

  const supabase = createServerActionClient<Database>({ cookies })

  await supabase.from('profiles').upsert({
    ...normalizedInput,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })
}
