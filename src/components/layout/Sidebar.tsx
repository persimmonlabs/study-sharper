'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { useEffect, useState } from 'react'

const DEFAULT_AVATAR = '👤'

interface NavItem {
  href: string
  icon: string
  label: string
  badge?: number
}

export function Sidebar() {
  const { user, profile, loading, profileLoading } = useAuth()
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(true)
  
  const avatar = profile?.avatar_url ?? DEFAULT_AVATAR
  const displayAvatar = loading || profileLoading ? '⏳' : avatar || DEFAULT_AVATAR
  const firstName = profile?.first_name || 'User'

  useEffect(() => {
    if (!isCollapsed) {
      setIsCollapsed(true)
    }
  }, [pathname, isCollapsed])

  // Navigation items
  const navItems: NavItem[] = [
    { href: '/dashboard', icon: '', label: 'Dashboard' },
    { href: '/notes', icon: '', label: 'Notes' },
    { href: '/study', icon: '', label: 'Study' },
    { href: '/calendar', icon: '', label: 'Calendar' },
    { href: '/social', icon: '', label: 'Social' },
  ]

  const getLinkClassName = (href: string) => {
    const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
    return `flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
      isActive
        ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-200 font-semibold shadow-sm'
        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary-600 dark:hover:text-primary-300'
    }`
  }

  // Don't show sidebar on auth pages or homepage
  if (pathname.startsWith('/auth') || pathname === '/') {
    return null
  }

  // When collapsed, use absolute positioning and overlay, when expanded, use normal flow
  if (isCollapsed) {
    return (
      <aside
        className="fixed left-0 top-0 h-screen w-14 bg-transparent flex flex-col transition-all duration-300 z-50"
      >
        {/* Logo & Collapse Button - Height matches TopBar */}
        <div className="flex items-center h-16 px-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors flex flex-col items-center justify-center gap-1"
            aria-label="Expand sidebar"
          >
            <span className="w-5 h-0.5 bg-current transition-all"></span>
            <span className="w-5 h-0.5 bg-current transition-all"></span>
            <span className="w-5 h-0.5 bg-current transition-all"></span>
          </button>
        </div>
        {/* Horizontal line separator */}
        <div className="border-b border-gray-200 dark:border-gray-800"></div>

        {/* Navigation Links */}
        {!isCollapsed && (
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={getLinkClassName(item.href)}
              >
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        )}

        {/* Bottom Section - User Info & Settings */}
        {!isCollapsed && (
          <div className="border-t border-gray-200/50 dark:border-gray-800/50 p-3 space-y-3">
            {/* User Info & Settings Combined */}
            {user && (
              <Link
                href="/account"
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                  pathname === '/account'
                    ? 'bg-primary-100 dark:bg-primary-900/30 border border-primary-300 dark:border-primary-700'
                    : 'bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-950/50 dark:to-secondary-950/50 border border-primary-200 dark:border-primary-800 hover:border-primary-300 dark:hover:border-primary-700'
                }`}
              >
                <div className="flex items-center justify-center text-2xl">
                  {displayAvatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 truncate">
                    {firstName}
                  </p>
                  <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-300">
                    <span>Lv. 1</span>
                    <span>•</span>
                    <span>0 XP</span>
                  </div>
                </div>
              </Link>
            )}
          </div>
        )}
      </aside>
    )
  }

  // Expanded sidebar - takes up space in the layout
  return (
    <aside
      className="sticky top-0 h-screen w-52 bg-gray-50 dark:bg-gray-950 flex flex-col transition-all duration-300 flex-shrink-0"
    >
      {/* Logo & Collapse Button - Height matches TopBar */}
      <div className="flex items-center h-16 px-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md gap-2">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors flex flex-col items-center justify-center gap-1 flex-shrink-0"
          aria-label="Collapse sidebar"
        >
          <span className="w-5 h-0.5 bg-current transition-all"></span>
          <span className="w-5 h-0.5 bg-current transition-all"></span>
          <span className="w-5 h-0.5 bg-current transition-all"></span>
        </button>
        <Link href="/dashboard" className="flex items-center">
          <span className="text-lg font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
            Study Sharper
          </span>
        </Link>
      </div>
      {/* Horizontal line separator */}
      <div className="border-b border-gray-200 dark:border-gray-800"></div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={getLinkClassName(item.href)}
          >
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300">
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* Bottom Section - User Info & Settings */}
      <div className="border-t border-gray-200/50 dark:border-gray-800/50 p-3 space-y-3">
        {/* User Info & Settings Combined */}
        {user && (
          <Link
            href="/account"
            className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${
              pathname === '/account'
                ? 'bg-primary-100 dark:bg-primary-900/30 border border-primary-300 dark:border-primary-700'
                : 'bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-950/50 dark:to-secondary-950/50 border border-primary-200 dark:border-primary-800 hover:border-primary-300 dark:hover:border-primary-700'
            }`}
          >
            <div className="flex items-center justify-center text-2xl">
              {displayAvatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 truncate">
                {firstName}
              </p>
              <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-300">
                <span>Lv. 1</span>
                <span>•</span>
                <span>0 XP</span>
              </div>
            </div>
          </Link>
        )}
      </div>
    </aside>
  )
}
