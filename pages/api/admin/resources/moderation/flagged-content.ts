import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { getFlaggedResources, updateQualityAssessmentFeedback } from '@/lib/moderation/content-quality';
import { prisma } from '@/lib/prisma';
import { ResourceType } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify user authentication and authorization
  const session = await getServerSession(req, res, authOptions);
  
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Check if user is an admin or moderator
  const user = await prisma.user.findUnique({
    where: { email: session.user.email || '' },
    select: { id: true, role: true },
  });
  
  if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
    return res.status(403).json({ error: 'Forbidden: Only administrators and moderators can access this endpoint' });
  }
  
  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return handleGet(req, res);
    case 'POST':
      return handlePost(req, res, user.id);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * Handle GET request to retrieve flagged resources
 */
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { limit, offset, types } = req.query;
    
    // Parse query parameters
    const options = {
      limit: limit ? parseInt(limit as string, 10) : 20,
      offset: offset ? parseInt(offset as string, 10) : 0,
      types: types ? (types as string).split(',') as ResourceType[] : undefined,
    };
    
    // Get flagged resources
    const result = await getFlaggedResources(options);
    
    // Return the result
    res.status(200).json(result);
  } catch (error) {
    console.error('Error retrieving flagged resources:', error);
    res.status(500).json({ error: 'Failed to retrieve flagged resources' });
  }
}

/**
 * Handle POST request to update moderator feedback
 */
async function handlePost(req: NextApiRequest, res: NextApiResponse, moderatorId: string) {
  try {
    const { resourceId, feedback } = req.body;
    
    if (!resourceId) {
      return res.status(400).json({ error: 'Resource ID is required' });
    }
    
    if (!feedback || typeof feedback !== 'object') {
      return res.status(400).json({ error: 'Feedback data is required' });
    }
    
    if (!feedback.actionTaken || !['approved', 'rejected', 'improvements_requested'].includes(feedback.actionTaken)) {
      return res.status(400).json({ error: 'Invalid action taken' });
    }
    
    // Update the quality assessment with moderator feedback
    const result = await updateQualityAssessmentFeedback(resourceId, moderatorId, feedback);
    
    // Return success response
    res.status(200).json(result);
  } catch (error) {
    console.error('Error updating quality assessment feedback:', error);
    res.status(500).json({ error: 'Failed to update quality assessment feedback' });
  }
}
