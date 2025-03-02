import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';
import { withAnalytics } from '@/lib/vercel/analytics-api';
import { BadgeCategory, TrustLevel } from '@prisma/client';
import { TRUST_LEVEL_LABELS } from '@/lib/reputation/constants';

/**
 * API endpoint for retrieving distribution data about the reputation system
 * GET: Retrieves reputation system distribution metrics
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
  
  switch (period) {
    case '24h':
      startDate.setDate(startDate.getDate() - 1);
      break;
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
    default:
      startDate.setDate(startDate.getDate() - 7);
  }
  
  try {
    // Get users by trust level distribution
    const usersByTrustLevelRaw = await prisma.user.groupBy({
      by: ['trustLevel'],
      _count: {
        id: true
      }
    });
    
    // Format trust level distribution data
    const usersByTrustLevel = usersByTrustLevelRaw.map(item => ({
      name: TRUST_LEVEL_LABELS[item.trustLevel as TrustLevel],
      value: item._count.id
    }));
    
    // Get badges by category distribution
    const badgesByCategoryRaw = await prisma.userBadge.groupBy({
      by: ['badge.category'],
      _count: {
        id: true
      },
      where: {
        earnedAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });
    
    // Format badges by category data
    const badgesByCategory = badgesByCategoryRaw.map(item => ({
      name: formatBadgeCategory(item.badge.category as BadgeCategory),
      value: item._count.id
    }));
    
    // Get top badges
    const topBadgesRaw = await prisma.userBadge.groupBy({
      by: ['badgeId'],
      _count: {
        id: true
      },
      where: {
        earnedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    });
    
    // Get badge details for top badges
    const topBadgeDetails = await prisma.badge.findMany({
      where: {
        id: {
          in: topBadgesRaw.map(item => item.badgeId)
        }
      }
    });
    
    // Format top badges data
    const topBadges = topBadgesRaw.map(item => {
      const badge = topBadgeDetails.find(b => b.id === item.badgeId);
      return {
        id: item.badgeId,
        name: badge?.name || 'Unknown Badge',
        count: item._count.id,
        category: badge?.category
      };
    });
    
    // Get top users by reputation
    const topUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        reputationPoints: true,
        trustLevel: true
      },
      orderBy: {
        reputationPoints: 'desc'
      },
      take: 10
    });
    
    // Format top users data
    const formattedTopUsers = topUsers.map(user => ({
      id: user.id,
      name: user.name || 'Anonymous User',
      points: user.reputationPoints,
      trustLevel: user.trustLevel
    }));
    
    // Get user activity distribution (how many users made X activities)
    const userActivityRaw = await prisma.reputationActivity.groupBy({
      by: ['userId'],
      _count: {
        id: true
      },
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });
    
    // Calculate user activity distribution
    const activityCounts = userActivityRaw.map(item => item._count.id);
    
    // Define activity level categories
    const activityCategories = [
      { min: 0, max: 0, label: 'Inactive' },
      { min: 1, max: 5, label: 'Low' },
      { min: 6, max: 20, label: 'Medium' },
      { min: 21, max: 50, label: 'High' },
      { min: 51, max: 10000, label: 'Very High' }
    ];
    
    // Count users in each activity category
    const userActivityDistribution = activityCategories.map(category => {
      const count = activityCounts.filter(
        count => count >= category.min && count <= category.max
      ).length;
      
      return {
        category: category.label,
        count
      };
    });
    
    // Add inactive users (users not in the activity list)
    const totalUsers = await prisma.user.count();
    const activeUsers = new Set(userActivityRaw.map(item => item.userId)).size;
    const inactiveUsers = totalUsers - activeUsers;
    
    userActivityDistribution[0].count += inactiveUsers;
    
    // Return the distribution data
    res.status(200).json({
      period,
      usersByTrustLevel,
      badgesByCategory,
      topBadges,
      topUsers: formattedTopUsers,
      userActivityDistribution
    });
  } catch (error) {
    console.error('Error fetching reputation distribution data:', error);
    res.status(500).json({ error: 'Failed to fetch reputation distribution data' });
  }
}

/**
 * Format badge category for display
 */
function formatBadgeCategory(category: BadgeCategory): string {
  // Convert from UPPER_CASE to Title Case with spaces
  return category.toString()
    .replace(/_/g, ' ')
    .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
}

export default withAnalytics(handler);
