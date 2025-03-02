import { prisma } from '@/lib/prisma';
import { Article, Guide, GlossaryTerm, Video, ContentView } from '@prisma/client';

/**
 * Interface for content view analytics data
 */
export interface ContentViewsAnalytics {
  dailyViews: { date: string; count: number }[];
  weeklyViews: { week: string; count: number }[];
  monthlyViews: { month: string; count: number }[];
  totalViews: number;
  uniqueVisitors: number;
  avgTimeOnPage: number;
  bounceRate: number;
}

/**
 * Interface for content performance metrics
 */
export interface ContentPerformanceMetrics {
  mostViewedContent: {
    id: string;
    title: string;
    type: 'article' | 'guide' | 'video' | 'glossary';
    views: number;
    avgTimeOnPage: number;
  }[];
  contentByCategory: {
    category: string;
    count: number;
    totalViews: number;
  }[];
  contentByAuthor: {
    author: string;
    count: number;
    totalViews: number;
  }[];
}

/**
 * Interface for resource publishing analytics
 */
export interface PublishingAnalytics {
  publishedByDate: { date: string; count: number }[];
  contentByStatus: { status: string; count: number }[];
  averageTimeToPublish: number;
  revisionsPerContent: number;
}

/**
 * Retrieves content view analytics for a specific type of content
 * @param contentType The type of content to get analytics for
 * @param startDate Optional start date for filtering data
 * @param endDate Optional end date for filtering data
 */
export async function getContentViewsAnalytics(
  contentType: 'article' | 'guide' | 'video' | 'glossary' | 'all',
  startDate?: Date,
  endDate?: Date
): Promise<ContentViewsAnalytics> {
  // Define the base query filters
  const dateFilter = {};
  if (startDate) {
    dateFilter['gte'] = startDate;
  }
  if (endDate) {
    dateFilter['lte'] = endDate;
  }

  // Build the query based on content type
  const viewsQuery = {
    where: {
      ...(contentType !== 'all' && { contentType }),
      ...(Object.keys(dateFilter).length > 0 && { viewedAt: dateFilter }),
    },
  };

  // Get daily views
  const dailyViews = await prisma.contentView.groupBy({
    by: ['viewedAt'],
    _count: {
      id: true,
    },
    where: viewsQuery.where,
    orderBy: {
      viewedAt: 'asc',
    },
  });

  // Get weekly views (group by week)
  const weeklyViews = await prisma.$queryRaw`
    SELECT DATE_TRUNC('week', "viewedAt") as week, COUNT(*) as count
    FROM "ContentView"
    WHERE "contentType" = ${contentType !== 'all' ? contentType : undefined}
    AND "viewedAt" >= ${startDate || undefined}
    AND "viewedAt" <= ${endDate || undefined}
    GROUP BY week
    ORDER BY week ASC
  `;

  // Get monthly views
  const monthlyViews = await prisma.$queryRaw`
    SELECT DATE_TRUNC('month', "viewedAt") as month, COUNT(*) as count
    FROM "ContentView"
    WHERE "contentType" = ${contentType !== 'all' ? contentType : undefined}
    AND "viewedAt" >= ${startDate || undefined}
    AND "viewedAt" <= ${endDate || undefined}
    GROUP BY month
    ORDER BY month ASC
  `;

  // Get total views
  const totalViews = await prisma.contentView.count({
    where: viewsQuery.where,
  });

  // Get unique visitors
  const uniqueVisitors = await prisma.contentView.groupBy({
    by: ['visitorId'],
    where: viewsQuery.where,
  }).then(result => result.length);

  // Get average time on page
  const avgTimeOnPage = await prisma.contentView.aggregate({
    _avg: {
      timeOnPage: true,
    },
    where: viewsQuery.where,
  }).then(result => result._avg.timeOnPage || 0);

  // Calculate bounce rate (sessions with only one page view)
  const totalSessions = await prisma.contentView.groupBy({
    by: ['sessionId'],
    where: viewsQuery.where,
  }).then(result => result.length);
  
  const bounceSessions = await prisma.$queryRaw`
    SELECT COUNT(DISTINCT "sessionId") as count
    FROM (
      SELECT "sessionId", COUNT(*) as views
      FROM "ContentView"
      WHERE "contentType" = ${contentType !== 'all' ? contentType : undefined}
      AND "viewedAt" >= ${startDate || undefined}
      AND "viewedAt" <= ${endDate || undefined}
      GROUP BY "sessionId"
      HAVING COUNT(*) = 1
    ) as bounce_sessions
  `;
  
  const bounceRate = totalSessions > 0 ? (bounceSessions[0].count / totalSessions) * 100 : 0;

  // Format the results
  return {
    dailyViews: dailyViews.map(item => ({
      date: item.viewedAt.toISOString().split('T')[0],
      count: item._count.id,
    })),
    weeklyViews: weeklyViews.map(item => ({
      week: new Date(item.week).toISOString().split('T')[0],
      count: Number(item.count),
    })),
    monthlyViews: monthlyViews.map(item => ({
      month: new Date(item.month).toISOString().split('T')[0],
      count: Number(item.count),
    })),
    totalViews,
    uniqueVisitors,
    avgTimeOnPage,
    bounceRate,
  };
}

/**
 * Gets performance metrics for content
 * @param contentType The type of content to get metrics for
 * @param limit The maximum number of items to return for top content
 */
export async function getContentPerformanceMetrics(
  contentType: 'article' | 'guide' | 'video' | 'glossary' | 'all',
  limit = 10
): Promise<ContentPerformanceMetrics> {
  // Get most viewed content
  const mostViewedContent = await prisma.contentView.groupBy({
    by: ['contentId', 'contentType'],
    _count: {
      id: true,
    },
    _avg: {
      timeOnPage: true,
    },
    where: contentType !== 'all' ? { contentType } : undefined,
    orderBy: {
      _count: {
        id: 'desc',
      },
    },
    take: limit,
  });

  // Fetch titles for the content items
  const contentDetails = await Promise.all(
    mostViewedContent.map(async (item) => {
      let title = '';
      
      switch (item.contentType) {
        case 'article':
          const article = await prisma.article.findUnique({
            where: { id: item.contentId },
            select: { title: true },
          });
          title = article?.title || 'Unknown Article';
          break;
        case 'guide':
          const guide = await prisma.guide.findUnique({
            where: { id: item.contentId },
            select: { title: true },
          });
          title = guide?.title || 'Unknown Guide';
          break;
        case 'video':
          const video = await prisma.video.findUnique({
            where: { id: item.contentId },
            select: { title: true },
          });
          title = video?.title || 'Unknown Video';
          break;
        case 'glossary':
          const glossaryTerm = await prisma.glossaryTerm.findUnique({
            where: { id: item.contentId },
            select: { term: true },
          });
          title = glossaryTerm?.term || 'Unknown Term';
          break;
      }
      
      return {
        id: item.contentId,
        title,
        type: item.contentType,
        views: item._count.id,
        avgTimeOnPage: item._avg.timeOnPage || 0,
      };
    })
  );

  // Get content by category
  const contentByCategory = await prisma.$queryRaw`
    WITH content_categories AS (
      SELECT c.name, cv.id
      FROM "ContentCategory" c
      JOIN "ContentCategoryMap" ccm ON c.id = ccm."categoryId"
      JOIN "ContentView" cv ON cv."contentId" = ccm."contentId" AND cv."contentType" = ccm."contentType"
      WHERE cv."contentType" = ${contentType !== 'all' ? contentType : undefined} OR ${contentType === 'all'}
    )
    SELECT name as category, COUNT(DISTINCT "contentId") as count, COUNT(*) as "totalViews"
    FROM content_categories
    GROUP BY category
    ORDER BY "totalViews" DESC
  `;

  // Get content by author
  const contentByAuthor = await prisma.$queryRaw`
    WITH content_authors AS (
      SELECT 
        CASE
          WHEN a.id IS NOT NULL THEN a.name
          WHEN g.id IS NOT NULL THEN g.author
          WHEN v.id IS NOT NULL THEN v.author
          ELSE 'Unknown'
        END as author,
        cv.id,
        cv."contentId"
      FROM "ContentView" cv
      LEFT JOIN "Article" a ON cv."contentType" = 'article' AND cv."contentId" = a.id
      LEFT JOIN "Guide" g ON cv."contentType" = 'guide' AND cv."contentId" = g.id
      LEFT JOIN "Video" v ON cv."contentType" = 'video' AND cv."contentId" = v.id
      WHERE cv."contentType" = ${contentType !== 'all' ? contentType : undefined} OR ${contentType === 'all'}
    )
    SELECT author, COUNT(DISTINCT "contentId") as count, COUNT(*) as "totalViews"
    FROM content_authors
    GROUP BY author
    ORDER BY "totalViews" DESC
  `;

  return {
    mostViewedContent: contentDetails,
    contentByCategory: contentByCategory.map(item => ({
      category: item.category,
      count: Number(item.count),
      totalViews: Number(item.totalViews),
    })),
    contentByAuthor: contentByAuthor.map(item => ({
      author: item.author,
      count: Number(item.count),
      totalViews: Number(item.totalViews),
    })),
  };
}

/**
 * Gets publishing analytics for content
 * @param contentType The type of content to get analytics for
 * @param startDate Optional start date for filtering data
 * @param endDate Optional end date for filtering data
 */
export async function getPublishingAnalytics(
  contentType: 'article' | 'guide' | 'video' | 'glossary' | 'all',
  startDate?: Date,
  endDate?: Date
): Promise<PublishingAnalytics> {
  // Define the base query filters
  const dateFilter = {};
  if (startDate) {
    dateFilter['gte'] = startDate;
  }
  if (endDate) {
    dateFilter['lte'] = endDate;
  }

  // Get published content by date
  const publishedByDate = await prisma.$queryRaw`
    SELECT DATE_TRUNC('day', "publishedAt") as date, COUNT(*) as count
    FROM (
      SELECT "publishedAt" FROM "Article" 
      WHERE "status" = 'published' 
      ${contentType === 'article' || contentType === 'all' ? 
        `AND "publishedAt" >= ${startDate || undefined} 
         AND "publishedAt" <= ${endDate || undefined}` : 'AND 1=0'}
      UNION ALL
      SELECT "publishedAt" FROM "Guide" 
      WHERE "status" = 'published' 
      ${contentType === 'guide' || contentType === 'all' ? 
        `AND "publishedAt" >= ${startDate || undefined} 
         AND "publishedAt" <= ${endDate || undefined}` : 'AND 1=0'}
      UNION ALL
      SELECT "publishedAt" FROM "Video" 
      WHERE "status" = 'published' 
      ${contentType === 'video' || contentType === 'all' ? 
        `AND "publishedAt" >= ${startDate || undefined} 
         AND "publishedAt" <= ${endDate || undefined}` : 'AND 1=0'}
      UNION ALL
      SELECT "publishedAt" FROM "GlossaryTerm" 
      WHERE "status" = 'published' 
      ${contentType === 'glossary' || contentType === 'all' ? 
        `AND "publishedAt" >= ${startDate || undefined} 
         AND "publishedAt" <= ${endDate || undefined}` : 'AND 1=0'}
    ) as published_content
    GROUP BY date
    ORDER BY date ASC
  `;

  // Get content by status
  const contentByStatus = await prisma.$queryRaw`
    SELECT status, COUNT(*) as count
    FROM (
      SELECT "status" FROM "Article" 
      ${contentType === 'article' || contentType === 'all' ? '' : 'WHERE 1=0'}
      UNION ALL
      SELECT "status" FROM "Guide" 
      ${contentType === 'guide' || contentType === 'all' ? '' : 'WHERE 1=0'}
      UNION ALL
      SELECT "status" FROM "Video" 
      ${contentType === 'video' || contentType === 'all' ? '' : 'WHERE 1=0'}
      UNION ALL
      SELECT "status" FROM "GlossaryTerm" 
      ${contentType === 'glossary' || contentType === 'all' ? '' : 'WHERE 1=0'}
    ) as content_status
    GROUP BY status
    ORDER BY count DESC
  `;

  // Calculate average time to publish (from created to published)
  const timeToPublish = await prisma.$queryRaw`
    SELECT AVG(EXTRACT(EPOCH FROM ("publishedAt" - "createdAt"))) as avg_seconds
    FROM (
      SELECT "createdAt", "publishedAt" FROM "Article" 
      WHERE "status" = 'published' AND "publishedAt" IS NOT NULL
      ${contentType === 'article' || contentType === 'all' ? '' : 'AND 1=0'}
      UNION ALL
      SELECT "createdAt", "publishedAt" FROM "Guide" 
      WHERE "status" = 'published' AND "publishedAt" IS NOT NULL
      ${contentType === 'guide' || contentType === 'all' ? '' : 'AND 1=0'}
      UNION ALL
      SELECT "createdAt", "publishedAt" FROM "Video" 
      WHERE "status" = 'published' AND "publishedAt" IS NOT NULL
      ${contentType === 'video' || contentType === 'all' ? '' : 'AND 1=0'}
      UNION ALL
      SELECT "createdAt", "publishedAt" FROM "GlossaryTerm" 
      WHERE "status" = 'published' AND "publishedAt" IS NOT NULL
      ${contentType === 'glossary' || contentType === 'all' ? '' : 'AND 1=0'}
    ) as publish_times
  `;

  // Get average revisions per content
  const revisionsPerContent = await prisma.contentVersion.groupBy({
    by: ['contentId', 'contentType'],
    _count: {
      id: true,
    },
    where: contentType !== 'all' ? { contentType } : undefined,
  }).then(results => {
    const totalRevisions = results.reduce((sum, item) => sum + item._count.id, 0);
    return results.length > 0 ? totalRevisions / results.length : 0;
  });

  return {
    publishedByDate: publishedByDate.map(item => ({
      date: new Date(item.date).toISOString().split('T')[0],
      count: Number(item.count),
    })),
    contentByStatus: contentByStatus.map(item => ({
      status: item.status,
      count: Number(item.count),
    })),
    averageTimeToPublish: Number(timeToPublish[0]?.avg_seconds || 0) / 3600, // Convert seconds to hours
    revisionsPerContent,
  };
}

/**
 * Tracks a content view
 * @param contentId ID of the content being viewed
 * @param contentType Type of content being viewed
 * @param visitorId Unique identifier for the visitor
 * @param sessionId Unique identifier for the session
 * @param referrer Referring URL
 */
export async function trackContentView(
  contentId: string,
  contentType: 'article' | 'guide' | 'video' | 'glossary',
  visitorId: string,
  sessionId: string,
  referrer?: string
): Promise<void> {
  await prisma.contentView.create({
    data: {
      contentId,
      contentType,
      visitorId,
      sessionId,
      referrer,
      viewedAt: new Date(),
    },
  });
}

/**
 * Updates the time spent on a content page
 * @param viewId ID of the content view to update
 * @param timeOnPage Time spent on the page in seconds
 */
export async function updateTimeOnPage(
  viewId: string,
  timeOnPage: number
): Promise<void> {
  await prisma.contentView.update({
    where: { id: viewId },
    data: { timeOnPage },
  });
}

/**
 * Gets real-time active viewers for a specific content item
 * @param contentId ID of the content
 * @param contentType Type of content
 * @param timeWindow Time window in minutes (default: 5 minutes)
 */
export async function getActiveViewers(
  contentId: string,
  contentType: 'article' | 'guide' | 'video' | 'glossary',
  timeWindow = 5
): Promise<number> {
  const cutoffTime = new Date(Date.now() - timeWindow * 60 * 1000);
  
  return prisma.contentView.count({
    where: {
      contentId,
      contentType,
      viewedAt: {
        gte: cutoffTime,
      },
    },
    distinct: ['visitorId'],
  });
}
