import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/prisma';
import { withAnalytics } from '@/lib/vercel/analytics-api';
import { checkAndAwardBadges } from '@/lib/reputation/reputation-service';
import { BADGE_DEFINITIONS } from '@/lib/reputation/constants';

/**
 * API handler for managing user badges
 * GET: Get all badges for a user
 * POST: (Admin only) Manually award a badge to a user
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = req.query;
  
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  const session = await getServerSession(req, res, authOptions);
  
  // Check if the user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true }
  });
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // GET: Retrieve badges
  if (req.method === 'GET') {
    try {
      const badges = await prisma.userBadge.findMany({
        where: { userId },
        include: {
          badge: true
        },
        orderBy: {
          earnedAt: 'desc'
        }
      });
      
      // Get available badges that the user doesn't have yet
      const earnedBadgeIds = badges.map(badge => badge.badgeId);
      const availableBadges = BADGE_DEFINITIONS.filter(
        badge => !earnedBadgeIds.includes(badge.id)
      ).map(badge => ({
        id: badge.id,
        name: badge.name,
        description: badge.description,
        category: badge.category,
        icon: badge.icon,
        points: badge.points
      }));
      
      res.status(200).json({
        earned: badges.map(badge => ({
          id: badge.badge.id,
          name: badge.badge.name,
          description: badge.badge.description,
          category: badge.badge.category,
          icon: badge.badge.icon,
          points: badge.badge.points,
          earnedAt: badge.earnedAt
        })),
        available: availableBadges
      });
    } catch (error) {
      console.error('Error fetching badges:', error);
      res.status(500).json({ error: 'Failed to fetch badges' });
    }
  }
  
  // POST: Award badge (admin only)
  else if (req.method === 'POST') {
    // Check if user is an admin
    if (session?.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can award badges' });
    }
    
    const { badgeId } = req.body;
    
    if (!badgeId) {
      return res.status(400).json({ error: 'Badge ID is required' });
    }
    
    try {
      // Check if badge exists
      let badge = await prisma.badge.findUnique({
        where: { id: badgeId }
      });
      
      // If badge doesn't exist in DB but exists in definitions, create it
      if (!badge) {
        const badgeDef = BADGE_DEFINITIONS.find(b => b.id === badgeId);
        
        if (!badgeDef) {
          return res.status(404).json({ error: 'Badge not found' });
        }
        
        badge = await prisma.badge.create({
          data: {
            id: badgeDef.id,
            name: badgeDef.name,
            description: badgeDef.description,
            category: badgeDef.category,
            points: badgeDef.points,
            icon: badgeDef.icon || ''
          }
        });
      }
      
      // Check if user already has this badge
      const existingBadge = await prisma.userBadge.findFirst({
        where: {
          userId,
          badgeId
        }
      });
      
      if (existingBadge) {
        return res.status(400).json({ error: 'User already has this badge' });
      }
      
      // Award the badge
      const userBadge = await prisma.userBadge.create({
        data: {
          userId,
          badgeId
        },
        include: {
          badge: true
        }
      });
      
      // Add badge points to user
      await prisma.user.update({
        where: { id: userId },
        data: {
          reputationPoints: {
            increment: badge.points
          }
        }
      });
      
      res.status(200).json({
        success: true,
        badge: {
          id: userBadge.badge.id,
          name: userBadge.badge.name,
          description: userBadge.badge.description,
          category: userBadge.badge.category,
          points: userBadge.badge.points,
          earnedAt: userBadge.earnedAt
        }
      });
    } catch (error) {
      console.error('Error awarding badge:', error);
      res.status(500).json({ error: 'Failed to award badge' });
    }
  }
  
  // PATCH: Recalculate badges (admin or self only)
  else if (req.method === 'PATCH') {
    // Ensure user is admin or the badge owner
    if (session?.user?.id !== userId && session?.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    try {
      // Check for new badges and award them
      const newBadges = await checkAndAwardBadges(userId);
      
      if (newBadges.length > 0) {
        // Get the newly awarded badges with details
        const badgeDetails = await prisma.userBadge.findMany({
          where: {
            userId,
            badgeId: {
              in: newBadges
            }
          },
          include: {
            badge: true
          }
        });
        
        res.status(200).json({
          success: true,
          newBadges: badgeDetails.map(badge => ({
            id: badge.badge.id,
            name: badge.badge.name,
            description: badge.badge.description,
            category: badge.badge.category,
            points: badge.badge.points,
            earnedAt: badge.earnedAt
          }))
        });
      } else {
        res.status(200).json({
          success: true,
          newBadges: []
        });
      }
    } catch (error) {
      console.error('Error recalculating badges:', error);
      res.status(500).json({ error: 'Failed to recalculate badges' });
    }
  } 
  
  // Method not allowed
  else {
    res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}

export default withAnalytics(handler);
