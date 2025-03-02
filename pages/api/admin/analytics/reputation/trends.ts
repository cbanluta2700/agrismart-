import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';
import { withAnalytics } from '@/lib/vercel/analytics-api';
import { BadgeCategory, ReputationActivityType } from '@prisma/client';
import { ACTIVITY_POINTS } from '@/lib/reputation/constants';

/**
 * API endpoint for retrieving trend data about the reputation system
 * GET: Retrieves reputation system trend metrics over time
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Ensure the user is authenticated and an admin
  const session = await getServerSession(req, res, authOptions);
  
  if (!session || session.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Not authorized' });
  }
  
  // Get period from request query
  const { period = '7d' } = req.query;
  
  // Calculate date range based on period
  const endDate = new Date();
  let startDate = new Date();
  let groupByFormat: 'day' | 'week' | 'month' = 'day';
  
  switch (period) {
    case '24h':
      startDate.setDate(startDate.getDate() - 1);
      groupByFormat = 'hour'; // Use hours for 24h period
      break;
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      groupByFormat = 'day';
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      groupByFormat = 'day';
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      groupByFormat = 'week';
      break;
    default:
      startDate.setDate(startDate.getDate() - 7);
      groupByFormat = 'day';
  }
  
  try {
    // Get activity trends - count of activities per day/week
    const activityTrendsRaw = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC(${groupByFormat}, "createdAt") AS date,
        COUNT(*) AS count
      FROM 
        "ReputationActivity"
      WHERE 
        "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
      GROUP BY 
        DATE_TRUNC(${groupByFormat}, "createdAt")
      ORDER BY 
        date ASC
    `;
    
    // Format activity trends data
    const activityTrends = (activityTrendsRaw as any[]).map(item => ({
      date: item.date.toISOString().split('T')[0],
      count: Number(item.count)
    }));
    
    // Get points trends - sum of points per day/week
    const pointsTrendsRaw = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC(${groupByFormat}, "createdAt") AS date,
        SUM(points) AS points
      FROM 
        "ReputationActivity"
      WHERE 
        "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
      GROUP BY 
        DATE_TRUNC(${groupByFormat}, "createdAt")
      ORDER BY 
        date ASC
    `;
    
    // Format points trends data
    const pointsTrends = (pointsTrendsRaw as any[]).map(item => ({
      date: item.date.toISOString().split('T')[0],
      points: Number(item.points)
    }));
    
    // Get badge trends - count of badges earned per day/week by category
    const badgeTrendsRaw = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC(${groupByFormat}, ub."earnedAt") AS date,
        b.category,
        COUNT(*) AS count
      FROM 
        "UserBadge" ub
      JOIN
        "Badge" b ON ub."badgeId" = b.id
      WHERE 
        ub."earnedAt" >= ${startDate} AND ub."earnedAt" <= ${endDate}
      GROUP BY 
        DATE_TRUNC(${groupByFormat}, ub."earnedAt"),
        b.category
      ORDER BY 
        date ASC
    `;
    
    // Format badge trends data
    const badgeTrendsByDate = (badgeTrendsRaw as any[]).reduce((acc, item) => {
      const dateStr = item.date.toISOString().split('T')[0];
      if (!acc[dateStr]) {
        acc[dateStr] = {
          date: dateStr,
          contributor: 0,
          knowledge: 0,
          community: 0
        };
      }
      
      const categoryKey = item.category.toLowerCase();
      acc[dateStr][categoryKey] = Number(item.count);
      
      return acc;
    }, {});
    
    const badgeTrends = Object.values(badgeTrendsByDate);
    
    // Get points distribution by activity type for the period
    const pointsByActivityTypeRaw = await prisma.reputationActivity.groupBy({
      by: ['type'],
      _sum: {
        points: true
      },
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });
    
    // Format points by activity type data
    const pointsByActivityType = pointsByActivityTypeRaw.map(item => ({
      name: formatActivityType(item.type),
      value: item._sum.points || 0
    }));
    
    // Return the trends data
    res.status(200).json({
      period,
      activityTrends,
      pointsTrends,
      badgeTrends,
      pointsByActivityType
    });
  } catch (error) {
    console.error('Error fetching reputation trends data:', error);
    res.status(500).json({ error: 'Failed to fetch reputation trends data' });
  }
}

/**
 * Format activity type for display
 */
function formatActivityType(type: ReputationActivityType): string {
  // Convert from SNAKE_CASE to Title Case with spaces
  return type.toString()
    .replace(/_/g, ' ')
    .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
}

export default withAnalytics(handler);
