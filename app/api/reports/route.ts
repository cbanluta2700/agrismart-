import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Schema for report creation validation
const reportSchema = z.object({
  reason: z.string().min(1).max(100),
  details: z.string().optional(),
  itemType: z.enum(['POST', 'COMMENT', 'USER']),
  itemId: z.string().uuid(),
  groupId: z.string().uuid()
});

export async function POST(request: Request) {
  try {
    const { userId } = auth();
    if (!userId) return new Response('Unauthorized', { status: 401 });

    const body = await request.json();
    
    // Validate request body
    const validation = reportSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { reason, details, itemType, itemId, groupId } = validation.data;

    // Verify the group exists
    const group = await prisma.group.findUnique({
      where: { id: groupId }
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Verify that the content being reported exists
    if (itemType === 'POST') {
      const post = await prisma.forumPost.findUnique({
        where: { id: itemId }
      });
      if (!post) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      }
    } else if (itemType === 'COMMENT') {
      const comment = await prisma.comment.findUnique({
        where: { id: itemId }
      });
      if (!comment) {
        return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
      }
    } else if (itemType === 'USER') {
      const user = await prisma.user.findUnique({
        where: { id: itemId }
      });
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }

    // Create the report
    const report = await prisma.report.create({
      data: {
        reason,
        details,
        itemType,
        itemId,
        reporterId: userId,
        groupId
      }
    });

    // Notify group moderators about the new report
    const groupModerators = await prisma.groupMember.findMany({
      where: {
        groupId,
        role: {
          in: ['ADMIN', 'MODERATOR']
        }
      },
      select: {
        userId: true
      }
    });

    // Create notifications for all moderators
    if (groupModerators.length > 0) {
      await prisma.notification.createMany({
        data: groupModerators.map(moderator => ({
          userId: moderator.userId,
          type: 'REPORT_CREATED',
          title: 'New content report',
          content: `A new report has been submitted in ${group.name}`,
          linkUrl: `/forum/groups/${groupId}/moderation?tab=reports&reportId=${report.id}`
        }))
      });
    }

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error('[REPORT_POST]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { userId } = auth();
    if (!userId) return new Response('Unauthorized', { status: 401 });

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build filters
    const filters: any = {};

    if (groupId) {
      // Verify user is a moderator or admin of the group
      const membership = await prisma.groupMember.findFirst({
        where: {
          groupId,
          userId,
          role: {
            in: ['ADMIN', 'MODERATOR']
          }
        }
      });

      if (!membership) {
        return NextResponse.json(
          { error: 'Access denied: You are not a moderator of this group' },
          { status: 403 }
        );
      }

      filters.groupId = groupId;
    } else {
      // If no groupId provided, only show reports from groups where user is a moderator
      const moderatedGroups = await prisma.groupMember.findMany({
        where: {
          userId,
          role: {
            in: ['ADMIN', 'MODERATOR']
          }
        },
        select: {
          groupId: true
        }
      });

      if (moderatedGroups.length === 0) {
        return NextResponse.json({
          reports: [],
          pagination: {
            page,
            limit,
            totalPages: 0,
            totalItems: 0
          }
        });
      }

      filters.groupId = {
        in: moderatedGroups.map(g => g.groupId)
      };
    }

    // Add status filter if provided
    if (status && ['PENDING', 'RESOLVED', 'DISMISSED'].includes(status)) {
      filters.status = status;
    }

    // Fetch reports with pagination
    const [reports, totalCount] = await Promise.all([
      prisma.report.findMany({
        where: filters,
        include: {
          reporter: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          },
          group: {
            select: {
              id: true,
              name: true
            }
          },
          resolvedBy: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.report.count({
        where: filters
      })
    ]);

    return NextResponse.json({
      reports,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount
      }
    });
  } catch (error) {
    console.error('[REPORT_GET]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
