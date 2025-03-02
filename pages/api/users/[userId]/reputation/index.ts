import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { getUserReputationProfile } from '@/lib/reputation/reputation-service';
import { prisma } from '@/lib/prisma';
import { withAnalytics } from '@/lib/vercel/analytics-api';

/**
 * API handler for getting a user's reputation profile
 * GET: Get user's complete reputation profile
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = req.query;
  
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  const session = await getServerSession(req, res, authOptions);
  const isOwnProfile = session?.user?.id === userId;
  const isAdmin = session?.user?.role === 'ADMIN';
  
  // Check if the user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true }
  });
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  try {
    // Get the reputation profile
    const reputationProfile = await getUserReputationProfile(userId);
    
    // If this is not the user's own profile and not an admin, limit some data
    if (!isOwnProfile && !isAdmin) {
      // Exclude recent activities and maybe some other sensitive data
      delete reputationProfile.recentActivities;
    }
    
    res.status(200).json(reputationProfile);
  } catch (error) {
    console.error('Error fetching reputation profile:', error);
    res.status(500).json({ error: 'Failed to fetch reputation profile' });
  }
}

export default withAnalytics(handler);
