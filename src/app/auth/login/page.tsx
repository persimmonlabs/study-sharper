'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  const validateEmail = (email: string) => {
    // Test email whitelist - allow these for testing
    const testEmails = [
      'testuser123@outlook.com',
      'testuser456@outlook.com',
      'testuser789@outlook.com',
      'user@localhost'
    ]

    // Check if it's a whitelisted test email
    if (testEmails.includes(email.toLowerCase())) {
      return true
    }

    // Standard email validation for real emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const fillTestCredentials = () => {
    setEmail('testuser123@outlook.com')
    setPassword('Test123!')
    setError('')
    setSuccess('Test credentials loaded! Click "Sign in" to continue.')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (!validateEmail(email)) {
      setError('Please enter a valid email address')
      setLoading(false)
      return
    }

    try {
      const testEmails = [
        'testuser123@outlook.com',
        'testuser456@outlook.com',
        'testuser789@outlook.com',
        'user@localhost'
      ]

      // Check if this is a test email - if so, bypass normal authentication
      if (testEmails.includes(email.toLowerCase())) {
        console.log('Test email detected, using bypass authentication...')
        setLoading(true)

        // Create a mock user session for testing
        const mockUser = {
          id: 'test-user-' + Date.now(),
          email: email,
          user_metadata: {
            first_name: 'Test',
            last_name: 'User'
          }
        }

        // Store mock session in localStorage for testing (only on client side)
        if (typeof window !== 'undefined') {
          localStorage.setItem('testUser', JSON.stringify(mockUser))
          localStorage.setItem('testMode', 'true')
        }

        setSuccess('Test login successful! Redirecting to dashboard...')
        setTimeout(() => {
          router.push('/dashboard')
        }, 1000)
        return
      }

      // Normal authentication for non-test emails
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('Login error:', error)

        // Handle specific error cases for test emails
        const testEmails = [
          'testuser123@outlook.com',
          'testuser456@outlook.com',
          'testuser789@outlook.com',
          'user@localhost'
        ]

        if (testEmails.includes(email.toLowerCase()) && error.message.includes('Email not confirmed')) {
          setError('Test account needs confirmation. For testing purposes, try signing up again - it should auto-confirm this time.')
        } else if (error.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. For testing, make sure to use the "Load Test Data" button first.')
        } else if (error.message.includes('Email not confirmed')) {
          setError('Please confirm your email address first. Check your inbox for a confirmation link.')
        } else {
          setError(error.message)
        }
      } else {
        setSuccess('Login successful! Redirecting to dashboard...')
        setTimeout(() => {
          router.push('/dashboard')
        }, 1000)
      }
    } catch (error) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to Study Sharper
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link href="/auth/signup" className="font-medium text-primary-600 hover:text-primary-500">
              create a new account
            </Link>
          </p>
        </div>

        {/* Test Mode Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-blue-900">Test Mode</h3>
              <p className="text-sm text-blue-700">
                Click below to auto-fill test credentials for immediate testing
              </p>
            </div>
            <button
              type="button"
              onClick={fillTestCredentials}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
            >
              Load Test Data
            </button>
          </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
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
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
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
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
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
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
