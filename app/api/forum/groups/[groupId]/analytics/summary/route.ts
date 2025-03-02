import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { subDays } from 'date-fns';

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
    let previousStartDate: Date;
    
    switch (period) {
      case '7d':
        startDate = subDays(now, 7);
        previousStartDate = subDays(startDate, 7);
        break;
      case '30d':
        startDate = subDays(now, 30);
        previousStartDate = subDays(startDate, 30);
        break;
      case '90d':
        startDate = subDays(now, 90);
        previousStartDate = subDays(startDate, 90);
        break;
      case 'all':
        // Get group creation date
        const group = await prisma.group.findUnique({
          where: { id: groupId },
          select: { createdAt: true }
        });
        startDate = group?.createdAt || subDays(now, 365);
        previousStartDate = startDate; // No previous period for "all"
        break;
      default:
        startDate = subDays(now, 7);
        previousStartDate = subDays(startDate, 7);
    }
    
    // Get active members (members who have generated analytics events)
    const [activeMembers, previousActiveMembers] = await Promise.all([
      getActiveMemberCount(groupId, startDate),
      getActiveMemberCount(groupId, previousStartDate, startDate)
    ]);
    
    // Get new members
    const [newMembers, previousNewMembers] = await Promise.all([
      getNewMemberCount(groupId, startDate),
      getNewMemberCount(groupId, previousStartDate, startDate)
    ]);
    
    // Get post count
    const [posts, previousPosts] = await Promise.all([
      getPostCount(groupId, startDate),
      getPostCount(groupId, previousStartDate, startDate)
    ]);
    
    // Calculate engagement rate
    const allMembers = await prisma.groupMember.count({
      where: { groupId }
    });
    
    const engagementRate = allMembers > 0 
      ? Math.round((activeMembers / allMembers) * 100) 
      : 0;
    
    const previousEngagementRate = allMembers > 0 
      ? Math.round((previousActiveMembers / allMembers) * 100) 
      : 0;
    
    // Calculate changes
    const activeMembersChange = calculatePercentChange(previousActiveMembers, activeMembers);
    const newMembersChange = calculatePercentChange(previousNewMembers, newMembers);
    const postsChange = calculatePercentChange(previousPosts, posts);
    const engagementRateChange = engagementRate - previousEngagementRate;
    
    return NextResponse.json({
      activeMembers,
      activeMembersChange,
      newMembers,
      newMembersChange,
      posts,
      postsChange,
      engagementRate,
      engagementRateChange,
      totalMembers: allMembers
    });
  } catch (error) {
    console.error('Error fetching group summary analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch group analytics summary' },
      { status: 500 }
    );
  }
}

// Helper function to get active member count
async function getActiveMemberCount(groupId: string, startDate: Date, endDate?: Date) {
  const whereClause: any = {
    groupId,
    createdAt: { gte: startDate }
  };
  
  if (endDate) {
    whereClause.createdAt.lt = endDate;
  }
  
  const activeUsers = await prisma.analyticsEvent.groupBy({
    by: ['userId'],
    where: whereClause
  });
  
  return activeUsers.length;
}

// Helper function to get new member count
async function getNewMemberCount(groupId: string, startDate: Date, endDate?: Date) {
  const whereClause: any = {
    groupId,
    joinedAt: { gte: startDate }
  };
  
  if (endDate) {
    whereClause.joinedAt.lt = endDate;
  }
  
  return prisma.groupMember.count({
    where: whereClause
  });
}

// Helper function to get post count
async function getPostCount(groupId: string, startDate: Date, endDate?: Date) {
  const whereClause: any = {
    groupId,
    createdAt: { gte: startDate }
  };
  
  if (endDate) {
    whereClause.createdAt.lt = endDate;
  }
  
  return prisma.forumPost.count({
    where: whereClause
  });
}

// Helper function to calculate percent change
function calculatePercentChange(previous: number, current: number) {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  
  return Math.round(((current - previous) / previous) * 100);
}
