'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { useApi } from '@/lib/hooks/use-api'
import { User } from '@/types/store.types'

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth()
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
    const updateData = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      // Add more fields as needed
    }

    try {
      const response = await api.put<User>('/api/user/profile', updateData)
      setSuccess(true)
      // Update local user state if needed
    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  if (authLoading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <div>Please log in to view this page.</div>
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="space-y-8">
        {/* Profile Header */}
        <div>
          <h2 className="text-2xl font-bold">Profile Settings</h2>
          <p className="mt-1 text-sm text-gray-600">
            Manage your account settings and preferences.
          </p>
        </div>

        {/* Avatar Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium mb-4">Profile Picture</h3>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <img
                src={user.avatar || '/default-avatar.png'}
                alt="Profile"
                className="h-20 w-20 rounded-full object-cover"
              />
              <button
                type="button"
                className="absolute bottom-0 right-0 bg-primary text-white p-1 rounded-full shadow-lg hover:bg-primary-dark"
              >
                <span className="sr-only">Change avatar</span>
                {/* Add icon here */}
              </button>
            </div>
            <button
              type="button"
              className="px-3 py-2 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50"
            >
              Change Photo
            </button>
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
          {error && (
            <div className="mb-4 bg-red-50 text-red-500 p-3 rounded">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 bg-green-50 text-green-500 p-3 rounded">
              Profile updated successfully!
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label 
                htmlFor="name" 
                className="block text-sm font-medium text-gray-700"
              >
                Full Name
              </label>
              <input
                type="text"
                name="name"
                id="name"
                defaultValue={user.name}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
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
                type="email"
                name="email"
                id="email"
                defaultValue={user.email}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}