'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/components/AuthProvider'

type Theme = 'light' | 'dark' | 'auto'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  actualTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth()
  const [theme, setThemeState] = useState<Theme>('light')
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light')

  // Load theme from profile or localStorage
  useEffect(() => {
    // First try to get from profile
    if (profile?.theme && ['light', 'dark', 'auto'].includes(profile.theme)) {
      setThemeState(profile.theme as Theme)
    } else {
      // Fallback to localStorage
      const savedTheme = localStorage.getItem('theme-preference') as Theme
      if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
        setThemeState(savedTheme)
      }
    }
  }, [profile?.theme])

  // Apply theme to document and determine actual theme
  useEffect(() => {
    const applyTheme = () => {
      let resolvedTheme: 'light' | 'dark'

      if (theme === 'auto') {
        // Use system preference for auto mode
        resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      } else {
        resolvedTheme = theme
      }

      setActualTheme(resolvedTheme)

      // Apply theme class to html element
      const html = document.documentElement
      if (resolvedTheme === 'dark') {
        html.classList.add('dark')
      } else {
        html.classList.remove('dark')
      }
    }

    applyTheme()

    // Listen for system theme changes when in auto mode
    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => applyTheme()
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme])

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    // Store in localStorage for persistence
    localStorage.setItem('theme-preference', newTheme)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, actualTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
