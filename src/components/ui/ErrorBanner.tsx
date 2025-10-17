'use client'

import { useState } from 'react'

interface ErrorBannerProps {
  title?: string
  message: string
  onRetry?: () => void
  onDismiss?: () => void
  variant?: 'error' | 'warning' | 'info'
}

export function ErrorBanner({
  title = 'Error',
  message,
  onRetry,
  onDismiss,
  variant = 'error'
}: ErrorBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false)

  if (isDismissed) return null

  const variantStyles = {
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-800 dark:text-red-200',
      icon: '❌'
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-800 dark:text-yellow-200',
      icon: '⚠️'
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-800 dark:text-blue-200',
      icon: 'ℹ️'
    }
  }

  const styles = variantStyles[variant]

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  return (
    <div className={`${styles.bg} ${styles.border} border rounded-lg p-4 mb-4`}>
      <div className="flex items-start">
        <div className="flex-shrink-0 text-2xl mr-3">
          {styles.icon}
        </div>
        <div className="flex-1">
          <h3 className={`text-sm font-semibold ${styles.text} mb-1`}>
            {title}
          </h3>
          <p className={`text-sm ${styles.text}`}>
            {message}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className={`mt-3 px-4 py-2 text-sm font-medium rounded-md ${
                variant === 'error'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : variant === 'warning'
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              } transition-colors`}
            >
              Try Again
            </button>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className={`flex-shrink-0 ml-3 ${styles.text} hover:opacity-70 transition-opacity`}
          aria-label="Dismiss"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  )
}
