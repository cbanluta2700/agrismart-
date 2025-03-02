'use client'

import { useState } from 'react'
import { useApi } from '@/lib/hooks/use-api'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const api = useApi()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccess(false)
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)
    const email = formData.get('email') as string

    try {
      await api.post('/auth/forgot-password', { email })
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Check Your Email</h2>
          <p className="text-gray-600 mb-6">
            We have sent a password reset link to your email address.
            Please check your inbox and follow the instructions.
          </p>
          <Link 
            href="/auth/login"
            className="text-primary hover:text-primary-dark"
          >
            Return to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-6">Reset Password</h2>
      
      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label 
              htmlFor="email" 
              className="block text-sm font-medium text-gray-700"
            >
              Email address
            </label>
            <p className="text-sm text-gray-500 mb-2">
              Enter your email address and we will send you a link to reset your password.
            </p>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            {isLoading ? 'Sending...' : 'Send reset link'}
          </button>
        </div>
      </form>

      <div className="mt-6 text-center">
        <Link 
          href="/auth/login"
          className="text-sm text-primary hover:text-primary-dark"
        >
          Back to login
        </Link>
      </div>
    </div>
  )
}