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
    
    // Get all group members
    const members = await prisma.groupMember.findMany({
      where: {
        groupId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: {
        joinedAt: 'asc'
      }
    });
    
    // Get new members within period
    const newMembers = members.filter(member => 
      new Date(member.joinedAt) >= startDate
    );
    
    // Prepare member growth data (daily)
    const memberGrowth = prepareGrowthData(newMembers, startDate, now);
    
    // Get user activity for top contributors
    const activityData = await prisma.analyticsEvent.groupBy({
      by: ['userId'],
      where: {
        groupId,
        createdAt: {
          gte: startDate
        },
        userId: {
          in: members.map(member => member.userId)
        }
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    });
    
    // Map user IDs to names for top contributors
    const memberMap = new Map(members.map(member => [member.userId, member.user.name]));
    
    const topContributors = activityData.map(item => ({
      id: item.userId,
      name: memberMap.get(item.userId) || 'Unknown User',
      count: item._count.id
    }));
    
    // Calculate activity distribution
    const allMemberIds = members.map(member => member.userId);
    
    // Get counts of active users by activity level
    const activityCounts = await Promise.all([
      // Very active (10+ activities)
      countMembersWithActivityLevel(groupId, allMemberIds, startDate, 10, null),
      // Active (5-9 activities)
      countMembersWithActivityLevel(groupId, allMemberIds, startDate, 5, 9),
      // Somewhat active (2-4 activities)
      countMembersWithActivityLevel(groupId, allMemberIds, startDate, 2, 4),
      // Barely active (1 activity)
      countMembersWithActivityLevel(groupId, allMemberIds, startDate, 1, 1),
      // Inactive (0 activities)
      countMembersWithActivityLevel(groupId, allMemberIds, startDate, 0, 0),
    ]);
    
    const activityDistribution = [
      { name: 'Very Active', value: activityCounts[0] },
      { name: 'Active', value: activityCounts[1] },
      { name: 'Somewhat Active', value: activityCounts[2] },
      { name: 'Barely Active', value: activityCounts[3] },
      { name: 'Inactive', value: activityCounts[4] },
    ];
    
    return NextResponse.json({
      memberGrowth,
      topContributors,
      activityDistribution,
      totalMembers: members.length,
      newMembers: newMembers.length,
    });
  } catch (error) {
    console.error('Error fetching group member analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch member analytics' },
      { status: 500 }
    );
  }
}

// Helper function to prepare growth data
function prepareGrowthData(members: any[], startDate: Date, endDate: Date) {
  const dailyCounts: Record<string, number> = {};
  
  // Initialize all dates with zero
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split('T')[0];
    dailyCounts[dateKey] = 0;
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Count members by join date
  members.forEach(member => {
    const joinDate = new Date(member.joinedAt).toISOString().split('T')[0];
    if (dailyCounts[joinDate] !== undefined) {
      dailyCounts[joinDate]++;
    }
  });
  
  // Convert to array
  return Object.entries(dailyCounts).map(([date, count]) => ({
    date,
    count,
  }));
}

// Helper function to count members with a specific activity level
async function countMembersWithActivityLevel(
  groupId: string,
  memberIds: string[],
  startDate: Date,
  minCount: number,
  maxCount: number | null
) {
  const activityCounts = await prisma.analyticsEvent.groupBy({
    by: ['userId'],
    where: {
      groupId,
      createdAt: {
        gte: startDate
      },
      userId: {
        in: memberIds
      }
    },
    _count: {
      id: true
    },
    having: {
      id: maxCount
        ? { _count: { gte: minCount, lte: maxCount } }
        : { _count: { gte: minCount } }
    }
  });
  
  if (minCount === 0) {
    // For inactive users, we need to find users with no activities
    const activeUserIds = activityCounts.map(a => a.userId);
    return memberIds.filter(id => !activeUserIds.includes(id)).length;
  }
  
  return activityCounts.length;
}
