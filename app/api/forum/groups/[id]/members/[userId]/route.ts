import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// Schema for updating a member's role
const updateMemberSchema = z.object({
  role: z.enum(['MEMBER', 'MODERATOR', 'ADMIN']),
});

interface RouteParams {
  params: {
    id: string;
    userId: string;
  };
}

// PUT update a member's role
export async function PUT(request: Request, { params }: RouteParams) {
  const { id, userId } = params;
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Verify group exists
    const group = await prisma.group.findUnique({
      where: { id },
      select: { ownerId: true },
    });
    
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    
    // Check if current user is the owner or an admin
    const isAdmin = session.user.roles?.includes('ADMIN');
    if (group.ownerId !== session.user.id && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Find the member to update
    const member = await prisma.groupMember.findFirst({
      where: {
        groupId: id,
        userId,
      },
    });
    
    if (!member) {
      return NextResponse.json(
        { error: 'User is not a member of this group' },
        { status: 404 }
      );
    }
    
    // Parse and validate update data
    const json = await request.json();
    const validatedData = updateMemberSchema.parse(json);
    
    // Update the member's role
    const updatedMember = await prisma.groupMember.update({
      where: { id: member.id },
      data: { role: validatedData.role },
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
    
    return NextResponse.json(updatedMember);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to update member role' },
      { status: 500 }
    );
  }
}

// DELETE remove a member from the group
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id, userId } = params;
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Verify group exists
    const group = await prisma.group.findUnique({
      where: { id },
      select: { ownerId: true },
    });
    
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    
    // Find the member to remove
    const member = await prisma.groupMember.findFirst({
      where: {
        groupId: id,
        userId,
      },
    });
    
    if (!member) {
      return NextResponse.json(
        { error: 'User is not a member of this group' },
        { status: 404 }
      );
    }
    
    // Check permissions:
    // 1. Group owner can remove anyone
    // 2. Admins can remove anyone except the owner
    // 3. Moderators can remove regular members
    // 4. Users can remove themselves
    
    const requesterRole = session.user.id === group.ownerId 
      ? 'OWNER' 
      : await prisma.groupMember.findFirst({
          where: {
            groupId: id,
            userId: session.user.id,
          },
          select: { role: true },
        }).then(m => m?.role || null);
    
    const isAdmin = session.user.roles?.includes('ADMIN');
    const isSelfRemoval = session.user.id === userId;
    
    // Owner cannot be removed except by platform admin
    if (userId === group.ownerId && !isAdmin) {
      return NextResponse.json(
        { error: 'Group owner cannot be removed' },
        { status: 403 }
      );
    }
    
    // Check if user has permission to remove the member
    const canRemoveMember = 
      isAdmin || 
      isSelfRemoval || 
      requesterRole === 'OWNER' || 
      (requesterRole === 'ADMIN' && member.role !== 'ADMIN') || 
      (requesterRole === 'MODERATOR' && member.role === 'MEMBER');
    
    if (!canRemoveMember) {
      return NextResponse.json(
        { error: 'Insufficient permissions to remove this member' },
        { status: 403 }
      );
    }
    
    // Remove the member
    await prisma.groupMember.delete({
      where: { id: member.id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to remove member from group' },
      { status: 500 }
    );
  }
}
