import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { groupId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) return new Response('Unauthorized', { status: 401 });
    
    // Check if user is a moderator or admin of the group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: params.groupId,
        userId,
        role: {
          in: ['ADMIN', 'MODERATOR', 'OWNER']
        }
      }
    });

    if (!membership) {
      return new Response('Unauthorized', { status: 403 });
    }

    // Fetch group settings
    const settings = await prisma.groupSettings.findUnique({
      where: {
        groupId: params.groupId
      }
    });

    if (!settings) {
      return new Response('Settings not found', { status: 404 });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('[GROUP_SETTINGS_GET]', error);
    return new Response('Internal Error', { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { groupId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) return new Response('Unauthorized', { status: 401 });

    const body = await request.json();
    
    // Verify user is group owner
    const group = await prisma.group.findUnique({
      where: { id: params.groupId },
      select: { ownerId: true }
    });

    if (group?.ownerId !== userId) {
      return new Response('Unauthorized', { status: 403 });
    }

    const updatedSettings = await prisma.groupSettings.update({
      where: { groupId: params.groupId },
      data: {
        allowJoinRequests: body.allowJoinRequests,
        requireApproval: body.requireApproval,
        allowMemberPosts: body.allowMemberPosts,
        isPrivate: body.isPrivate,
        rules: body.rules
      }
    });

    return NextResponse.json(updatedSettings);
  } catch (error) {
    console.error('[GROUP_SETTINGS_PUT]', error);
    return new Response('Internal Error', { status: 500 });
  }
}
