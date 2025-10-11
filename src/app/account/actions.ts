'use server'

import { cookies } from 'next/headers'
import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase'

const DEFAULT_AVATAR = '👤'

type UpdateAvatarInput = {
  userId: string
  avatar: string
}

type UpdateAvatarResult = {
  avatar: string
}

export async function updateAvatarAction({ userId, avatar }: UpdateAvatarInput): Promise<UpdateAvatarResult> {
  if (!userId || !avatar) {
    throw new Error('Invalid avatar update payload')
  }

  const timestamp = new Date().toISOString()
  const supabase = createServerActionClient<Database>({ cookies })

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    throw authError
  }

  if (!user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email: user.email ?? '',
        first_name: user.user_metadata?.first_name ?? null,
        last_name: user.user_metadata?.last_name ?? null,
        avatar_url: avatar,
        updated_at: timestamp,
      },
      { onConflict: 'id' }
    )
    .select('avatar_url')
    .maybeSingle()

  if (error) {
    throw error
  }

  return { avatar: data?.avatar_url ?? DEFAULT_AVATAR }
}
