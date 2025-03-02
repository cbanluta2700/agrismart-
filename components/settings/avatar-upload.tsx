'use client'

import { useState, useRef } from 'react'
import { useApi } from '@/lib/hooks/use-api'
import Image from 'next/image'

interface AvatarUploadProps {
  currentAvatar?: string
  onUploadSuccess: (avatarUrl: string) => void
}

export default function AvatarUpload({ currentAvatar, onUploadSuccess }: AvatarUploadProps) {
  const api = useApi()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string>('')
  const [preview, setPreview] = useState<string | null>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError('')
    const file = event.target.files?.[0]
    
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!fileInputRef.current?.files?.length) return

    const file = fileInputRef.current.files[0]
    const formData = new FormData()
    formData.append('avatar', file)

    try {
      setIsUploading(true)
      const response = await api.post<{ avatarUrl: string }>(
        '/api/user/avatar',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )
      
      onUploadSuccess(response.data.avatarUrl)
      setPreview(null)
    } catch (err: any) {
      setError(err.message || 'Failed to upload avatar')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

      <div className="flex items-center space-x-6">
        {/* Current or Preview Avatar */}
        <div className="relative w-20 h-20 rounded-full overflow-hidden">
          {(preview || currentAvatar) ? (
            <Image
              src={preview || currentAvatar || '/default-avatar.png'}
              alt="Avatar preview"
              width={80}
              height={80}
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-400">No image</span>
            </div>
          )}
        </div>

        {/* Upload Controls */}
        <div className="flex flex-col space-y-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            className="hidden"
          />
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Choose File
          </button>

          {preview && (
            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-500">
        Supported formats: JPG, PNG, GIF (max. 5MB)
      </p>
    </div>
  )
}