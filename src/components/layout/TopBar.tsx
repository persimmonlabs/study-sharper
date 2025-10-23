'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { useTheme } from '@/components/common/ThemeProvider'
import { useState, useEffect, useRef } from 'react'

interface NotificationItem {
  id: string
  title: string
  message?: string
  timestamp?: string
}

export function TopBar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationsError, setNotificationsError] = useState<string | null>(null)
  const [hasFetchedNotifications, setHasFetchedNotifications] = useState(false)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        showNotifications &&
        notificationsRef.current &&
        !notificationsRef.current.contains(target)
      ) {
        setShowNotifications(false)
      }

      if (showUserMenu && userMenuRef.current && !userMenuRef.current.contains(target)) {
        setShowUserMenu(false)
      }
    }

    if (showNotifications || showUserMenu) {
      document.addEventListener('click', handleClickOutside)
    }

    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [showNotifications, showUserMenu])

  useEffect(() => {
    let isMounted = true

    const loadNotifications = async () => {
      try {
        setNotificationsLoading(true)
        setNotificationsError(null)
        const response = await fetch('/api/notifications', { cache: 'no-store' })
        if (!response.ok) {
          throw new Error('Failed to load notifications')
        }
        const data = await response.json()
        if (!isMounted) return
        const items = Array.isArray(data.notifications) ? data.notifications : []
        setNotifications(items)
      } catch (error) {
        if (!isMounted) return
        setNotifications([])
        setNotificationsError(error instanceof Error ? error.message : 'Failed to load notifications')
      } finally {
        if (isMounted) {
          setNotificationsLoading(false)
        }
      }
    }

    if (showNotifications && !hasFetchedNotifications) {
      setHasFetchedNotifications(true)
      loadNotifications()
    }

    return () => {
      isMounted = false
    }
  }, [showNotifications, hasFetchedNotifications])

  // Don't show topbar on auth pages or homepage
  if (pathname.startsWith('/auth') || pathname === '/') {
    return null
  }

  // Get page title based on current route
  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Dashboard'
    if (pathname.startsWith('/files')) return 'Files'
    if (pathname.startsWith('/study')) return 'Study'
    if (pathname.startsWith('/calendar')) return 'Calendar'
    if (pathname.startsWith('/social')) return 'Social Hub'
    if (pathname.startsWith('/account')) return 'Account Settings'
    if (pathname.startsWith('/assignments')) return 'Assignments'
    return 'Study Sharper'
  }

  const handleSignOut = async () => {
    try {
      setShowUserMenu(false)
      await signOut()
      router.push('/auth/login')
    } catch (error) {
      console.error('Error signing out:', error)
      router.push('/auth/login')
    }
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between h-16 pl-16 pr-6">
        {/* Page Title */}
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {getPageTitle()}
          </h1>
        </div>

        {/* Search Bar (Center) */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <input
              type="search"
              placeholder="Search notes, assignments..."
              className="w-full px-4 py-2 pl-10 text-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            />
            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
          </div>
        </div>

        {/* Right Section - Theme Toggle, Notifications, User Menu */}
        <div className="flex items-center space-x-4">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={(event) => {
                event.stopPropagation()
                setShowNotifications((prev) => !prev)
                setShowUserMenu(false)
              }}
              className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400"
              aria-label="Notifications"
              aria-expanded={showNotifications}
            >
              <span className="text-xl">🔔</span>
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50" role="menu">
                <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</h4>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notificationsLoading && (
                    <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                      Loading notifications...
                    </div>
                  )}
                  {!notificationsLoading && notificationsError && (
                    <div className="px-4 py-6 text-center text-sm text-red-500 dark:text-red-400">
                      {notificationsError}
                    </div>
                  )}
                  {!notificationsLoading && !notificationsError && notifications.length === 0 && (
                    <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                      You&apos;re all caught up! No updates right now.
                    </div>
                  )}
                  {!notificationsLoading && !notificationsError && notifications.length > 0 && (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {notifications.map((notification) => (
                        <div key={notification.id} className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {notification.title}
                          </p>
                          {notification.message && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {notification.message}
                            </p>
                          )}
                          {notification.timestamp && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                              {new Date(notification.timestamp).toLocaleString()}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          {user && (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowUserMenu(!showUserMenu)
                  setShowNotifications(false)
                }}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center text-white font-semibold text-sm">
                  {user.email?.[0].toUpperCase() || 'U'}
                </div>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {user.email}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Free Account
                      </p>
                    </div>
                    
                    <button
                      onClick={handleSignOut}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      Sign Out
                    </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
