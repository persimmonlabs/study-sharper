'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'

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
  const { user, loading: authLoading } = useAuth()

  // Add debug logging helper
  const addDebug = useCallback((message: string) => {
    console.log('[LOGIN DEBUG]', message)
    setDebugInfo(prev => [...prev, `${new Date().toISOString().split('T')[1].split('.')[0]} - ${message}`])
  }, [])

  // Check for OAuth tokens in URL fragment (implicit flow)
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const hash = window.location.hash
      
      if (hash && hash.includes('access_token')) {
        addDebug('🔑 OAuth tokens detected in URL fragment (implicit flow)')
        addDebug(`Hash: ${hash.substring(0, 100)}...`)
        
        try {
          // Parse tokens from URL fragment
          const hashParams = new URLSearchParams(hash.substring(1))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')
          
          if (accessToken && refreshToken) {
            addDebug(`Extracted tokens - access: ${accessToken.substring(0, 20)}..., refresh: ${refreshToken}`)
            
            // Manually set the session using the tokens
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })
            
            if (error) {
              addDebug(`❌ Error setting session: ${error.message}`)
              setError(`Authentication failed: ${error.message}`)
            } else if (data.session) {
              addDebug('✅ Session established from OAuth tokens!')
              addDebug(`User ID: ${data.session.user.id}`)
              addDebug(`Email: ${data.session.user.email}`)
              
              // Clear the URL hash
              window.history.replaceState(null, '', '/dashboard')
              
              // Redirect to dashboard
              addDebug('🚀 Redirecting to dashboard...')
              router.replace('/dashboard')
            } else {
              addDebug('⚠️ Session data missing after setSession')
            }
          } else {
            addDebug('❌ Missing access_token or refresh_token in URL')
            setError('Authentication failed: Missing required tokens')
          }
        } catch (err) {
          addDebug(`❌ Exception handling OAuth callback: ${err}`)
          console.error('OAuth callback error:', err)
          setError(`Authentication error: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
      }
      
      // Also check for errors in query params
      if (searchParams) {
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')
        const errorCode = searchParams.get('error_code')
        
        if (error && error !== 'missing_verification_code') {
          addDebug(`🚨 OAuth Error in query params:` )
          addDebug(`  - error: ${error}`)
          addDebug(`  - error_description: ${errorDescription}`)
          addDebug(`  - error_code: ${errorCode}`)
          setError(`Authentication failed: ${errorDescription || error || 'Unknown error'}`)
        }
      }
    }
    
    handleOAuthCallback()
  }, [searchParams, addDebug, router])

  // Check user authentication status and show appropriate message
  useEffect(() => {
    addDebug(`[AUTH STATUS] authLoading: ${authLoading}, user: ${user ? 'present' : 'null'}, userId: ${user?.id}`)
    
    if (!authLoading && user) {
      addDebug(`User already authenticated but staying on login page - user may want to switch accounts`)
      // DON'T auto-redirect - let the user decide what they want to do
      // They might want to log in with different credentials
    } else if (!authLoading && !user) {
      addDebug(`No user authenticated, ready for login`)
    } else {
      addDebug(`Auth still loading, waiting...`)
    }
  }, [user, authLoading, addDebug])

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
  }, [addDebug])

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
      
      // Don't await the full response, just catch errors
      supabase.auth.signInWithPassword({
        email,
        password,
      }).then(response => {
        const endTime = Date.now()
        addDebug(`API call completed in ${endTime - startTime}ms`)
        
        if (response.error) {
          addDebug(`Login error: ${response.error.message}`)
          setLoading(false)
          
          if (response.error.message.includes('Email not confirmed')) {
            setError('Please confirm your email address before signing in. You can resend the verification email below if needed.')
            setPendingVerification(true)
          } else if (response.error.message.includes('Invalid login credentials')) {
            setError('Invalid email or password. Please double-check your credentials and try again.')
            setShowForgotPassword(true)
          } else {
            setError(response.error.message)
          }
        } else {
          addDebug('✅ LOGIN SUCCESSFUL!')
          addDebug(`Response data: user=${!!response.data?.user}, session=${!!response.data?.session}`)
          setSuccess('Login successful! Redirecting to dashboard...')
          setLoading(false)
          
          // Redirect after successful login
          const nextUrl = new URLSearchParams(window.location.search).get('next') || '/dashboard'
          addDebug(`Redirecting to: ${nextUrl} after successful login`)
          
          // Small delay to show success message, then redirect
          setTimeout(() => {
            addDebug('Executing post-login redirect...')
            router.replace(nextUrl)
          }, 1500)
        }
      }).catch(err => {
        addDebug(`❌ Login promise rejected: ${err}`)
        setError('An unexpected error occurred during login')
        setLoading(false)
      })
      
      // Don't wait for the promise to resolve
      addDebug('Login request initiated, waiting for auth state change...')
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

  const handleGoogleSignIn = async () => {
    addDebug('=== GOOGLE SIGN-IN ATTEMPT STARTED ===')
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const nextUrl = searchParams?.get('next') || '/dashboard'
      
      addDebug(`Post-login destination: ${nextUrl}`)
      addDebug(`Origin: ${window.location.origin}`)

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          skipBrowserRedirect: false,
        },
      })

      if (error) {
        addDebug(`Google OAuth error: ${error.message}`)
        throw error
      }

      addDebug('Google OAuth initiated successfully')
      addDebug(`Redirect URL: ${data.url}`)
      // Browser will automatically redirect to Google
    } catch (error) {
      addDebug(`❌ Google sign-in error: ${error}`)
      console.error('Google sign-in error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in with Google. Please try again.'
      setError(errorMessage)
      setLoading(false)
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
        
        {/* Show info if user is already logged in */}
        {!authLoading && user && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-4 py-3 rounded mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">You&apos;re already signed in!</p>
                <p className="text-xs mt-1 opacity-80">You can proceed to your dashboard or sign in with different credentials.</p>
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={async () => {
                    addDebug('User clicked Sign Out to use different credentials')
                    await supabase.auth.signOut()
                    // The auth state change will clear the user automatically
                  }}
                  className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-1 rounded text-sm transition-colors"
                >
                  Sign Out
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = searchParams?.get('next') || '/dashboard'
                    addDebug(`User chose to go to dashboard: ${next}`)
                    router.replace(next)
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Google Sign-In Button */}
        <div className="mt-8">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {loading ? 'Connecting...' : 'Continue with Google'}
          </button>
        </div>

        {/* Divider */}
        <div className="relative mt-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">Or continue with email</span>
          </div>
        </div>

        <form className="mt-6 space-y-6" onSubmit={handleLogin}>
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
