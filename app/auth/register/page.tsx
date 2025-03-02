'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { FaGoogle, FaFacebook, FaGithub } from 'react-icons/fa'

export default function RegisterPage() {
  const { register, isLoading } = useAuth()
  const [error, setError] = useState<string>('')
  const [socialLoading, setSocialLoading] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    const formData = new FormData(event.currentTarget)
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    try {
      await register({ name, email, password })
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    }
  }

  const handleSocialLogin = async (provider: string) => {
    try {
      setSocialLoading(provider)
      await signIn(provider, { callbackUrl: '/dashboard' })
    } catch (error) {
      console.error(`Error signing in with ${provider}:`, error)
      setError(`Failed to sign in with ${provider}`)
    } finally {
      setSocialLoading(null)
    }
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-semibold mb-6 text-center">Join AgriSmart</h2>
      
      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label 
              htmlFor="name" 
              className="block text-sm font-medium text-gray-700"
            >
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label 
              htmlFor="email" 
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label 
              htmlFor="password" 
              className="block text-sm font-medium text-gray-700"
            >
              Password
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
              Confirm Password
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

          <div className="flex items-center">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              required
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
            />
            <label 
              htmlFor="terms" 
              className="ml-2 block text-sm text-gray-700"
            >
              I agree to the{' '}
              <Link 
                href="/terms" 
                className="text-primary hover:text-primary-dark"
              >
                Terms of Service
              </Link>
              {' '}and{' '}
              <Link 
                href="/privacy" 
                className="text-primary hover:text-primary-dark"
              >
                Privacy Policy
              </Link>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </button>
        </div>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <button
            onClick={() => handleSocialLogin('google')}
            disabled={!!socialLoading}
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            {socialLoading === 'google' ? (
              <span className="animate-spin">⟳</span>
            ) : (
              <FaGoogle className="text-red-500" />
            )}
          </button>

          <button
            onClick={() => handleSocialLogin('facebook')}
            disabled={!!socialLoading}
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            {socialLoading === 'facebook' ? (
              <span className="animate-spin">⟳</span>
            ) : (
              <FaFacebook className="text-blue-600" />
            )}
          </button>

          <button
            onClick={() => handleSocialLogin('github')}
            disabled={!!socialLoading}
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            {socialLoading === 'github' ? (
              <span className="animate-spin">⟳</span>
            ) : (
              <FaGithub />
            )}
          </button>
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <Link 
            href="/auth/login"
            className="text-primary hover:text-primary-dark"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}