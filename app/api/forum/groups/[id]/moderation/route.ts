import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// Schema for content moderation actions
const moderationActionSchema = z.object({
  action: z.enum(['HIDE', 'UNHIDE', 'LOCK', 'UNLOCK', 'PIN', 'UNPIN']),
  itemType: z.enum(['POST', 'COMMENT']),
  itemId: z.string().uuid(),
  reason: z.string().optional(),
});

// Schema for group setting updates
const groupSettingsSchema = z.object({
  allowJoinRequests: z.boolean().optional(),
  requireApproval: z.boolean().optional(),
  allowMemberPosts: z.boolean().optional(),
  isPrivate: z.boolean().optional(),
  rules: z.array(z.string()).optional(),
});

interface RouteParams {
  params: {
    id: string;
  };
}

// Check if a user has moderation permissions for a group
async function hasModeratorPermissions(userId: string, groupId: string) {
  const member = await prisma.groupMember.findFirst({
    where: {
      groupId,
      userId,
      role: { in: ['ADMIN', 'MODERATOR'] },
    },
  });
  
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { ownerId: true }
  });
  
  const isOwner = group?.ownerId === userId;
  const isGlobalAdmin = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: true }
  }).then(user => user?.roles?.includes('ADMIN'));
  
  return !!member || isOwner || !!isGlobalAdmin;
}

// GET moderation settings and stats for a group
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = params;
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Check if user has moderation permissions
    const canModerate = await hasModeratorPermissions(session.user.id, id);
    
    if (!canModerate) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    // Get group settings
    const groupSettings = await prisma.groupSettings.findUnique({
      where: { groupId: id },
    });
    
    // Get moderation stats
    const [totalPosts, hiddenPosts, lockedPosts, pinnedPosts, totalComments, hiddenComments] = await Promise.all([
      prisma.post.count({ where: { groupId: id } }),
      prisma.post.count({ where: { groupId: id, hidden: true } }),
      prisma.post.count({ where: { groupId: id, locked: true } }),
      prisma.post.count({ where: { groupId: id, pinned: true } }),
      prisma.comment.count({ where: { post: { groupId: id } } }),
      prisma.comment.count({ where: { post: { groupId: id }, hidden: true } }),
    ]);
    
    // Get recent moderation logs
    const moderationLogs = await prisma.moderationLog.findMany({
      where: { groupId: id },
      include: {
        moderator: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    
    return NextResponse.json({
      settings: groupSettings || {},
      stats: {
        totalPosts,
        hiddenPosts,
        lockedPosts,
        pinnedPosts,
        totalComments,
        hiddenComments,
      },
      recentActions: moderationLogs,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to fetch moderation data' },
      { status: 500 }
    );
  }
}

// POST perform a moderation action
export async function POST(request: Request, { params }: RouteParams) {
  const { id } = params;
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Check if user has moderation permissions
    const canModerate = await hasModeratorPermissions(session.user.id, id);
    
    if (!canModerate) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    // Parse and validate moderation action
    const json = await request.json();
    const validatedData = moderationActionSchema.parse(json);
    
    // Perform the requested action based on item type
    if (validatedData.itemType === 'POST') {
      // Check if post exists and belongs to this group
      const post = await prisma.post.findUnique({
        where: { id: validatedData.itemId },
        select: { id: true, groupId: true },
      });
      
      if (!post || post.groupId !== id) {
        return NextResponse.json(
          { error: 'Post not found in this group' },
          { status: 404 }
        );
      }
      
      // Apply the action to the post
      let updatedPost;
      switch (validatedData.action) {
        case 'HIDE':
          updatedPost = await prisma.post.update({
            where: { id: validatedData.itemId },
            data: { hidden: true },
          });
          break;
        case 'UNHIDE':
          updatedPost = await prisma.post.update({
            where: { id: validatedData.itemId },
            data: { hidden: false },
          });
          break;
        case 'LOCK':
          updatedPost = await prisma.post.update({
            where: { id: validatedData.itemId },
            data: { locked: true },
          });
          break;
        case 'UNLOCK':
          updatedPost = await prisma.post.update({
            where: { id: validatedData.itemId },
            data: { locked: false },
          });
          break;
        case 'PIN':
          updatedPost = await prisma.post.update({
            where: { id: validatedData.itemId },
            data: { pinned: true },
          });
          break;
        case 'UNPIN':
          updatedPost = await prisma.post.update({
            where: { id: validatedData.itemId },
            data: { pinned: false },
          });
          break;
      }
      
      // Log the moderation action
      await prisma.moderationLog.create({
        data: {
          groupId: id,
          moderatorId: session.user.id,
          action: validatedData.action,
          itemType: validatedData.itemType,
          itemId: validatedData.itemId,
          reason: validatedData.reason,
        },
      });
      
      return NextResponse.json({
        success: true,
        post: updatedPost,
      });
    } else if (validatedData.itemType === 'COMMENT') {
      // Check if comment exists and belongs to a post in this group
      const comment = await prisma.comment.findUnique({
        where: { id: validatedData.itemId },
        include: {
          post: {
            select: { groupId: true },
          },
        },
      });
      
      if (!comment || comment.post.groupId !== id) {
        return NextResponse.json(
          { error: 'Comment not found in this group' },
          { status: 404 }
        );
      }
      
      // Apply the action to the comment
      let updatedComment;
      switch (validatedData.action) {
        case 'HIDE':
          updatedComment = await prisma.comment.update({
            where: { id: validatedData.itemId },
            data: { hidden: true },
          });
          break;
        case 'UNHIDE':
          updatedComment = await prisma.comment.update({
            where: { id: validatedData.itemId },
            data: { hidden: false },
          });
          break;
        default:
          return NextResponse.json(
            { error: `Action '${validatedData.action}' not supported for comments` },
            { status: 400 }
          );
      }
      
      // Log the moderation action
      await prisma.moderationLog.create({
        data: {
          groupId: id,
          moderatorId: session.user.id,
          action: validatedData.action,
          itemType: validatedData.itemType,
          itemId: validatedData.itemId,
          reason: validatedData.reason,
        },
      });
      
      return NextResponse.json({
        success: true,
        comment: updatedComment,
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid item type' },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to perform moderation action' },
      { status: 500 }
    );
  }
}

// PUT update group settings
export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = params;
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Check if user has admin permissions for the group
    const group = await prisma.group.findUnique({
      where: { id },
      select: { ownerId: true },
    });
    
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    
    const member = await prisma.groupMember.findFirst({
      where: {
        groupId: id,
        userId: session.user.id,
        role: 'ADMIN',
      },
    });
    
    const isOwner = group.ownerId === session.user.id;
    const isAdmin = member?.role === 'ADMIN' || session.user.roles?.includes('ADMIN');
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Only group owners and admins can update settings' },
        { status: 403 }
      );
    }
    
    // Parse and validate settings update
    const json = await request.json();
    const validatedData = groupSettingsSchema.parse(json);
    
    // Update or create group settings
    const settings = await prisma.groupSettings.upsert({
      where: { groupId: id },
      update: validatedData,
      create: {
        groupId: id,
        ...validatedData,
      },
    });
    
    return NextResponse.json(settings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to update group settings' },
      { status: 500 }
    );
  }
}
