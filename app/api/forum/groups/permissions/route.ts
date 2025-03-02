import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Default permissions to seed if none exist
const DEFAULT_PERMISSIONS = [
  {
    name: 'View Group',
    description: 'Can view the group and its content',
    category: 'General',
  },
  {
    name: 'Create Posts',
    description: 'Can create new posts in the group',
    category: 'Content',
  },
  {
    name: 'Comment',
    description: 'Can comment on posts in the group',
    category: 'Content',
  },
  {
    name: 'Edit Own Posts',
    description: 'Can edit their own posts',
    category: 'Content',
  },
  {
    name: 'Delete Own Posts',
    description: 'Can delete their own posts',
    category: 'Content',
  },
  {
    name: 'Edit Any Post',
    description: 'Can edit any post in the group',
    category: 'Moderation',
  },
  {
    name: 'Delete Any Post',
    description: 'Can delete any post in the group',
    category: 'Moderation',
  },
  {
    name: 'Pin Posts',
    description: 'Can pin posts to the top of the group',
    category: 'Moderation',
  },
  {
    name: 'Manage Members',
    description: 'Can add or remove members from the group',
    category: 'Administration',
  },
  {
    name: 'Invite Members',
    description: 'Can invite new members to the group',
    category: 'General',
  },
  {
    name: 'Approve Member Requests',
    description: 'Can approve or deny join requests',
    category: 'Administration',
  },
  {
    name: 'View Analytics',
    description: 'Can view group analytics data',
    category: 'Administration',
  },
  {
    name: 'Moderate Content',
    description: 'Can moderate posts and comments',
    category: 'Moderation',
  },
  {
    name: 'Assign Roles',
    description: 'Can assign roles to other members',
    category: 'Administration',
  },
];

export async function GET() {
  try {
    // Get session to check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get all permissions
    let permissions = await prisma.groupPermission.findMany({
      orderBy: {
        category: 'asc',
      },
    });
    
    // If no permissions exist, seed the default ones
    if (permissions.length === 0) {
      // Create all permissions in a transaction
      await prisma.$transaction(
        DEFAULT_PERMISSIONS.map(permission =>
          prisma.groupPermission.create({
            data: permission,
          })
        )
      );
      
      // Get the newly created permissions
      permissions = await prisma.groupPermission.findMany({
        orderBy: {
          category: 'asc',
        },
      });
    }
    
    return NextResponse.json(permissions);
  } catch (error) {
    console.error('Error fetching group permissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch group permissions' },
      { status: 500 }
    );
  }
}
