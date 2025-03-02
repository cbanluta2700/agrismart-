import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { 
  getModerationTrends, 
  getModerationTimePeriods 
} from '@/lib/analytics/moderation-analytics';
import { getResourcePagesAnalytics } from '@/lib/vercel/analytics-api';

/**
 * Handler for moderation trends API
 * GET: Retrieve trend data for moderation activities
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
      // Get parameters from query
      const { 
        period = 'last7Days',
        interval = 'day'
      } = req.query;
      
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
      
      // Validate interval
      const validInterval = ['day', 'week', 'month'].includes(interval as string) 
        ? interval as 'day' | 'week' | 'month' 
        : 'day';
      
      // Get moderation trend data
      const trends = await getModerationTrends(
        selectedPeriod.startDate,
        selectedPeriod.endDate,
        validInterval
      );
      
      // Try to enhance with Vercel Analytics data if available
      try {
        const vercelAnalytics = await getResourcePagesAnalytics({
          from: selectedPeriod.startDate.toISOString(),
          to: selectedPeriod.endDate.toISOString()
        });
        
        // Combine database trend data with Vercel analytics
        // This is a simplified example - in a real implementation you'd
        // want to merge this data more intelligently
        
        return res.status(200).json({
          trends,
          period: selectedPeriod.label,
          interval: validInterval,
          pageViews: vercelAnalytics.data.length > 0 
            ? vercelAnalytics.data.reduce((sum, item) => sum + item.value, 0) 
            : 0
        });
      } catch (vercelError) {
        // If Vercel Analytics fails, just return our database stats
        console.warn('Vercel Analytics error:', vercelError);
        
        return res.status(200).json({
          trends,
          period: selectedPeriod.label,
          interval: validInterval
        });
      }
    } catch (error) {
      console.error('Error retrieving moderation trends:', error);
      return res.status(500).json({ message: 'Failed to retrieve moderation trends' });
    }
  }
  
  // Handle unsupported methods
  return res.status(405).json({ message: 'Method not allowed' });
}
