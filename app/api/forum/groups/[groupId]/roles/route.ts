import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

// Validation schema for role creation
const createRoleSchema = z.object({
  name: z.string().min(3).max(50),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'Must be a valid hex color code',
  }),
});

export async function GET(
  request: Request,
  { params }: { params: { groupId: string } }
) {
  const { groupId } = params;
  
  try {
    // Get session to check permissions
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is a member of the group
    const member = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: session.user.id,
      }
    });
    
    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get all group roles
    const roles = await prisma.groupRole.findMany({
      where: {
        groupId,
      },
      include: {
        permissions: {
          select: {
            permissionId: true,
          }
        },
        _count: {
          select: {
            members: true,
          }
        }
      },
      orderBy: {
        priority: 'desc',
      }
    });
    
    // Transform the data for the client
    const formattedRoles = roles.map(role => ({
      id: role.id,
      name: role.name,
      color: role.color,
      priority: role.priority,
      isDefault: role.isDefault,
      isOwner: role.isOwner,
      permissions: role.permissions.map(p => p.permissionId),
      memberCount: role._count.members,
    }));
    
    return NextResponse.json(formattedRoles);
  } catch (error) {
    console.error('Error fetching group roles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch group roles' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { groupId: string } }
) {
  const { groupId } = params;
  
  try {
    // Get session to check permissions
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is the group owner
    const member = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: session.user.id,
        role: 'OWNER',
      }
    });
    
    if (!member) {
      return NextResponse.json({ error: 'Only the group owner can create roles' }, { status: 403 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validatedData = createRoleSchema.parse(body);
    
    // Get the highest priority role to set new priority
    const highestPriorityRole = await prisma.groupRole.findFirst({
      where: {
        groupId,
        isOwner: false, // Exclude owner role
      },
      orderBy: {
        priority: 'desc',
      }
    });
    
    const newPriority = highestPriorityRole ? highestPriorityRole.priority + 1 : 1;
    
    // Create new role
    const newRole = await prisma.groupRole.create({
      data: {
        name: validatedData.name,
        color: validatedData.color,
        groupId,
        priority: newPriority,
        isDefault: false,
        isOwner: false,
      }
    });
    
    // Log the creation in moderation logs
    await prisma.moderationLog.create({
      data: {
        groupId,
        moderatorId: session.user.id,
        action: 'CREATE_ROLE',
        itemType: 'ROLE',
        itemId: newRole.id,
        reason: `Created new role: ${validatedData.name}`,
      }
    });
    
    // Track analytics event
    await prisma.analyticsEvent.create({
      data: {
        groupId,
        userId: session.user.id,
        type: 'ROLE_CREATED',
        data: JSON.stringify({
          roleId: newRole.id,
          roleName: newRole.name,
        }),
      }
    });
    
    return NextResponse.json(newRole, { status: 201 });
  } catch (error) {
    console.error('Error creating group role:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create group role' },
      { status: 500 }
    );
  }
}
