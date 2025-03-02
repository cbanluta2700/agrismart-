import prisma from '@/lib/prisma';
import NodeCache from 'node-cache';

// Cache configuration: keep items for 5 minutes by default
const analyticsCache = new NodeCache({ 
  stdTTL: 300, 
  checkperiod: 60,
  useClones: false
});

/**
 * Analytics service for tracking and analyzing user activities
 */
class AnalyticsService {
  // Cache keys
  private CACHE_KEYS = {
    ENGAGEMENT_METRICS: 'engagement_metrics',
    ACTIVITY_SERIES: 'activity_series',
    TOP_CONTENT: 'top_content',
    USER_ACTIVITY: 'user_activity',
    CONTENT_PERFORMANCE: 'content_performance',
  };

  /**
   * Track a user event in the analytics system
   */
  async trackEvent({
    type,
    entityType,
    entityId,
    userId,
    groupId,
    metadata = {}
  }: {
    type: string;
    entityType: string;
    entityId?: string;
    userId?: string;
    groupId?: string;
    metadata?: Record<string, any>;
  }) {
    try {
      const result = await prisma.analyticsEvent.create({
        data: {
          type: type as any,
          entityType,
          entityId,
          userId,
          groupId,
          metadata,
        },
      });
      
      // Invalidate related caches when new events are added
      this.invalidateRelatedCaches(type, groupId);
      
      return result;
    } catch (error) {
      console.error('Analytics tracking error:', error);
      // Failing silently - analytics errors should not affect user experience
    }
  }

  /**
   * Invalidate related caches when new data is added
   */
  private invalidateRelatedCaches(eventType: string, groupId?: string) {
    // Clear general caches
    analyticsCache.del(this.getCacheKey(this.CACHE_KEYS.ENGAGEMENT_METRICS, null));
    analyticsCache.del(this.getCacheKey(this.CACHE_KEYS.ACTIVITY_SERIES, null));
    
    // Clear group-specific caches if a groupId is provided
    if (groupId) {
      analyticsCache.del(this.getCacheKey(this.CACHE_KEYS.ENGAGEMENT_METRICS, groupId));
      analyticsCache.del(this.getCacheKey(this.CACHE_KEYS.ACTIVITY_SERIES, groupId));
      analyticsCache.del(this.getCacheKey(this.CACHE_KEYS.TOP_CONTENT, groupId));
    }
    
    // Clear specific event type related caches
    if (eventType === 'POST_VIEW' || eventType === 'POST_LIKE') {
      analyticsCache.del(this.getCacheKey(this.CACHE_KEYS.CONTENT_PERFORMANCE, null));
      if (groupId) {
        analyticsCache.del(this.getCacheKey(this.CACHE_KEYS.CONTENT_PERFORMANCE, groupId));
      }
    }
  }

  /**
   * Generate a cache key with proper namespacing
   */
  private getCacheKey(baseKey: string, groupId: string | null, additionalParams: Record<string, any> = {}) {
    let key = baseKey;
    if (groupId) key += `:group:${groupId}`;
    
    // Add any additional parameters to the cache key
    const paramKeys = Object.keys(additionalParams).sort();
    if (paramKeys.length > 0) {
      key += `:params:${paramKeys.map(k => `${k}=${additionalParams[k]}`).join(',')}`;
    }
    
    return key;
  }

  /**
   * Get engagement metrics for the entire platform or a specific group
   * with optimized query and caching
   */
  async getEngagementMetrics(
    period: 'day' | 'week' | 'month' | 'year' = 'month',
    groupId?: string
  ) {
    const cacheKey = this.getCacheKey(
      this.CACHE_KEYS.ENGAGEMENT_METRICS, 
      groupId || null, 
      { period }
    );
    
    // Check cache first
    const cachedResult = analyticsCache.get(cacheKey);
    if (cachedResult) {
      console.log(`[Analytics] Cache hit for engagement metrics: ${cacheKey}`);
      return cachedResult;
    }
    
    console.log(`[Analytics] Cache miss for engagement metrics: ${cacheKey}`);
    
    // Calculate date range
    const { startDate } = this.getDateRangeForPeriod(period);

    const filters: any = {
      timestamp: {
        gte: startDate,
      },
    };

    if (groupId) {
      filters.groupId = groupId;
    }

    // Use a transaction for consistent queries
    const [totalEvents, eventCounts, activeUsers] = await prisma.$transaction([
      // Get total events count
      prisma.analyticsEvent.count({
        where: filters,
      }),
      
      // Get counts by event type - optimize with index usage
      prisma.analyticsEvent.groupBy({
        by: ['type'],
        where: filters,
        _count: {
          _all: true,
        },
      }),
      
      // Get active users count (users who performed any action)
      prisma.analyticsEvent.groupBy({
        by: ['userId'],
        where: {
          ...filters,
          userId: {
            not: null,
          },
        },
        _count: {
          _all: true,
        },
      }),
    ]);

    const eventsByType = Object.fromEntries(
      eventCounts.map((item) => [item.type, item._count._all])
    );

    const result = {
      totalEvents,
      activeUsers: activeUsers.length,
      postViews: eventsByType['POST_VIEW'] || 0,
      postCreates: eventsByType['POST_CREATE'] || 0,
      commentCreates: eventsByType['COMMENT_CREATE'] || 0,
      likes: (eventsByType['POST_LIKE'] || 0) + (eventsByType['COMMENT_LIKE'] || 0),
      groupJoins: eventsByType['GROUP_JOIN'] || 0,
      period,
      startDate,
      endDate: new Date(),
    };
    
    // Cache the result
    analyticsCache.set(cacheKey, result);
    
    return result;
  }

  /**
   * Helper function to calculate date range for a given period
   */
  private getDateRangeForPeriod(period: 'day' | 'week' | 'month' | 'year') {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
    }
    
    return { startDate, endDate: now };
  }

  /**
   * Get time-series data for user activity over a period
   * with optimized query and caching
   */
  async getActivityTimeSeries(
    period: 'day' | 'week' | 'month' | 'year' = 'week',
    groupId?: string,
    eventTypes?: string[]
  ) {
    const cacheKey = this.getCacheKey(
      this.CACHE_KEYS.ACTIVITY_SERIES, 
      groupId || null, 
      { period, eventTypes: eventTypes?.join(',') }
    );
    
    // Check cache first
    const cachedResult = analyticsCache.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }
    
    // Calculate date range and format
    const { startDate, timeFormat, numberOfPoints, intervalLabel } = this.getTimeSeriesConfig(period);

    const filters: any = {
      timestamp: {
        gte: startDate,
      },
    };

    if (groupId) {
      filters.groupId = groupId;
    }
    
    if (eventTypes && eventTypes.length > 0) {
      filters.type = {
        in: eventTypes,
      };
    }

    // We use raw database queries for time series because Prisma doesn't 
    // support date formatting in groupBy
    let result;
    
    try {
      result = await prisma.$queryRaw`
        SELECT 
          DATE_FORMAT(timestamp, ${timeFormat}) as timeSegment,
          COUNT(*) as count,
          type
        FROM \`AnalyticsEvent\`
        WHERE timestamp >= ${startDate}
        ${groupId ? prisma.$raw`AND groupId = ${groupId}` : prisma.$raw``}
        ${eventTypes && eventTypes.length > 0 
          ? prisma.$raw`AND type IN (${prisma.join(eventTypes)})` 
          : prisma.$raw``}
        GROUP BY timeSegment, type
        ORDER BY timeSegment ASC
      `;
    } catch (error) {
      console.error('Error fetching time series data:', error);
      result = [];
    }

    // Process the data for charting
    const processedResult = this.processTimeSeriesData(result, startDate, period, numberOfPoints);
    
    const finalResult = {
      timeSeries: processedResult,
      period,
      intervalLabel,
      startDate,
      endDate: new Date(),
    };
    
    // Cache the result
    analyticsCache.set(cacheKey, finalResult);
    
    return finalResult;
  }

  /**
   * Process time series data and fill in missing points
   */
  private processTimeSeriesData(data: any[], startDate: Date, period: string, numberOfPoints: number) {
    // Group data by event type
    const groupedByType: Record<string, any[]> = {};
    
    // Initialize with empty data
    data.forEach(item => {
      if (!groupedByType[item.type]) {
        groupedByType[item.type] = [];
      }
      groupedByType[item.type].push({
        timeSegment: item.timeSegment,
        count: Number(item.count)
      });
    });
    
    // Return the processed data
    return {
      byType: groupedByType,
      aggregated: this.aggregateTimeSeries(data),
    };
  }
  
  /**
   * Aggregate time series data across all event types
   */
  private aggregateTimeSeries(data: any[]) {
    const aggregated: Record<string, number> = {};
    
    data.forEach(item => {
      if (!aggregated[item.timeSegment]) {
        aggregated[item.timeSegment] = 0;
      }
      aggregated[item.timeSegment] += Number(item.count);
    });
    
    // Convert to array format for charts
    return Object.entries(aggregated).map(([timeSegment, count]) => ({
      timeSegment,
      count
    })).sort((a, b) => a.timeSegment.localeCompare(b.timeSegment));
  }

  /**
   * Get configuration for time series queries
   */
  private getTimeSeriesConfig(period: 'day' | 'week' | 'month' | 'year') {
    const now = new Date();
    let startDate: Date;
    let timeFormat: string;
    let numberOfPoints: number;
    let intervalLabel: string;
    
    switch (period) {
      case 'day':
        startDate = new Date(now);
        startDate.setHours(startDate.getHours() - 24);
        timeFormat = '%Y-%m-%d %H:00:00';
        numberOfPoints = 24;
        intervalLabel = 'Hour';
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        timeFormat = '%Y-%m-%d';
        numberOfPoints = 7;
        intervalLabel = 'Day';
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        timeFormat = '%Y-%m-%d';
        numberOfPoints = 30;
        intervalLabel = 'Day';
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1);
        timeFormat = '%Y-%m';
        numberOfPoints = 12;
        intervalLabel = 'Month';
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        timeFormat = '%Y-%m-%d';
        numberOfPoints = 7;
        intervalLabel = 'Day';
    }
    
    return { startDate, timeFormat, numberOfPoints, intervalLabel };
  }

  /**
   * Get top content based on views or engagement
   */
  async getTopContent(
    period: 'day' | 'week' | 'month' | 'year' = 'month',
    groupId?: string,
    limit: number = 10
  ) {
    const cacheKey = this.getCacheKey(
      this.CACHE_KEYS.TOP_CONTENT, 
      groupId || null, 
      { period, limit }
    );
    
    // Check cache first
    const cachedResult = analyticsCache.get(cacheKey);
    if (cachedResult) {
      console.log(`[Analytics] Cache hit for top content: ${cacheKey}`);
      return cachedResult;
    }
    
    console.log(`[Analytics] Cache miss for top content: ${cacheKey}`);
    
    // Calculate date range
    const { startDate } = this.getDateRangeForPeriod(period);

    // Get top posts by views
    const topPostsQuery = prisma.analyticsEvent.groupBy({
      by: ['entityId'],
      where: {
        type: 'POST_VIEW',
        timestamp: { gte: startDate },
        ...(groupId ? { groupId } : {}),
      },
      _count: {
        _all: true,
      },
      orderBy: {
        _count: {
          _all: 'desc',
        },
      },
      take: limit,
    });

    // Get top groups by activity
    const topGroupsQuery = prisma.analyticsEvent.groupBy({
      by: ['groupId'],
      where: {
        timestamp: { gte: startDate },
        groupId: { not: null },
      },
      _count: {
        _all: true,
      },
      orderBy: {
        _count: {
          _all: 'desc',
        },
      },
      take: limit,
    });

    // Execute queries in parallel
    const [topPostIds, topGroupIds] = await Promise.all([
      topPostsQuery,
      topGroupsQuery,
    ]);

    // Fetch detailed post information
    const topPosts = await prisma.forumPost.findMany({
      where: {
        id: { in: topPostIds.map(item => item.entityId!).filter(Boolean) },
      },
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            comments: true,
            likes: true,
          },
        },
      },
    });

    // Fetch detailed group information
    const topGroups = await prisma.group.findMany({
      where: {
        id: { in: topGroupIds.map(item => item.groupId!).filter(Boolean) },
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        _count: {
          select: {
            members: true,
            posts: true,
          },
        },
      },
    });

    // Create a map of entityId to view count
    const postViewsMap = Object.fromEntries(
      topPostIds.map(item => [item.entityId, item._count._all])
    );

    // Combine posts with their view counts
    const postsWithStats = topPosts.map(post => ({
      ...post,
      views: postViewsMap[post.id] || 0,
    }));

    // Sort by view count (highest first)
    postsWithStats.sort((a, b) => b.views - a.views);

    const result = {
      topPosts: postsWithStats,
      topGroups: topGroups,
    };
    
    // Cache the result
    analyticsCache.set(cacheKey, result);
    
    return result;
  }

  /**
   * Get raw events data for export
   */
  async getEventsForExport(
    period: 'day' | 'week' | 'month' | 'year' = 'month',
    groupId?: string,
    limit: number = 1000
  ) {
    const cacheKey = this.getCacheKey(
      this.CACHE_KEYS.USER_ACTIVITY, 
      groupId || null, 
      { period, limit }
    );
    
    // Check cache first
    const cachedResult = analyticsCache.get(cacheKey);
    if (cachedResult) {
      console.log(`[Analytics] Cache hit for events export: ${cacheKey}`);
      return cachedResult;
    }
    
    console.log(`[Analytics] Cache miss for events export: ${cacheKey}`);
    
    const { startDate } = this.getDateRangeForPeriod(period);
    
    const filters: any = {
      timestamp: {
        gte: startDate,
      },
    };

    if (groupId) {
      filters.groupId = groupId;
    }

    const events = await prisma.analyticsEvent.findMany({
      where: filters,
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
    });

    // Format the data for export
    const result = events.map(event => ({
      type: event.type,
      entity_type: event.entityType,
      entity_id: event.entityId || '',
      user_id: event.userId || '',
      group_id: event.groupId || '',
      timestamp: event.timestamp,
      metadata: event.metadata,
    }));
    
    // Cache the result
    analyticsCache.set(cacheKey, result);
    
    return result;
  }

  /**
   * Get user activity data for export
   */
  async getUserActivityForExport(
    period: 'day' | 'week' | 'month' | 'year' = 'month',
    groupId?: string,
    limit: number = 1000
  ) {
    const cacheKey = this.getCacheKey(
      this.CACHE_KEYS.USER_ACTIVITY, 
      groupId || null, 
      { period, limit }
    );
    
    // Check cache first
    const cachedResult = analyticsCache.get(cacheKey);
    if (cachedResult) {
      console.log(`[Analytics] Cache hit for user activity export: ${cacheKey}`);
      return cachedResult;
    }
    
    console.log(`[Analytics] Cache miss for user activity export: ${cacheKey}`);
    
    const { startDate } = this.getDateRangeForPeriod(period);
    
    const filters: any = {
      timestamp: {
        gte: startDate,
      },
      userId: {
        not: null,
      },
    };

    if (groupId) {
      filters.groupId = groupId;
    }

    // Group events by user
    const userEvents = await prisma.analyticsEvent.groupBy({
      by: ['userId'],
      where: filters,
      _count: {
        _all: true,
      },
      orderBy: {
        _count: {
          _all: 'desc',
        },
      },
      take: limit,
    });

    // Get user details and activity timestamps
    const userActivity = await Promise.all(
      userEvents.map(async (item) => {
        const userId = item.userId as string;
        
        // Get user details
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true },
        });
        
        // Get first and last activity
        const [firstActivity, lastActivity] = await Promise.all([
          prisma.analyticsEvent.findFirst({
            where: { userId },
            orderBy: { timestamp: 'asc' },
            select: { timestamp: true },
          }),
          prisma.analyticsEvent.findFirst({
            where: { userId },
            orderBy: { timestamp: 'desc' },
            select: { timestamp: true },
          }),
        ]);
        
        return {
          user_id: userId,
          user_name: user?.name || 'Unknown User',
          event_count: item._count._all,
          last_activity: lastActivity?.timestamp || null,
          first_activity: firstActivity?.timestamp || null,
        };
      })
    );
    
    // Cache the result
    analyticsCache.set(cacheKey, userActivity);
    
    return userActivity;
  }

  /**
   * Get content performance data for export
   */
  async getContentPerformanceForExport(
    period: 'day' | 'week' | 'month' | 'year' = 'month',
    groupId?: string,
    limit: number = 1000
  ) {
    const cacheKey = this.getCacheKey(
      this.CACHE_KEYS.CONTENT_PERFORMANCE, 
      groupId || null, 
      { period, limit }
    );
    
    // Check cache first
    const cachedResult = analyticsCache.get(cacheKey);
    if (cachedResult) {
      console.log(`[Analytics] Cache hit for content performance export: ${cacheKey}`);
      return cachedResult;
    }
    
    console.log(`[Analytics] Cache miss for content performance export: ${cacheKey}`);
    
    const { startDate } = this.getDateRangeForPeriod(period);
    
    // Filter for post views in the time period
    const filters: any = {
      timestamp: {
        gte: startDate,
      },
      type: 'POST_VIEW',
    };

    if (groupId) {
      filters.groupId = groupId;
    }

    // Count views by post
    const postViews = await prisma.analyticsEvent.groupBy({
      by: ['entityId'],
      where: filters,
      _count: {
        _all: true,
      },
      orderBy: {
        _count: {
          _all: 'desc',
        },
      },
      take: limit,
    });

    // Get content details and related metrics
    const contentPerformance = await Promise.all(
      postViews.map(async (item) => {
        const postId = item.entityId as string;
        
        try {
          // Get post details
          const post = await prisma.post.findUnique({
            where: { id: postId },
            select: { 
              title: true,
              author: { select: { name: true } },
              _count: { 
                select: { 
                  comments: true,
                  likes: true 
                } 
              }
            },
          });
        
          if (!post) return null;
        
          return {
            content_id: postId,
            title: post.title,
            type: 'Post',
            views: item._count._all,
            likes: post._count.likes,
            comments: post._count.comments,
            author: post.author.name,
          };
        } catch (error) {
          console.error(`Error fetching details for post ${postId}:`, error);
          return null;
        }
      })
    );

    // Filter out any null values from failed lookups
    const result = contentPerformance.filter(Boolean);
    
    // Cache the result
    analyticsCache.set(cacheKey, result);
    
    return result;
  }

  /**
   * Helper function to get start and end dates for a period
   */
  private getPeriodDates(period: 'day' | 'week' | 'month' | 'year') {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
    }

    return {
      startDate,
      endDate: now,
    };
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
