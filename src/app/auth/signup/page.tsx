'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Signup() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [testMode, setTestMode] = useState(false)
  const router = useRouter()

  // Test email whitelist - allow these for testing
  const testEmails = [
    'testuser123@outlook.com',
    'testuser456@outlook.com',
    'testuser789@outlook.com',
    'user@localhost'
  ]

  const validateEmail = (email: string) => {
    // Check if it's a whitelisted test email
    if (testEmails.includes(email.toLowerCase())) {
      return true
    }

    // Standard email validation for real emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePassword = (password: string) => {
    return password.length >= 8 && // At least 8 characters
           /[A-Z]/.test(password) && // At least one uppercase letter
           /[a-z]/.test(password) && // At least one lowercase letter
           /\d/.test(password) // At least one number
  }

  const fillTestCredentials = () => {
    setFirstName('Test')
    setLastName('User')
    setEmail('testuser123@outlook.com')
    setPassword('Test123!')
    setConfirmPassword('Test123!')
    setTestMode(true)
    setError('')
    setSuccess('Test credentials loaded! Click "Create account" to continue.')
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // Validation
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter your first and last name')
      setLoading(false)
      return
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address')
      setLoading(false)
      return
    }

    if (!validatePassword(password)) {
      setError('Password must be at least 8 characters with uppercase, lowercase, and number')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
          },
          emailRedirectTo: `${window.location.origin}/auth/verify-email`,
          // Try to enable auto-confirmation for test emails
          captchaToken: testEmails.includes(email.toLowerCase()) ? 'test-mode' : undefined,
        },
      })

      if (error) {
        console.error('Signup error details:', error)
        console.error('Error code:', error.status)
        console.error('Error message:', error.message)
        setError(`Signup failed: ${error.message} (Code: ${error.status || 'unknown'})`)
      } else {
        console.log('Signup successful, checking if auto-confirmed...')

        // For test emails, try to auto-confirm immediately
        if (testEmails.includes(email.toLowerCase())) {
          console.log('Test email detected, attempting auto-confirmation...')
          try {
            // Wait a moment for the user to be created
            await new Promise(resolve => setTimeout(resolve, 3000))

            // Try to sign in immediately (this works if auto-confirmation is enabled)
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email,
              password,
            })

            if (signInError) {
              console.log('Auto-login failed, user needs email confirmation')
              // For test emails, provide a workaround message
              if (signInError.message.includes('Email not confirmed')) {
                setError('Account created! For testing, you can try logging in directly - the email confirmation might be processed automatically. If that doesn\'t work, please check your email.')
                // For test emails, try to bypass confirmation by redirecting to login
                setTimeout(() => {
                  setError('')
                  setSuccess('Account created! Redirecting to login page for testing...')
                  setTimeout(() => {
                    router.push('/auth/login')
                  }, 1500)
                }, 3000)
              } else {
                setError('Account created! Please check your email to confirm your account before logging in.')
              }
            } else {
              console.log('Auto-login successful!')
              setSuccess('Account created and confirmed! Redirecting to dashboard...')
              setTimeout(() => {
                router.push('/dashboard')
              }, 1000)
            }
          } catch (confirmError) {
            console.error('Auto-confirmation error:', confirmError)
            setError('Account created! Please check your email to confirm your account.')
          }
        } else {
          // For real emails, require confirmation
          setSuccess('Account created! Please check your email to confirm your account before logging in.')
        }
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
            Create your Study Sharper account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link href="/auth/login" className="font-medium text-primary-600 hover:text-primary-500">
              sign in to existing account
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

        <form className="mt-8 space-y-6" onSubmit={handleSignup}>
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
              <label htmlFor="firstName" className="sr-only">
                First Name
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="lastName" className="sr-only">
                Last Name
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
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
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Password (8+ chars, uppercase, lowercase, number)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="sr-only">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
