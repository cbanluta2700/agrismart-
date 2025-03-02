import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { 
  getContentViewsAnalytics, 
  getContentPerformanceMetrics, 
  getPublishingAnalytics 
} from '@/lib/analytics/resources-analytics';
import { applyEdgeCaching } from '@/lib/vercel-sdk';

/**
 * API handler for resource analytics
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify the user is authenticated
  const session = await getSession({ req });
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Verify the user has the required permissions
  const allowedRoles = ['admin', 'moderator', 'contentManager'];
  const userRole = session.user.role as string;
  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  // Process the request based on the HTTP method
  switch (req.method) {
    case 'GET':
      return await getResourcesAnalytics(req, res);
    default:
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

/**
 * Handler for GET requests to retrieve resource analytics
 */
async function getResourcesAnalytics(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Parse query parameters
    const { 
      contentType = 'all', 
      startDate, 
      endDate, 
      metric = 'views',
      limit = '10' 
    } = req.query;

    // Validate contentType
    const validContentTypes = ['article', 'guide', 'video', 'glossary', 'all'];
    if (!validContentTypes.includes(contentType as string)) {
      return res.status(400).json({ 
        error: `Invalid content type. Must be one of: ${validContentTypes.join(', ')}` 
      });
    }

    // Parse dates
    const parsedStartDate = startDate ? new Date(startDate as string) : undefined;
    const parsedEndDate = endDate ? new Date(endDate as string) : undefined;
    
    // Validate dates if provided
    if (
      (parsedStartDate && isNaN(parsedStartDate.getTime())) || 
      (parsedEndDate && isNaN(parsedEndDate.getTime()))
    ) {
      return res.status(400).json({ 
        error: 'Invalid date format. Use ISO format (YYYY-MM-DD)' 
      });
    }

    // Validate limit
    const parsedLimit = parseInt(limit as string, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      return res.status(400).json({ 
        error: 'Invalid limit. Must be a positive integer' 
      });
    }

    // Handle different metrics
    let data;
    switch (metric) {
      case 'views':
        data = await getContentViewsAnalytics(
          contentType as any, 
          parsedStartDate, 
          parsedEndDate
        );
        break;
      case 'performance':
        data = await getContentPerformanceMetrics(
          contentType as any,
          parsedLimit
        );
        break;
      case 'publishing':
        data = await getPublishingAnalytics(
          contentType as any,
          parsedStartDate,
          parsedEndDate
        );
        break;
      default:
        return res.status(400).json({ 
          error: 'Invalid metric. Must be one of: views, performance, publishing' 
        });
    }

    // Apply edge caching for better performance
    applyEdgeCaching(res, {
      maxAge: 60 * 5, // 5 minutes
      staleWhileRevalidate: 60 * 60, // 1 hour
    });

    // Return the analytics data
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error retrieving resources analytics:', error);
    return res.status(500).json({ error: 'Failed to retrieve analytics data' });
  }
}
