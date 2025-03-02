import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/db'
import type { NextRequest } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get the current user token to check permissions
    const token = await getToken({ req })
    const isOwnProfile = token?.id === userId

    // Get the user with profile data
    const user = await prisma.user.findUnique({
      where: { id: userId },
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
            profileVisibility: true,
            showEmail: true,
            showLocation: true
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

    // Check privacy settings - if not the owner and profile is private
    if (!isOwnProfile && user.profile?.profileVisibility === 'private') {
      return NextResponse.json(
        { 
          user: {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            profile: {
              profileVisibility: 'private'
            }
          },
          message: 'This profile is private'
        }
      )
    }

    // Handle the 'connections' visibility setting (simplified version)
    if (!isOwnProfile && user.profile?.profileVisibility === 'connections') {
      // Here we would normally check if the users are connected
      // For now, just return a limited version of the profile
      return NextResponse.json(
        { 
          user: {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            profile: {
              profileVisibility: 'connections',
              jobTitle: user.profile.jobTitle,
              company: user.profile.company
            }
          },
          message: 'This profile is only visible to connections'
        }
      )
    }

    // Filter out email if showEmail is false and not the owner
    if (!isOwnProfile && user.profile && !user.profile.showEmail) {
      user.email = ''  // Don't expose the email
    }

    // Filter out location if showLocation is false and not the owner
    if (!isOwnProfile && user.profile && !user.profile.showLocation) {
      if (user.profile.location) {
        user.profile.location = ''
      }
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
