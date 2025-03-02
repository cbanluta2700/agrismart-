import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import analyticsService from '@/server/src/lib/services/analyticsService';

/**
 * Track an analytics event
 * POST /api/analytics
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    
    // Allow tracking without authentication but include user ID if available
    const data = await request.json();

    // Validate required fields
    if (!data.type || !data.entityType) {
      return NextResponse.json(
        { error: 'Missing required fields: type, entityType' },
        { status: 400 }
      );
    }

    // Track the event
    await analyticsService.trackEvent({
      ...data,
      userId: data.userId || userId, // Use provided userId or fallback to session
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking analytics event:', error);
    return NextResponse.json(
      { error: 'Failed to track analytics event' },
      { status: 500 }
    );
  }
}

/**
 * Get analytics data
 * GET /api/analytics?period=week&groupId=xyz
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is an admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') as 'day' | 'week' | 'month' | 'year') || 'week';
    const groupId = searchParams.get('groupId') || undefined;
    const dataType = searchParams.get('dataType') || 'overview';
    
    // Get different types of analytics data based on dataType
    switch (dataType) {
      case 'engagement':
        const metrics = await analyticsService.getEngagementMetrics(period, groupId);
        return NextResponse.json(metrics);
        
      case 'timeSeries':
        const timeSeries = await analyticsService.getActivityTimeSeries(period, groupId);
        return NextResponse.json(timeSeries);
        
      case 'topContent':
        const limit = parseInt(searchParams.get('limit') || '10', 10);
        const topContent = await analyticsService.getTopContent(period, groupId, limit);
        return NextResponse.json(topContent);
        
      case 'overview':
      default:
        // Get all data types for an overview
        const [engagementMetrics, activityData, content] = await Promise.all([
          analyticsService.getEngagementMetrics(period, groupId),
          analyticsService.getActivityTimeSeries(period, groupId),
          analyticsService.getTopContent(period, groupId, 5),
        ]);
        
        return NextResponse.json({
          engagement: engagementMetrics,
          activity: activityData,
          topContent: content,
        });
    }
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
