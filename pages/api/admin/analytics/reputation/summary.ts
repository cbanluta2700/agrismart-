import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';
import { withAnalytics } from '@/lib/vercel/analytics-api';
import { TrustLevel, BadgeCategory, ReputationActivityType } from '@prisma/client';

/**
 * API endpoint for retrieving summary statistics about the reputation system
 * GET: Retrieves reputation system summary metrics
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
  
  // Calculate previous period for comparison
  const previousEndDate = new Date(startDate);
  const previousStartDate = new Date(startDate);
  
  switch (period) {
    case '24h':
      previousStartDate.setDate(previousStartDate.getDate() - 1);
      break;
    case '7d':
      previousStartDate.setDate(previousStartDate.getDate() - 7);
      break;
    case '30d':
      previousStartDate.setDate(previousStartDate.getDate() - 30);
      break;
    case '90d':
      previousStartDate.setDate(previousStartDate.getDate() - 90);
      break;
    default:
      previousStartDate.setDate(previousStartDate.getDate() - 7);
  }
  
  try {
    // Get total points awarded in the period
    const totalPointsAwarded = await prisma.reputationActivity.aggregate({
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
    
    // Get total points awarded in the previous period
    const previousPeriodPoints = await prisma.reputationActivity.aggregate({
      _sum: {
        points: true
      },
      where: {
        createdAt: {
          gte: previousStartDate,
          lt: startDate
        }
      }
    });
    
    // Calculate percentage change in points
    const currentPoints = totalPointsAwarded._sum.points || 0;
    const previousPoints = previousPeriodPoints._sum.points || 0;
    const pointsChange = previousPoints === 0 
      ? 100 
      : ((currentPoints - previousPoints) / previousPoints) * 100;
    
    // Get count of active users (users who earned reputation in the period)
    const activeUsersQuery = await prisma.reputationActivity.groupBy({
      by: ['userId'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });
    
    // Get count of active users in previous period
    const previousActiveUsersQuery = await prisma.reputationActivity.groupBy({
      by: ['userId'],
      where: {
        createdAt: {
          gte: previousStartDate,
          lt: startDate
        }
      }
    });
    
    // Calculate percentage change in active users
    const activeUsers = activeUsersQuery.length;
    const previousActiveUsers = previousActiveUsersQuery.length;
    const activeUsersChange = previousActiveUsers === 0 
      ? 100 
      : ((activeUsers - previousActiveUsers) / previousActiveUsers) * 100;
    
    // Get count of badges awarded in the period
    const badgesAwarded = await prisma.userBadge.count({
      where: {
        earnedAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });
    
    // Get count of badges awarded in the previous period
    const previousBadgesAwarded = await prisma.userBadge.count({
      where: {
        earnedAt: {
          gte: previousStartDate,
          lt: startDate
        }
      }
    });
    
    // Calculate percentage change in badges
    const badgesChange = previousBadgesAwarded === 0 
      ? 100 
      : ((badgesAwarded - previousBadgesAwarded) / previousBadgesAwarded) * 100;
    
    // Get count of endorsements created in the period
    const endorsements = await prisma.userEndorsement.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });
    
    // Get count of endorsements in the previous period
    const previousEndorsements = await prisma.userEndorsement.count({
      where: {
        createdAt: {
          gte: previousStartDate,
          lt: startDate
        }
      }
    });
    
    // Calculate percentage change in endorsements
    const endorsementsChange = previousEndorsements === 0 
      ? 100 
      : ((endorsements - previousEndorsements) / previousEndorsements) * 100;
    
    // Return the summary data
    res.status(200).json({
      period,
      totalPointsAwarded: currentPoints,
      pointsChange: Math.round(pointsChange * 10) / 10,
      activeUsers,
      activeUsersChange: Math.round(activeUsersChange * 10) / 10,
      badgesAwarded,
      badgesChange: Math.round(badgesChange * 10) / 10,
      endorsements,
      endorsementsChange: Math.round(endorsementsChange * 10) / 10
    });
  } catch (error) {
    console.error('Error fetching reputation summary data:', error);
    res.status(500).json({ error: 'Failed to fetch reputation summary data' });
  }
}

export default withAnalytics(handler);
