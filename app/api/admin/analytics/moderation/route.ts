import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getModerationAnalyticsSummary } from '@/lib/analytics/moderation-analytics';
import { cachedResponse, getCachedModerationAnalytics, cacheModerationAnalytics } from '@/lib/vercel/cache-control';
import { z } from 'zod';
import { startOfDay, endOfDay, eachDayOfInterval, format, parseISO, formatISO } from 'date-fns';

// Schema for query validation
const analyticsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  contentType: z.string().optional(),
});

// GET moderation analytics data
export async function GET(request: Request) {
  try {
    // Authenticate the request
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check for admin role
    const userRoles = await prisma.userRole.findMany({
      where: {
        userId: session.user.id,
        role: {
          in: ['ADMIN', 'SUPER_ADMIN', 'MODERATOR']
        }
      }
    });
    
    if (userRoles.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Parse the query parameters
    const { searchParams } = new URL(request.url);
    const params = {
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
      contentType: searchParams.get('contentType') || undefined,
    };
    
    // Validate the query parameters
    const validatedParams = analyticsQuerySchema.parse(params);
    
    // Generate cache key for this analytics query
    const cacheKey = generateAnalyticsCacheKey(validatedParams);
    
    // Try to get from cache first
    const cachedData = await getCachedModerationAnalytics(cacheKey);
    
    if (cachedData) {
      return cachedResponse(
        cachedData,
        { status: 200 },
        { duration: 'shortTerm', staleWhileRevalidate: true, allowPurge: true }
      );
    }
    
    // Get analytics data
    const analyticsData = await getModerationAnalyticsSummary(validatedParams);
    
    // Generate time series data
    const timeSeriesData = await generateTimeSeriesData(
      validatedParams.from ? parseISO(validatedParams.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      validatedParams.to ? parseISO(validatedParams.to) : new Date(),
      validatedParams.contentType
    );
    
    // Get content type distribution
    const contentTypeData = await getContentTypeDistribution(validatedParams);
    
    // Get action distribution
    const actionData = await getActionDistribution(validatedParams);
    
    // Get reviewer performance
    const reviewerData = await getReviewerPerformance(validatedParams);
    
    // Assemble complete data
    const completeData = {
      summary: analyticsData,
      timeSeries: timeSeriesData,
      contentTypes: contentTypeData,
      actions: actionData,
      reviewers: reviewerData
    };
    
    // Cache the data for future requests (5 minutes expiry)
    await cacheModerationAnalytics(cacheKey, completeData, 300);
    
    // Return the analytics data with cache control
    return cachedResponse(
      completeData,
      { status: 200 },
      { duration: 'shortTerm', staleWhileRevalidate: true, allowPurge: true }
    );
  } catch (error) {
    console.error('Error fetching moderation analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch moderation analytics data' },
      { status: 500 }
    );
  }
}

/**
 * Generate a consistent cache key for analytics queries
 */
function generateAnalyticsCacheKey(params: any): string {
  const from = params.from || 'default';
  const to = params.to || 'default';
  const contentType = params.contentType || 'ALL';
  
  return `summary:${from}:${to}:${contentType}`;
}

// Helper function to generate time series data
async function generateTimeSeriesData(
  from: Date,
  to: Date,
  contentType?: string
) {
  // Get all days in the interval
  const days = eachDayOfInterval({ start: from, end: to });
  
  // Initialize the result array
  const result = [];
  
  // For each day, fetch the count of items by status
  for (const day of days) {
    const startOfDayDate = startOfDay(day);
    const endOfDayDate = endOfDay(day);
    
    const whereClause: any = {
      createdAt: {
        gte: startOfDayDate,
        lte: endOfDayDate
      }
    };
    
    if (contentType && contentType !== 'ALL') {
      whereClause.contentType = contentType;
    }
    
    // Get counts for this day
    const pendingCount = await prisma.moderatedContent.count({
      where: {
        ...whereClause,
        moderationStatus: { in: ['PENDING', 'NEEDS_REVIEW'] }
      }
    });
    
    const approvedCount = await prisma.moderatedContent.count({
      where: {
        ...whereClause,
        moderationStatus: 'APPROVED'
      }
    });
    
    const rejectedCount = await prisma.moderatedContent.count({
      where: {
        ...whereClause,
        moderationStatus: 'REJECTED'
      }
    });
    
    const editedCount = await prisma.moderatedContent.count({
      where: {
        ...whereClause,
        moderationStatus: 'EDITED'
      }
    });
    
    const autoApprovedCount = await prisma.moderatedContent.count({
      where: {
        ...whereClause,
        moderationStatus: 'AUTO_APPROVED'
      }
    });
    
    result.push({
      date: format(day, 'yyyy-MM-dd'),
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      edited: editedCount,
      autoApproved: autoApprovedCount
    });
  }
  
  return result;
}

// Helper function to get content type distribution
async function getContentTypeDistribution(params: any) {
  const whereClause: any = {};
  
  if (params.from) {
    whereClause.createdAt = {
      ...whereClause.createdAt,
      gte: parseISO(params.from)
    };
  }
  
  if (params.to) {
    whereClause.createdAt = {
      ...whereClause.createdAt,
      lte: parseISO(params.to)
    };
  }
  
  if (params.contentType && params.contentType !== 'ALL') {
    whereClause.contentType = params.contentType;
  }
  
  // Get counts by content type
  const contentTypes = await prisma.moderatedContent.groupBy({
    by: ['contentType'],
    _count: {
      contentType: true
    },
    where: whereClause
  });
  
  return contentTypes.map(item => ({
    type: item.contentType,
    count: item._count.contentType
  }));
}

// Helper function to get action distribution
async function getActionDistribution(params: any) {
  const whereClause: any = {};
  
  if (params.from) {
    whereClause.createdAt = {
      ...whereClause.createdAt,
      gte: parseISO(params.from)
    };
  }
  
  if (params.to) {
    whereClause.createdAt = {
      ...whereClause.createdAt,
      lte: parseISO(params.to)
    };
  }
  
  if (params.contentType && params.contentType !== 'ALL') {
    whereClause.contentType = params.contentType;
  }
  
  // Get counts by moderation status
  const actions = await prisma.moderatedContent.groupBy({
    by: ['moderationStatus'],
    _count: {
      moderationStatus: true
    },
    where: whereClause
  });
  
  return actions.map(item => ({
    action: item.moderationStatus,
    count: item._count.moderationStatus
  }));
}

// Helper function to get reviewer performance
async function getReviewerPerformance(params: any) {
  const whereClause: any = {};
  
  if (params.from) {
    whereClause.createdAt = {
      ...whereClause.createdAt,
      gte: parseISO(params.from)
    };
  }
  
  if (params.to) {
    whereClause.createdAt = {
      ...whereClause.createdAt,
      lte: parseISO(params.to)
    };
  }
  
  if (params.contentType && params.contentType !== 'ALL') {
    whereClause.contentType = params.contentType;
    whereClause.action = params.contentType;
  }
  
  // Get moderation logs with moderator info
  const moderationLogs = await prisma.moderationLog.findMany({
    where: whereClause,
    include: {
      moderator: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });
  
  // Group by moderator and action
  const moderatorPerformance: Record<string, { name: string, approved: number, rejected: number, edited: number }> = {};
  
  for (const log of moderationLogs) {
    if (!log.moderator) continue;
    
    const moderatorId = log.moderator.id;
    
    if (!moderatorPerformance[moderatorId]) {
      moderatorPerformance[moderatorId] = {
        name: log.moderator.name || 'Unknown',
        approved: 0,
        rejected: 0,
        edited: 0
      };
    }
    
    if (log.action === 'APPROVE') {
      moderatorPerformance[moderatorId].approved++;
    } else if (log.action === 'REJECT') {
      moderatorPerformance[moderatorId].rejected++;
    } else if (log.action === 'EDIT') {
      moderatorPerformance[moderatorId].edited++;
    }
  }
  
  return Object.values(moderatorPerformance);
}

// Export config for Vercel Edge functions
export const config = {
  runtime: 'edge'
};
