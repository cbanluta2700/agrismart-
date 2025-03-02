'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { useApi } from '@/lib/hooks/use-api'
import { FaEnvelope, FaGlobe, FaMapMarkerAlt, FaTwitter, FaGithub, FaLinkedin } from 'react-icons/fa'
import Link from 'next/link'

type UserProfileData = {
  id: string
  email: string
  name: string
  avatar: string | null
  role: string[]
  isActive: boolean
  emailVerified: boolean
  createdAt: string
  updatedAt: string
  profile: {
    bio: string | null
    location: string | null
    website: string | null
    phoneNumber: string | null
    jobTitle: string | null
    company: string | null
    twitter: string | null
    github: string | null
    linkedin: string | null
    profileVisibility: string
    showEmail: boolean
    showLocation: boolean
  } | null
}

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const { user: currentUser } = useAuth()
  const api = useApi()
  const [user, setUser] = useState<UserProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setIsLoading(true)
        const response = await api.get<{ user: UserProfileData }>(`/api/user/profile/${userId}`)
        setUser(response.user)
      } catch (err: any) {
        setError(err.message || 'Failed to fetch user profile')
      } finally {
        setIsLoading(false)
      }
    }

    if (userId) {
      fetchUserProfile()
    }
  }, [userId, api])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
          User not found
        </div>
      </div>
    )
  }

  // Check if profile is private and user is not the owner
  if (
    user.profile?.profileVisibility === 'private' && 
    currentUser?.id !== userId
  ) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
          This profile is private
        </div>
      </div>
    )
  }

  // Check if profile is for connections only (basic implementation - should be expanded)
  if (
    user.profile?.profileVisibility === 'connections' && 
    currentUser?.id !== userId
    // Add logic to check if users are connected
  ) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
          This profile is only visible to connections
        </div>
      </div>
    )
  }

  const isCurrentUserProfile = currentUser?.id === userId

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow overflow-hidden rounded-lg">
        {/* Profile header */}
        <div className="bg-gradient-to-r from-primary to-primary-dark h-32 relative">
          {isCurrentUserProfile && (
            <Link 
              href="/settings/profile" 
              className="absolute top-4 right-4 bg-white text-primary px-4 py-2 rounded-md shadow hover:bg-gray-50 transition-colors"
            >
              Edit Profile
            </Link>
          )}
        </div>
        
        {/* Avatar */}
        <div className="px-4 sm:px-6 -mt-16 mb-4 flex items-end">
          <div className="relative">
            <img
              src={user.avatar || '/default-avatar.png'}
              alt={user.name}
              className="h-32 w-32 rounded-full border-4 border-white bg-white object-cover"
            />
            {user.isActive && (
              <span className="absolute bottom-2 right-2 h-4 w-4 rounded-full bg-green-400 border-2 border-white"></span>
            )}
          </div>
          
          <div className="ml-6 pb-4">
            <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
            {user.profile?.jobTitle && (
              <p className="text-sm text-gray-500 mt-1">
                {user.profile.jobTitle}
                {user.profile.company && ` at ${user.profile.company}`}
              </p>
            )}
          </div>
        </div>
        
        {/* Profile content */}
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main content */}
            <div className="md:col-span-2 space-y-6">
              {/* Bio section */}
              {user.profile?.bio && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-2">About</h2>
                  <p className="text-gray-700 whitespace-pre-line">{user.profile.bio}</p>
                </div>
              )}
              
              {/* Member since */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-2">Member since</h2>
                <p className="text-gray-700">
                  {new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
            
            {/* Sidebar */}
            <div className="space-y-6">
              {/* Contact information */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-3">Contact information</h2>
                <ul className="space-y-3">
                  {user.profile?.showEmail && (
                    <li className="flex items-center text-gray-700">
                      <FaEnvelope className="w-5 h-5 text-gray-500 mr-2" />
                      <span>{user.email}</span>
                    </li>
                  )}
                  
                  {user.profile?.website && (
                    <li className="flex items-center text-gray-700">
                      <FaGlobe className="w-5 h-5 text-gray-500 mr-2" />
                      <a 
                        href={user.profile.website.startsWith('http') ? user.profile.website : `https://${user.profile.website}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {user.profile.website.replace(/^https?:\/\//, '')}
                      </a>
                    </li>
                  )}
                  
                  {user.profile?.showLocation && user.profile?.location && (
                    <li className="flex items-center text-gray-700">
                      <FaMapMarkerAlt className="w-5 h-5 text-gray-500 mr-2" />
                      <span>{user.profile.location}</span>
                    </li>
                  )}
                </ul>
              </div>
              
              {/* Social links */}
              {(user.profile?.twitter || user.profile?.github || user.profile?.linkedin) && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-3">Social</h2>
                  <ul className="space-y-3">
                    {user.profile?.twitter && (
                      <li className="flex items-center text-gray-700">
                        <FaTwitter className="w-5 h-5 text-blue-400 mr-2" />
                        <a 
                          href={`https://twitter.com/${user.profile.twitter}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          @{user.profile.twitter}
                        </a>
                      </li>
                    )}
                    
                    {user.profile?.github && (
                      <li className="flex items-center text-gray-700">
                        <FaGithub className="w-5 h-5 text-gray-900 mr-2" />
                        <a 
                          href={`https://github.com/${user.profile.github}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {user.profile.github}
                        </a>
                      </li>
                    )}
                    
                    {user.profile?.linkedin && (
                      <li className="flex items-center text-gray-700">
                        <FaLinkedin className="w-5 h-5 text-blue-700 mr-2" />
                        <a 
                          href={`https://linkedin.com/in/${user.profile.linkedin}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {user.profile.linkedin}
                        </a>
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
