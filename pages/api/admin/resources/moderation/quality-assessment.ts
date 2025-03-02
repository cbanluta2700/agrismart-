import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { analyzeContentQuality, getContentQualityAssessments } from '@/lib/moderation/content-quality';
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
    case 'POST':
      return handlePost(req, res, user.id);
    case 'GET':
      return handleGet(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * Handle POST request to analyze content quality
 */
async function handlePost(req: NextApiRequest, res: NextApiResponse, moderatorId: string) {
  try {
    const { resourceId, context } = req.body;
    
    if (!resourceId) {
      return res.status(400).json({ error: 'Resource ID is required' });
    }
    
    // Get the resource
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        contentRaw: true, // Assuming this field exists to store raw content
      },
    });
    
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    // Extract content based on resource type
    let content = '';
    if (resource.contentRaw) {
      content = typeof resource.contentRaw === 'string' 
        ? resource.contentRaw 
        : JSON.stringify(resource.contentRaw);
    } else if (resource.description) {
      content = resource.description;
    } else {
      return res.status(400).json({ error: 'Resource has no content to analyze' });
    }
    
    // Prepare context for analysis
    const analysisContext = {
      title: resource.title,
      ...context,
    };
    
    // Analyze content quality
    const assessment = await analyzeContentQuality(
      content,
      resource.id,
      resource.type as ResourceType,
      analysisContext
    );
    
    // Return the assessment
    res.status(200).json({ assessment });
  } catch (error) {
    console.error('Error analyzing content quality:', error);
    res.status(500).json({ error: 'Failed to analyze content quality' });
  }
}

/**
 * Handle GET request to retrieve quality assessments
 */
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { resourceId } = req.query;
    
    if (!resourceId || typeof resourceId !== 'string') {
      return res.status(400).json({ error: 'Resource ID is required' });
    }
    
    // Get assessments for the resource
    const assessments = await getContentQualityAssessments(resourceId);
    
    // Get the resource details
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        status: true,
        flaggedForReview: true,
        flagReason: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    // Return resource and its assessments
    res.status(200).json({
      resource,
      assessments,
    });
  } catch (error) {
    console.error('Error retrieving quality assessments:', error);
    res.status(500).json({ error: 'Failed to retrieve quality assessments' });
  }
}
