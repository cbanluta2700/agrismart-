'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { FaGoogle, FaFacebook, FaGithub } from 'react-icons/fa'

export default function LoginPage() {
  const { login, isLoading } = useAuth()
  const [error, setError] = useState<string>('')
  const [socialLoading, setSocialLoading] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    const formData = new FormData(event.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      await login({ email, password })
    } catch (err) {
      setError('Invalid email or password')
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
      <h2 className="text-2xl font-semibold mb-6 text-center">Sign In to AgriSmart</h2>
      
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
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember"
                name="remember"
                type="checkbox"
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label 
                htmlFor="remember" 
                className="ml-2 block text-sm text-gray-700"
              >
                Remember me
              </label>
            </div>

            <Link 
              href="/auth/forgot-password"
              className="text-sm text-primary hover:text-primary-dark"
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
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
          Don't have an account?{' '}
          <Link 
            href="/auth/register"
            className="text-primary hover:text-primary-dark"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}