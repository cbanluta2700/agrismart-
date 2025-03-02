'use client'

import { useState, useEffect } from 'react'
import { useApi } from '@/lib/hooks/use-api'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const api = useApi()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [token, setToken] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const urlToken = searchParams.get('token')
    if (urlToken) {
      setToken(urlToken)
    }
  }, [searchParams])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccess(false)
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      setIsLoading(false)
      return
    }

    if (!token) {
      setError('Invalid or missing reset token')
      setIsLoading(false)
      return
    }

    try {
      await api.post('/auth/reset-password', { token, password })
      setSuccess(true)
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/auth/login')
      }, 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to reset password')
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6 max-w-md mx-auto">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Invalid Reset Link</h2>
          <p className="text-gray-600 mb-6">
            This password reset link is invalid or has expired.
          </p>
          <Link 
            href="/auth/forgot-password"
            className="text-primary hover:text-primary-dark"
          >
            Request a new reset link
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6 max-w-md mx-auto">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Password Reset Successful</h2>
          <p className="text-gray-600 mb-6">
            Your password has been reset successfully. You will be redirected to the login page in a few seconds.
          </p>
          <Link 
            href="/auth/login"
            className="text-primary hover:text-primary-dark"
          >
            Go to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-semibold mb-6 text-center">Reset Your Password</h2>
      
      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label 
              htmlFor="password" 
              className="block text-sm font-medium text-gray-700"
            >
              New Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            />
            <p className="mt-1 text-xs text-gray-500">
              At least 8 characters with letters, numbers, and special characters
            </p>
          </div>

          <div>
            <label 
              htmlFor="confirmPassword" 
              className="block text-sm font-medium text-gray-700"
            >
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            {isLoading ? 'Resetting password...' : 'Reset password'}
          </button>
        </div>
      </form>
    </div>
  )
}
