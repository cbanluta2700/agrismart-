import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { format, subDays, parseISO } from 'date-fns';

export async function GET(
  request: Request,
  { params }: { params: { groupId: string } }
) {
  const { groupId } = params;
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || '7d';
  
  try {
    // Get session to check permissions
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is group owner or moderator
    const groupMember = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: session.user.id,
        role: { in: ['OWNER', 'MODERATOR'] }
      }
    });
    
    if (!groupMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case '7d':
        startDate = subDays(now, 7);
        break;
      case '30d':
        startDate = subDays(now, 30);
        break;
      case '90d':
        startDate = subDays(now, 90);
        break;
      case 'all':
        // Get group creation date
        const group = await prisma.group.findUnique({
          where: { id: groupId },
          select: { createdAt: true }
        });
        startDate = group?.createdAt || subDays(now, 365);
        break;
      default:
        startDate = subDays(now, 7);
    }
    
    // Query posts over time
    const posts = await prisma.forumPost.findMany({
      where: {
        groupId,
        createdAt: {
          gte: startDate
        }
      },
      orderBy: {
        createdAt: 'asc'
      },
      select: {
        id: true,
        createdAt: true
      }
    });
    
    // Get comments over time (using analytics events for demonstration)
    const commentEvents = await prisma.analyticsEvent.findMany({
      where: {
        groupId,
        type: 'COMMENT_CREATED',
        createdAt: {
          gte: startDate
        }
      },
      orderBy: {
        createdAt: 'asc'
      },
      select: {
        createdAt: true
      }
    });
    
    // Get engagement by type
    const engagementEvents = await prisma.analyticsEvent.findMany({
      where: {
        groupId,
        type: {
          in: ['POST_VIEW', 'POST_LIKE', 'COMMENT_LIKE', 'COMMENT_CREATED', 'POST_SHARE']
        },
        createdAt: {
          gte: startDate
        }
      },
      select: {
        type: true
      }
    });
    
    // Process data for visualization
    
    // Posts over time
    const postsOverTime = processDailyData(posts, startDate, now);
    
    // Comments over time
    const commentsOverTime = processDailyData(commentEvents, startDate, now);
    
    // Engagement by type
    const engagementCounts = engagementEvents.reduce((acc: Record<string, number>, event) => {
      const type = formatEngagementType(event.type);
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    
    const engagementByType = Object.entries(engagementCounts).map(([type, count]) => ({
      type,
      count,
    }));
    
    return NextResponse.json({
      postsOverTime,
      commentsOverTime,
      engagementByType,
    });
  } catch (error) {
    console.error('Error fetching group activity analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch group analytics' },
      { status: 500 }
    );
  }
}

// Helper function to process daily data
function processDailyData(events: any[], startDate: Date, endDate: Date) {
  // Create a map of dates to counts
  const dateMap = new Map<string, number>();
  
  // Initialize with all dates in range
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    dateMap.set(dateStr, 0);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Count events by date
  events.forEach(event => {
    const dateStr = format(new Date(event.createdAt), 'yyyy-MM-dd');
    if (dateMap.has(dateStr)) {
      dateMap.set(dateStr, dateMap.get(dateStr)! + 1);
    }
  });
  
  // Convert map to array
  return Array.from(dateMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));
}

// Helper function to format engagement type for display
function formatEngagementType(type: string) {
  switch (type) {
    case 'POST_VIEW':
      return 'Views';
    case 'POST_LIKE':
      return 'Post Likes';
    case 'COMMENT_LIKE':
      return 'Comment Likes';
    case 'COMMENT_CREATED':
      return 'Comments';
    case 'POST_SHARE':
      return 'Shares';
    default:
      return type;
  }
}
