import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// Schema for group updates
const groupUpdateSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().optional(),
});

interface RouteParams {
  params: {
    id: string;
  };
}

// GET a single group by ID with its details
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = params;
  
  try {
    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
    });
    
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    
    return NextResponse.json(group);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to fetch group' },
      { status: 500 }
    );
  }
}

// PUT (update) a group
export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = params;
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Verify group exists and user is the owner
    const existingGroup = await prisma.group.findUnique({
      where: { id },
      select: { ownerId: true },
    });
    
    if (!existingGroup) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    
    if (existingGroup.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Parse and validate update data
    const json = await request.json();
    const validatedData = groupUpdateSchema.parse(json);
    
    // Update the group
    const updatedGroup = await prisma.group.update({
      where: { id },
      data: validatedData,
    });
    
    return NextResponse.json(updatedGroup);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to update group' },
      { status: 500 }
    );
  }
}

// DELETE a group
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = params;
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Verify group exists and user is the owner or an admin
    const existingGroup = await prisma.group.findUnique({
      where: { id },
      select: { ownerId: true },
    });
    
    if (!existingGroup) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    
    // Check if user is authorized to delete the group
    const isAdmin = session.user.roles?.includes('ADMIN');
    if (existingGroup.ownerId !== session.user.id && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Delete the group and all associated memberships
    // Note: This doesn't delete posts in the group, posts will remain but without a group
    await prisma.$transaction([
      prisma.groupMember.deleteMany({ where: { groupId: id } }),
      prisma.group.delete({ where: { id } }),
    ]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to delete group' },
      { status: 500 }
    );
  }
}
