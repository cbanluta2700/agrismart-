import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const updateReportSchema = z.object({
  status: z.enum(['PENDING', 'RESOLVED', 'DISMISSED']),
  resolution: z.string().optional()
});

// Get a specific report
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) return new Response('Unauthorized', { status: 401 });

    const report = await prisma.report.findUnique({
      where: { id: params.id },
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
      }
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Check if user has permission to view this report
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: report.groupId,
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

    // Fetch additional information based on the report type
    let reportedContent = null;

    if (report.itemType === 'POST') {
      reportedContent = await prisma.forumPost.findUnique({
        where: { id: report.itemId },
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
          author: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
    } else if (report.itemType === 'COMMENT') {
      reportedContent = await prisma.comment.findUnique({
        where: { id: report.itemId },
        select: {
          id: true,
          content: true,
          createdAt: true,
          author: {
            select: {
              id: true,
              name: true
            }
          },
          post: {
            select: {
              id: true,
              title: true
            }
          }
        }
      });
    } else if (report.itemType === 'USER') {
      reportedContent = await prisma.user.findUnique({
        where: { id: report.itemId },
        select: {
          id: true,
          name: true,
          avatar: true,
          bio: true
        }
      });
    }

    return NextResponse.json({
      ...report,
      reportedContent
    });
  } catch (error) {
    console.error('[REPORT_GET_BY_ID]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update a report's status
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) return new Response('Unauthorized', { status: 401 });

    const body = await request.json();
    
    // Validate request body
    const validation = updateReportSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { status, resolution } = validation.data;

    // Get the report
    const report = await prisma.report.findUnique({
      where: { id: params.id },
      include: {
        group: true
      }
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Verify user is a moderator or admin of the related group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: report.groupId,
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

    // Update the report
    const updatedReport = await prisma.report.update({
      where: { id: params.id },
      data: {
        status,
        resolution: resolution || null,
        resolvedById: userId,
        updatedAt: new Date()
      },
      include: {
        reporter: {
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
        },
        group: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Create a moderation log entry
    await prisma.moderationLog.create({
      data: {
        action: `REPORT_${status}`,
        details: resolution ? `Report resolved with comment: ${resolution}` : `Report marked as ${status.toLowerCase()}`,
        itemType: 'REPORT',
        itemId: params.id,
        moderatorId: userId,
        groupId: report.groupId
      }
    });

    // Send notification to the reporter
    await prisma.notification.create({
      data: {
        userId: report.reporterId,
        type: 'REPORT_UPDATED',
        title: 'Your report has been reviewed',
        content: `Your report in ${report.group.name} has been marked as ${status.toLowerCase()}`,
        linkUrl: `/forum/groups/${report.groupId}`
      }
    });

    return NextResponse.json(updatedReport);
  } catch (error) {
    console.error('[REPORT_UPDATE]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete a report
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) return new Response('Unauthorized', { status: 401 });

    // Get the report
    const report = await prisma.report.findUnique({
      where: { id: params.id },
      include: {
        group: true
      }
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Verify user is an admin of the related group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: report.groupId,
        userId,
        role: 'ADMIN'
      }
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied: Only group administrators can delete reports' },
        { status: 403 }
      );
    }

    // Delete the report
    await prisma.report.delete({
      where: { id: params.id }
    });

    // Create a moderation log entry
    await prisma.moderationLog.create({
      data: {
        action: 'REPORT_DELETED',
        details: 'Report permanently deleted from records',
        itemType: 'REPORT',
        itemId: params.id,
        moderatorId: userId,
        groupId: report.groupId
      }
    });

    return NextResponse.json({ success: true, message: 'Report deleted successfully' });
  } catch (error) {
    console.error('[REPORT_DELETE]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
