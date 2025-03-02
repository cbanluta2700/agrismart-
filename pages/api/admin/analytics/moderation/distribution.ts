import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { 
  getResourceStatusDistribution, 
  getResourceTypeDistribution 
} from '@/lib/analytics/moderation-analytics';

/**
 * Handler for resource distribution API
 * GET: Retrieve distribution data for resources by status and type
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
      // Get resource distribution data
      const [statusDistribution, typeDistribution] = await Promise.all([
        getResourceStatusDistribution(),
        getResourceTypeDistribution()
      ]);
      
      return res.status(200).json({
        statusDistribution,
        typeDistribution
      });
    } catch (error) {
      console.error('Error retrieving resource distribution:', error);
      return res.status(500).json({ message: 'Failed to retrieve resource distribution' });
    }
  }
  
  // Handle unsupported methods
  return res.status(405).json({ message: 'Method not allowed' });
}
