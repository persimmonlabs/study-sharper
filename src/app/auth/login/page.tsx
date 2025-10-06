'use client'

import { useState } from 'react'
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
  const router = useRouter()
  const searchParams = useSearchParams()

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    setPendingVerification(false)

    if (!validateEmail(email)) {
      setError('Please enter a valid email address')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('Login error:', error)
        if (error.message.includes('Email not confirmed')) {
          setError('Please confirm your email address before signing in. You can resend the verification email below if needed.')
          setPendingVerification(true)
        } else if (error.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please double-check your credentials and try again.')
        } else {
          setError(error.message)
        }
      } else {
        setSuccess('Login successful! Redirecting to dashboard...')
        const next = searchParams?.get('next') || '/dashboard'
        setTimeout(() => {
          router.push(next)
        }, 1000)
      }
    } catch (error) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
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
    } catch (resendError: any) {
      console.error('Error resending verification email:', resendError)
      setError(resendError.message ?? 'Unable to resend verification email. Please try again later.')
    } finally {
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
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 focus:z-10 sm:text-sm"
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
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 focus:z-10 sm:text-sm"
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
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-4 py-3 rounded text-sm">
              Didn't get the confirmation email? You can resend it below.
            </div>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={loading}
              className="w-full py-2 px-4 border border-blue-200 dark:border-blue-700 text-sm font-medium rounded-md text-blue-700 dark:text-blue-300 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 disabled:opacity-50"
            >
              {loading ? 'Resending...' : 'Resend verification email'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
