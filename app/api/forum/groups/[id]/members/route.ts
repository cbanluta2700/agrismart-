import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// Schema for adding a member
const memberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['MEMBER', 'MODERATOR', 'ADMIN']).default('MEMBER'),
});

// Schema for updating a member's role
const updateMemberSchema = z.object({
  role: z.enum(['MEMBER', 'MODERATOR', 'ADMIN']),
});

interface RouteParams {
  params: {
    id: string;
  };
}

// GET all members of a group
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = params;
  
  try {
    // Check if group exists
    const group = await prisma.group.findUnique({
      where: { id },
      select: { id: true },
    });
    
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    
    // Fetch all members of the group
    const members = await prisma.groupMember.findMany({
      where: { groupId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            email: true,
          },
        },
      },
      orderBy: {
        role: 'asc',
      },
    });
    
    return NextResponse.json(members);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to fetch group members' },
      { status: 500 }
    );
  }
}

// POST add a new member to the group
export async function POST(request: Request, { params }: RouteParams) {
  const { id } = params;
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Verify group exists and user has permission to add members
    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          where: {
            userId: session.user.id,
            role: { in: ['ADMIN', 'MODERATOR'] },
          },
        },
      },
    });
    
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    
    // Check if user has permission (is owner, admin, or moderator)
    const isAdmin = session.user.roles?.includes('ADMIN');
    const canManageMembers = group.ownerId === session.user.id || 
                            group.members.length > 0 || 
                            isAdmin;
                            
    if (!canManageMembers) {
      return NextResponse.json(
        { error: 'Insufficient permissions to add members' },
        { status: 403 }
      );
    }
    
    // Parse and validate member data
    const json = await request.json();
    const validatedData = memberSchema.parse(json);
    
    // Check if member already exists in the group
    const existingMember = await prisma.groupMember.findFirst({
      where: {
        groupId: id,
        userId: validatedData.userId,
      },
    });
    
    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this group' },
        { status: 400 }
      );
    }
    
    // Add the member to the group
    const member = await prisma.groupMember.create({
      data: {
        groupId: id,
        userId: validatedData.userId,
        role: validatedData.role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });
    
    return NextResponse.json(member);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to add member to group' },
      { status: 500 }
    );
  }
}
