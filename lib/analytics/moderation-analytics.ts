import { prisma } from '@/lib/prisma';
import { ResourceStatus, ResourceType } from '@prisma/client';
import { parseISO } from 'date-fns';
import { webVitals, track } from '@vercel/analytics';
import { env } from '@/env.mjs';

/**
 * Interface for moderation activity summary
 */
export interface ModerationActivitySummary {
  total: number;
  approved: number;
  rejected: number;
  archived: number;
  featured: number;
  pending: number;
  byType?: Record<string, number>;
  byModerator?: Record<string, number>;
}

/**
 * Interface for moderation time period
 */
export interface ModerationTimePeriod {
  startDate: Date;
  endDate: Date;
  label: string;
}

/**
 * Interface for moderation trend data point
 */
export interface ModerationTrendDataPoint {
  date: string;
  approved: number;
  rejected: number;
  archived: number;
  featured: number;
  pending: number;
  total: number;
}

/**
 * Interface for moderation analytics query parameters
 */
export interface ModerationAnalyticsQueryParams {
  from?: string;
  to?: string;
  contentType?: string;
}

/**
 * Track moderation analytics view in Vercel Analytics
 */
export function trackModerationAnalyticsView() {
  if (env.NEXT_PUBLIC_VERCEL_ANALYTICS_ID) {
    track('moderation_analytics_view');
  }
}

/**
 * Track moderation action in Vercel Analytics
 */
export function trackModerationAction(action: string, contentType: string) {
  if (env.NEXT_PUBLIC_VERCEL_ANALYTICS_ID) {
    track('moderation_action', {
      action,
      contentType
    });
  }
}

/**
 * Get summary of moderation analytics for the comment moderation system
 */
export async function getModerationAnalyticsSummary(params: ModerationAnalyticsQueryParams) {
  // Construct query filters
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
  
  // Get total number of items requiring moderation
  const totalItems = await prisma.moderatedContent.count({
    where: whereClause
  });
  
  // Get items by status
  const pendingItems = await prisma.moderatedContent.count({
    where: {
      ...whereClause,
      moderationStatus: { in: ['PENDING', 'NEEDS_REVIEW'] }
    }
  });
  
  const approvedItems = await prisma.moderatedContent.count({
    where: {
      ...whereClause,
      moderationStatus: 'APPROVED'
    }
  });
  
  const rejectedItems = await prisma.moderatedContent.count({
    where: {
      ...whereClause,
      moderationStatus: 'REJECTED'
    }
  });
  
  const editedItems = await prisma.moderatedContent.count({
    where: {
      ...whereClause,
      moderationStatus: 'EDITED'
    }
  });
  
  const autoApprovedItems = await prisma.moderatedContent.count({
    where: {
      ...whereClause,
      moderationStatus: 'AUTO_APPROVED'
    }
  });
  
  // Calculate average response time
  // Find completed moderation logs and calculate time from creation to action
  const moderationLogs = await prisma.moderationLog.findMany({
    where: {
      ...whereClause,
      action: { in: ['APPROVE', 'REJECT', 'EDIT'] }
    },
    select: {
      contentCreatedAt: true,
      createdAt: true
    }
  });
  
  let totalResponseTimeHours = 0;
  let logsWithResponseTime = 0;
  
  for (const log of moderationLogs) {
    if (log.contentCreatedAt) {
      const responseTimeMs = log.createdAt.getTime() - log.contentCreatedAt.getTime();
      const responseTimeHours = responseTimeMs / (1000 * 60 * 60);
      totalResponseTimeHours += responseTimeHours;
      logsWithResponseTime++;
    }
  }
  
  const averageResponseTime = logsWithResponseTime > 0 
    ? totalResponseTimeHours / logsWithResponseTime 
    : 0;
  
  // Return the summary
  return {
    totalItems,
    pendingItems,
    approvedItems,
    rejectedItems,
    editedItems,
    autoApprovedItems,
    averageResponseTime
  };
}

/**
 * Get moderation activity summary for a specific period
 */
export async function getModerationActivitySummary(
  startDate: Date,
  endDate: Date
): Promise<ModerationActivitySummary> {
  // Get total moderation actions for the period
  const totalActions = await prisma.resourceModerationLog.count({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });

  // Get counts by action type
  const actionCounts = await prisma.$transaction([
    prisma.resourceModerationLog.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        action: 'approve'
      }
    }),
    prisma.resourceModerationLog.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        action: 'reject'
      }
    }),
    prisma.resourceModerationLog.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        action: 'archive'
      }
    }),
    prisma.resourceModerationLog.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        action: 'feature'
      }
    })
  ]);

  // Get count of pending items
  const pendingItems = await prisma.resource.count({
    where: {
      status: ResourceStatus.PENDING,
      createdAt: { lte: endDate }
    }
  });

  // Get counts by resource type
  const resourceTypeCounts = await prisma.resourceModerationLog.groupBy({
    by: ['resourceType'],
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    _count: true
  });

  // Get counts by moderator
  const moderatorCounts = await prisma.resourceModerationLog.groupBy({
    by: ['moderatorId'],
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    _count: true
  });

  // Get moderator details for mapping IDs to names
  const moderators = await prisma.user.findMany({
    where: {
      id: {
        in: moderatorCounts.map(item => item.moderatorId)
      }
    },
    select: {
      id: true,
      name: true
    }
  });

  // Map moderator IDs to names and count
  const byModerator: Record<string, number> = {};
  moderatorCounts.forEach(item => {
    const moderator = moderators.find(m => m.id === item.moderatorId);
    const name = moderator?.name || `Moderator ${item.moderatorId.substring(0, 6)}`;
    byModerator[name] = item._count;
  });

  // Map resource types to counts
  const byType: Record<string, number> = {};
  resourceTypeCounts.forEach(item => {
    byType[item.resourceType || 'Unknown'] = item._count;
  });

  return {
    total: totalActions,
    approved: actionCounts[0],
    rejected: actionCounts[1],
    archived: actionCounts[2],
    featured: actionCounts[3],
    pending: pendingItems,
    byType,
    byModerator
  };
}

/**
 * Get moderation trend data for a specific period with the specified interval
 * @param startDate Start date for the period
 * @param endDate End date for the period
 * @param interval Interval for data points ('day', 'week', 'month')
 */
export async function getModerationTrends(
  startDate: Date,
  endDate: Date,
  interval: 'day' | 'week' | 'month' = 'day'
): Promise<ModerationTrendDataPoint[]> {
  // Generate date intervals
  const dateIntervals: { start: Date; end: Date; label: string }[] = [];
  
  let currentDate = new Date(startDate);
  
  while (currentDate < endDate) {
    const intervalStart = new Date(currentDate);
    let intervalEnd: Date;
    
    if (interval === 'day') {
      intervalEnd = new Date(currentDate);
      intervalEnd.setDate(intervalEnd.getDate() + 1);
      intervalEnd.setMilliseconds(intervalEnd.getMilliseconds() - 1);
    } else if (interval === 'week') {
      intervalEnd = new Date(currentDate);
      intervalEnd.setDate(intervalEnd.getDate() + 7);
      intervalEnd.setMilliseconds(intervalEnd.getMilliseconds() - 1);
    } else { // month
      intervalEnd = new Date(currentDate);
      intervalEnd.setMonth(intervalEnd.getMonth() + 1);
      intervalEnd.setMilliseconds(intervalEnd.getMilliseconds() - 1);
    }
    
    // Cap at end date
    if (intervalEnd > endDate) {
      intervalEnd = new Date(endDate);
    }
    
    dateIntervals.push({
      start: intervalStart,
      end: intervalEnd,
      label: formatDateLabel(intervalStart, interval)
    });
    
    // Move to next interval
    if (interval === 'day') {
      currentDate.setDate(currentDate.getDate() + 1);
    } else if (interval === 'week') {
      currentDate.setDate(currentDate.getDate() + 7);
    } else { // month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
  }
  
  // Get data for each interval
  const result: ModerationTrendDataPoint[] = [];
  
  for (const interval of dateIntervals) {
    const summary = await getModerationActivitySummary(interval.start, interval.end);
    
    result.push({
      date: interval.label,
      approved: summary.approved,
      rejected: summary.rejected,
      archived: summary.archived,
      featured: summary.featured,
      pending: summary.pending,
      total: summary.total
    });
  }
  
  return result;
}

/**
 * Get common time periods for moderation analytics
 */
export function getModerationTimePeriods(): ModerationTimePeriod[] {
  const now = new Date();
  
  // Today
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  
  // Yesterday
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  
  // Last 7 days
  const lastWeekStart = new Date(todayStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  
  // Last 30 days
  const lastMonthStart = new Date(todayStart);
  lastMonthStart.setDate(lastMonthStart.getDate() - 30);
  
  // Last 90 days
  const lastQuarterStart = new Date(todayStart);
  lastQuarterStart.setDate(lastQuarterStart.getDate() - 90);
  
  return [
    {
      startDate: todayStart,
      endDate: now,
      label: 'Today'
    },
    {
      startDate: yesterdayStart,
      endDate: todayStart,
      label: 'Yesterday'
    },
    {
      startDate: lastWeekStart,
      endDate: now,
      label: 'Last 7 Days'
    },
    {
      startDate: lastMonthStart,
      endDate: now,
      label: 'Last 30 Days'
    },
    {
      startDate: lastQuarterStart,
      endDate: now,
      label: 'Last 90 Days'
    }
  ];
}

/**
 * Get resource distribution by status
 */
export async function getResourceStatusDistribution(): Promise<Record<string, number>> {
  const statuses = Object.values(ResourceStatus);
  const distribution: Record<string, number> = {};
  
  for (const status of statuses) {
    const count = await prisma.resource.count({
      where: { status }
    });
    
    distribution[status] = count;
  }
  
  return distribution;
}

/**
 * Get resource distribution by type
 */
export async function getResourceTypeDistribution(): Promise<Record<string, number>> {
  const types = Object.values(ResourceType);
  const distribution: Record<string, number> = {};
  
  for (const type of types) {
    const count = await prisma.resource.count({
      where: { type }
    });
    
    distribution[type] = count;
  }
  
  return distribution;
}

/**
 * Get moderation performance metrics by moderator
 */
export async function getModeratorPerformanceMetrics(
  startDate: Date,
  endDate: Date
): Promise<Array<{
  moderatorId: string;
  moderatorName: string;
  totalActions: number;
  actionsPerDay: number;
  averageResponseTime: number | null;
}>> {
  // Get all moderator IDs from the logs
  const moderatorIds = await prisma.resourceModerationLog.groupBy({
    by: ['moderatorId'],
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });
  
  // Get moderator details
  const moderators = await prisma.user.findMany({
    where: {
      id: {
        in: moderatorIds.map(item => item.moderatorId)
      }
    },
    select: {
      id: true,
      name: true
    }
  });
  
  // Calculate days in period
  const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  
  // Get performance metrics for each moderator
  const result = [];
  
  for (const moderator of moderators) {
    // Get total actions
    const totalActions = await prisma.resourceModerationLog.count({
      where: {
        moderatorId: moderator.id,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });
    
    // Calculate actions per day
    const actionsPerDay = totalActions / days;
    
    // Calculate average response time (if available)
    // This assumes there's a way to track when a resource was submitted and when it was moderated
    const averageResponseTime = null; // This would require additional implementation
    
    result.push({
      moderatorId: moderator.id,
      moderatorName: moderator.name || `Moderator ${moderator.id.substring(0, 6)}`,
      totalActions,
      actionsPerDay: parseFloat(actionsPerDay.toFixed(2)),
      averageResponseTime
    });
  }
  
  // Sort by total actions descending
  return result.sort((a, b) => b.totalActions - a.totalActions);
}

/**
 * Format a date as a label based on the interval
 */
function formatDateLabel(date: Date, interval: 'day' | 'week' | 'month'): string {
  if (interval === 'day') {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  } else if (interval === 'week') {
    return `Week of ${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  } else { // month
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  }
}
