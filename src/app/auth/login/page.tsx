'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [pendingVerification, setPendingVerification] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const router = useRouter()
  const searchParams = useSearchParams()

  // Add debug logging helper
  const addDebug = (message: string) => {
    console.log('[LOGIN DEBUG]', message)
    setDebugInfo(prev => [...prev, `${new Date().toISOString().split('T')[1].split('.')[0]} - ${message}`])
  }

  useEffect(() => {
    addDebug('Login page mounted')
    addDebug(`Supabase client exists: ${!!supabase}`)
    addDebug(`Supabase auth exists: ${!!supabase?.auth}`)
    addDebug(`signInWithPassword exists: ${typeof supabase?.auth?.signInWithPassword}`)
    addDebug(`NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL || 'MISSING'}`)
    addDebug(`NEXT_PUBLIC_SUPABASE_ANON_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set (length: ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length + ')' : 'MISSING'}`)
    
    // Test if we can call a simple Supabase method
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        addDebug(`⚠️ Initial session check error: ${error.message}`)
      } else {
        addDebug(`✅ Initial session check OK (session: ${data.session ? 'exists' : 'none'})`)
      }
    }).catch(err => {
      addDebug(`❌ Failed to check session: ${err}`)
    })
  }, [])

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleLogin = async (e: React.FormEvent) => {
    addDebug('=== LOGIN ATTEMPT STARTED ===')
    addDebug(`Form submit event: ${e.type}`)
    
    e.preventDefault()
    addDebug('preventDefault() called')
    
    setLoading(true)
    setError('')
    setSuccess('')
    setPendingVerification(false)
    addDebug(`Email: ${email}`)
    addDebug(`Password length: ${password.length}`)

    if (!validateEmail(email)) {
      addDebug('Email validation failed')
      setError('Please enter a valid email address')
      setLoading(false)
      return
    }
    addDebug('Email validation passed')

    try {
      addDebug('Calling supabase.auth.signInWithPassword...')
      const startTime = Date.now()
      
      const response = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      const endTime = Date.now()
      addDebug(`API call completed in ${endTime - startTime}ms`)
      addDebug(`Response received: ${JSON.stringify({
        hasData: !!response.data,
        hasUser: !!response.data?.user,
        hasSession: !!response.data?.session,
        hasError: !!response.error,
        errorMessage: response.error?.message || 'none'
      })}`)

      const { error, data } = response

      if (error) {
        addDebug(`Login error: ${error.message}`)
        addDebug(`Error status: ${error.status}`)
        addDebug(`Error name: ${error.name}`)
        console.error('Login error:', error)
        
        if (error.message.includes('Email not confirmed')) {
          addDebug('Setting pending verification state')
          setError('Please confirm your email address before signing in. You can resend the verification email below if needed.')
          setPendingVerification(true)
        } else if (error.message.includes('Invalid login credentials')) {
          addDebug('Invalid credentials detected')
          setError('Invalid email or password. Please double-check your credentials and try again.')
          setShowForgotPassword(true)
        } else {
          addDebug('Unknown error type')
          setError(error.message)
        }
      } else {
        addDebug('✅ LOGIN SUCCESSFUL!')
        addDebug(`User ID: ${data.user?.id}`)
        addDebug(`Session: ${data.session?.access_token ? 'Token present' : 'No token'}`)
        
        setSuccess('Login successful! Redirecting to dashboard...')
        const next = searchParams?.get('next') || '/dashboard'
        addDebug(`Redirecting to: ${next}`)
        
        setTimeout(() => {
          addDebug('Executing router.push...')
          router.push(next)
        }, 1000)
      }
    } catch (error) {
      addDebug(`❌ CATCH BLOCK: ${error}`)
      addDebug(`Error type: ${typeof error}`)
      addDebug(`Error constructor: ${error?.constructor?.name}`)
      
      if (error instanceof Error) {
        addDebug(`Error message: ${error.message}`)
        addDebug(`Error stack: ${error.stack}`)
        console.error('Unexpected error during login:', error)
      } else {
        addDebug(`Non-Error object caught: ${JSON.stringify(error)}`)
        console.error('Non-standard error:', error)
      }
      
      setError(`An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      addDebug('Finally block executed')
      setLoading(false)
      addDebug('=== LOGIN ATTEMPT ENDED ===')
    }
  }

  const handleResendVerification = async () => {
    if (!validateEmail(email)) {
      setError('Enter a valid email to resend verification')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      })

      if (error) {
        throw error
      }

      setSuccess('Verification email resent! Please check your inbox.')
      setPendingVerification(false)
    } catch (resendError) {
      console.error('Error resending verification email:', resendError)
      const errorMessage = resendError instanceof Error ? resendError.message : 'Unable to resend verification email. Please try again later.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!validateEmail(resetEmail)) {
      setError('Please enter a valid email address')
      return
    }

    setResetLoading(true)
    setError('')
    setSuccess('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) {
        throw error
      }

      setSuccess('Password reset email sent! Please check your inbox.')
      setShowForgotPassword(false)
      setResetEmail('')
    } catch (resetError) {
      console.error('Error sending password reset email:', resetError)
      const errorMessage = resetError instanceof Error ? resetError.message : 'Unable to send password reset email. Please try again later.'
      setError(errorMessage)
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            Sign in to Study Sharper
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Or{' '}
            <Link href="/auth/signup" className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300">
              create a new account
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded">
              {success}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 focus:z-10 sm:text-sm autofill:bg-white dark:autofill:bg-gray-800 autofill:text-gray-900 dark:autofill:text-gray-100"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 focus:z-10 sm:text-sm autofill:bg-white dark:autofill:bg-gray-800 autofill:text-gray-900 dark:autofill:text-gray-100"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 dark:bg-primary-700 hover:bg-primary-700 dark:hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>

        {pendingVerification && (
          <div className="space-y-3">
            <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300 px-4 py-3 rounded text-sm">
              Didn&apos;t get the confirmation email? You can resend it below.
            </div>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={loading}
              className="w-full py-2 px-4 border border-primary-200 dark:border-primary-700 text-sm font-medium rounded-md text-primary-700 dark:text-primary-300 bg-white dark:bg-gray-800 hover:bg-primary-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-400 disabled:opacity-50"
            >
              {loading ? 'Resending...' : 'Resend verification email'}
            </button>
          </div>
        )}

        {showForgotPassword && (
          <div className="space-y-3">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300 px-4 py-3 rounded text-sm">
              Forgot your password? Enter your email to receive a reset link.
            </div>
            <input
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false)
                  setResetEmail('')
                }}
                className="flex-1 py-2 px-4 border border-gray-200 dark:border-gray-700 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetLoading}
                className="flex-1 py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 dark:bg-primary-700 hover:bg-primary-700 dark:hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {resetLoading ? 'Sending...' : 'Send reset link'}
              </button>
            </div>
          </div>
        )}

        {/* Debug Panel - Only show in development */}
        {process.env.NODE_ENV === 'development' && debugInfo.length > 0 && (
          <div className="mt-8 bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-auto max-h-96">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-white font-bold">🔍 Debug Console</h3>
              <button
                onClick={() => setDebugInfo([])}
                className="text-red-400 hover:text-red-300 text-xs"
              >
                Clear
              </button>
            </div>
            <div className="space-y-1">
              {debugInfo.map((info, idx) => (
                <div key={idx} className="whitespace-pre-wrap break-all">
                  {info}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
