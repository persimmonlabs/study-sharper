'use client'

import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'

const DEFAULT_AVATAR = '👤'

export function HeaderNav() {
  const { user, loading, profile, profileLoading } = useAuth()
  const avatar = profile?.avatar_url ?? DEFAULT_AVATAR
  const displayAvatar = loading || profileLoading ? '⏳' : avatar || DEFAULT_AVATAR

  return (
    <nav className="flex items-center space-x-8">
      <Link href="/dashboard" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors">
        Dashboard
      </Link>
      <Link href="/notes" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors">
        Notes
      </Link>
      <Link href="/calendar" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors">
        Calendar
      </Link>
      <Link href="/study" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors">
        Study
      </Link>
      <Link href="/social" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors">
        Social
      </Link>
      <Link
        href={user ? '/account' : '/auth/login'}
        className="flex items-center justify-center text-2xl leading-none hover:scale-105 transition-transform"
        aria-label="Account"
      >
        {displayAvatar}
      </Link>
    </nav>
  )
}
