'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { useApi } from '@/lib/hooks/use-api'

interface Session {
  id: string
  device: string
  browser: string
  location: string
  lastActive: string
  current: boolean
}

export default function SecurityPage() {
  const { user } = useAuth()
  const api = useApi()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [sessions, setSessions] = useState<Session[]>([])

  const handlePasswordChange = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)
    const currentPassword = formData.get('currentPassword') as string
    const newPassword = formData.get('newPassword') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      setIsLoading(false)
      return
    }

    try {
      await api.post('/api/user/change-password', {
        currentPassword,
        newPassword
      })
      setSuccess('Password successfully updated')
      event.currentTarget.reset()
    } catch (err: any) {
      setError(err.message || 'Failed to update password')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await api.delete(`/api/user/sessions/${sessionId}`)
      setSessions(sessions.filter(session => session.id !== sessionId))
    } catch (err: any) {
      setError(err.message || 'Failed to revoke session')
    }
  }

  const handleRevokeAllSessions = async () => {
    try {
      await api.delete('/api/user/sessions')
      setSessions(sessions.filter(session => session.current))
      setSuccess('All other sessions have been revoked')
    } catch (err: any) {
      setError(err.message || 'Failed to revoke sessions')
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h2 className="text-2xl font-bold mb-8">Security Settings</h2>

      {/* Password Change Section */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h3 className="text-lg font-medium mb-4">Change Password</h3>
        
        {error && (
          <div className="mb-4 bg-red-50 text-red-500 p-3 rounded">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 bg-green-50 text-green-500 p-3 rounded">
            {success}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label 
              htmlFor="currentPassword" 
              className="block text-sm font-medium text-gray-700"
            >
              Current Password
            </label>
            <input
              type="password"
              name="currentPassword"
              id="currentPassword"
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label 
              htmlFor="newPassword" 
              className="block text-sm font-medium text-gray-700"
            >
              New Password
            </label>
            <input
              type="password"
              name="newPassword"
              id="newPassword"
              required
              minLength={8}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label 
              htmlFor="confirmPassword" 
              className="block text-sm font-medium text-gray-700"
            >
              Confirm New Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              id="confirmPassword"
              required
              minLength={8}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              {isLoading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Active Sessions Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Active Sessions</h3>
          <button
            onClick={handleRevokeAllSessions}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Sign out all other sessions
          </button>
        </div>

        <div className="space-y-4">
          {sessions.map(session => (
            <div 
              key={session.id} 
              className="flex justify-between items-center p-4 border rounded"
            >
              <div>
                <p className="font-medium">
                  {session.browser} on {session.device}
                  {session.current && (
                    <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Current
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-500">
                  Last active: {session.lastActive}
                </p>
                <p className="text-sm text-gray-500">
                  Location: {session.location}
                </p>
              </div>
              {!session.current && (
                <button
                  onClick={() => handleRevokeSession(session.id)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}