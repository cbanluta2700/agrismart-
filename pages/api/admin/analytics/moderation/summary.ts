import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { 
  getModerationActivitySummary, 
  getModerationTimePeriods 
} from '@/lib/analytics/moderation-analytics';
import { 
  getModerationEndpointAnalytics 
} from '@/lib/vercel/analytics-api';

/**
 * Handler for moderation activity summary API
 * GET: Retrieve summary statistics for moderation activities
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
      
      // Get moderation activity summary
      const summary = await getModerationActivitySummary(
        selectedPeriod.startDate,
        selectedPeriod.endDate
      );
      
      // Try to enhance with Vercel Analytics data if available
      try {
        const vercelAnalytics = await getModerationEndpointAnalytics({
          from: selectedPeriod.startDate.toISOString(),
          to: selectedPeriod.endDate.toISOString()
        });
        
        // Combine with our database statistics
        // Note: This is a simplistic approach; in a real implementation,
        // you'd want to do more sophisticated merging of data
        
        return res.status(200).json({
          ...summary,
          vercelAnalytics: {
            available: true,
            endpoints: Object.keys(vercelAnalytics)
          }
        });
      } catch (vercelError) {
        // If Vercel Analytics fails, just return our database stats
        console.warn('Vercel Analytics error:', vercelError);
        
        return res.status(200).json(summary);
      }
    } catch (error) {
      console.error('Error retrieving moderation summary:', error);
      return res.status(500).json({ message: 'Failed to retrieve moderation summary' });
    }
  }
  
  // Handle unsupported methods
  return res.status(405).json({ message: 'Method not allowed' });
}
