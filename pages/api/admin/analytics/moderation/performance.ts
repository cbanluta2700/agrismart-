import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { 
  getModeratorPerformanceMetrics, 
  getModerationTimePeriods 
} from '@/lib/analytics/moderation-analytics';
import { getModerationFeatureEngagement } from '@/lib/vercel/analytics-api';

/**
 * Handler for moderator performance API
 * GET: Retrieve performance metrics for moderators
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check authentication and authorization
  const session = await getServerSession(req, res, authOptions);
  
  if (!session || !session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const userRole = session.user.role;
  if (userRole !== 'ADMIN' && userRole !== 'MODERATOR') {
    return res.status(403).json({ message: 'Forbidden - Insufficient permissions' });
  }
  
  // Handle GET request
  if (req.method === 'GET') {
    try {
      // Get time period from query params or use default (last 7 days)
      const { period = 'last7Days' } = req.query;
      
      // Map period to date range
      const timePeriods = getModerationTimePeriods();
      let selectedPeriod = timePeriods.find(p => p.label.toLowerCase().replace(/\s+/g, '') === period) || 
                          timePeriods.find(p => p.label === 'Last 7 Days');
      
      if (!selectedPeriod) {
        selectedPeriod = {
          startDate: new Date(new Date().setDate(new Date().getDate() - 7)),
          endDate: new Date(),
          label: 'Last 7 Days'
        };
      }
      
      // Get moderator performance metrics
      const moderators = await getModeratorPerformanceMetrics(
        selectedPeriod.startDate,
        selectedPeriod.endDate
      );
      
      // Try to enhance with Vercel Analytics data if available
      try {
        const engagementData = await getModerationFeatureEngagement({
          from: selectedPeriod.startDate.toISOString(),
          to: selectedPeriod.endDate.toISOString()
        });
        
        // Combine with our database statistics
        const avgEngagementTime = engagementData.data.length > 0
          ? engagementData.data.reduce((sum, item) => sum + item.value, 0) / engagementData.data.length
          : 0;
        
        return res.status(200).json({
          moderators,
          period: selectedPeriod.label,
          avgEngagementTime: Math.round(avgEngagementTime), // in seconds
          engagementSamples: engagementData.data.length
        });
      } catch (vercelError) {
        // If Vercel Analytics fails, just return our database stats
        console.warn('Vercel Analytics error:', vercelError);
        
        return res.status(200).json({
          moderators,
          period: selectedPeriod.label
        });
      }
    } catch (error) {
      console.error('Error retrieving moderator performance:', error);
      return res.status(500).json({ message: 'Failed to retrieve moderator performance' });
    }
  }
  
  // Handle unsupported methods
  return res.status(405).json({ message: 'Method not allowed' });
}
