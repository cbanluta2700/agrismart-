import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import prisma from '@/lib/prisma';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { userId } = auth();
    if (!userId) return new Response('Unauthorized', { status: 401 });

    const groupId = params.id;
    
    // Parse pagination parameters from URL
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Check if user is a moderator or admin of the group
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
      return new Response('Unauthorized', { status: 403 });
    }

    // Fetch moderation logs with pagination
    const [logs, totalCount] = await Promise.all([
      prisma.moderationLog.findMany({
        where: {
          groupId
        },
        include: {
          moderator: {
            select: {
              name: true,
              avatar: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip
      }),
      prisma.moderationLog.count({
        where: {
          groupId
        }
      })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages
      }
    });
  } catch (error) {
    console.error('[MODERATION_LOGS_GET]', error);
    return new Response('Internal Error', { status: 500 });
  }
}
