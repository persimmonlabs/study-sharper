'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'

const DEFAULT_AVATAR = '👤'

export function HeaderNav() {
  const { user, loading, profile, profileLoading } = useAuth()
  const pathname = usePathname()
  const avatar = profile?.avatar_url ?? DEFAULT_AVATAR
  const displayAvatar = loading || profileLoading ? '⏳' : avatar || DEFAULT_AVATAR
  
  // Debug logging
  console.log('[HeaderNav] Auth state:', { 
    hasUser: !!user,
    userId: user?.id,
    loading, 
    hasProfile: !!profile, 
    profileLoading,
    pathname 
  })

  const getLinkClassName = (href: string) => {
    const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
    return `transition-colors ${
      isActive
        ? 'text-primary-600 dark:text-primary-400 font-semibold'
        : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
    }`
  }

  return (
    <nav className="flex items-center space-x-8">
      <Link href="/dashboard" className={getLinkClassName('/dashboard')}>
        Dashboard
      </Link>
      <Link href="/files" className={getLinkClassName('/files')}>
        Files
      </Link>
      <Link href="/calendar" className={getLinkClassName('/calendar')}>
        Calendar
      </Link>
      <Link href="/study" className={getLinkClassName('/study')}>
        Study
      </Link>
      <Link href="/social" className={getLinkClassName('/social')}>
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
