import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/db'
import { validateProfileData, ValidationError } from '@/lib/validations/profile'
import type { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req })
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user with profile data
    const user = await prisma.user.findUnique({
      where: { id: token.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        profile: {
          select: {
            bio: true,
            location: true,
            website: true,
            phoneNumber: true,
            jobTitle: true,
            company: true,
            twitter: true,
            github: true,
            linkedin: true,
            theme: true,
            language: true,
            timezone: true,
            profileVisibility: true,
            showEmail: true,
            showLocation: true,
            notifyMarketing: true,
            notifySecurity: true,
            notifyUpdates: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = await getToken({ req })
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const data = await req.json()
    const validatedData = validateProfileData(data)
    
    // Extract user fields vs profile fields
    const { 
      name, 
      avatar,
      // Keep remaining fields for profile
      ...profileData
    } = validatedData

    // Start a transaction to update both user and profile
    const updatedUser = await prisma.$transaction(async (tx) => {
      // Update user table with basic fields
      const user = await tx.user.update({
        where: { id: token.id },
        data: { 
          name: name || undefined,
          avatar: avatar || undefined
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatar: true,
          isActive: true,
          emailVerified: true
        }
      })

      // Check if profile exists
      const existingProfile = await tx.userProfile.findUnique({
        where: { userId: token.id }
      })

      // Update or create profile
      const profile = existingProfile
        ? await tx.userProfile.update({
            where: { userId: token.id },
            data: {
              bio: profileData.bio,
              location: profileData.location,
              website: profileData.website,
              phoneNumber: profileData.phoneNumber,
              jobTitle: profileData.jobTitle,
              company: profileData.company,
              twitter: profileData.twitter,
              github: profileData.github,
              linkedin: profileData.linkedin,
              theme: profileData.theme,
              language: profileData.language,
              timezone: profileData.timezone,
              profileVisibility: profileData.profileVisibility,
              showEmail: profileData.showEmail,
              showLocation: profileData.showLocation,
              notifyMarketing: profileData.notifyMarketing,
              notifySecurity: profileData.notifySecurity,
              notifyUpdates: profileData.notifyUpdates
            }
          })
        : await tx.userProfile.create({
            data: {
              userId: token.id,
              bio: profileData.bio,
              location: profileData.location,
              website: profileData.website,
              phoneNumber: profileData.phoneNumber,
              jobTitle: profileData.jobTitle,
              company: profileData.company,
              twitter: profileData.twitter,
              github: profileData.github,
              linkedin: profileData.linkedin,
              theme: profileData.theme || 'system',
              language: profileData.language || 'en',
              timezone: profileData.timezone,
              profileVisibility: profileData.profileVisibility || 'public',
              showEmail: profileData.showEmail === undefined ? false : profileData.showEmail,
              showLocation: profileData.showLocation === undefined ? true : profileData.showLocation,
              notifyMarketing: profileData.notifyMarketing === undefined ? false : profileData.notifyMarketing,
              notifySecurity: profileData.notifySecurity === undefined ? true : profileData.notifySecurity,
              notifyUpdates: profileData.notifyUpdates === undefined ? true : profileData.notifyUpdates
            }
          })

      return {
        ...user,
        profile
      }
    })

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: updatedUser
    })
  } catch (error) {
    console.error('Profile update error:', error)
    
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: 'Invalid profile data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}