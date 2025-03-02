'use client'

import { useEffect, useState } from 'react'
import { useApi } from '@/lib/hooks/use-api'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface VerifyEmailPageProps {
  params: {
    token: string
  }
}

export default function VerifyEmailPage({ params }: VerifyEmailPageProps) {
  const router = useRouter()
  const api = useApi()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        await api.post('/auth/verify-email', {
          token: params.token
        })
        setStatus('success')
      } catch (err: any) {
        setError(err.message || 'Verification failed')
        setStatus('error')
      }
    }

    verifyEmail()
  }, [api, params.token])

  if (status === 'loading') {
    return (
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Verifying Email</h2>
          <p className="text-gray-600">Please wait while we verify your email address...</p>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4 text-green-600">Email Verified!</h2>
          <p className="text-gray-600 mb-6">
            Your email has been successfully verified. You can now access all features of your account.
          </p>
          <Link 
            href="/dashboard"
            className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-4 text-red-600">Verification Failed</h2>
        <p className="text-gray-600 mb-4">
          {error || 'The verification link is invalid or has expired.'}
        </p>
        <div className="space-y-4">
          <button
            onClick={() => {
              api.post('/auth/resend-verification')
                .then(() => {
                  alert('Verification email has been resent. Please check your inbox.')
                })
                .catch(() => {
                  alert('Failed to resend verification email. Please try again later.')
                })
            }}
            className="w-full inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Resend Verification Email
          </button>
          <div>
            <Link 
              href="/auth/login"
              className="text-sm text-primary hover:text-primary-dark"
            >
              Return to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}