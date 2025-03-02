import { ResourceStatus, ResourceType } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { ZodError, z } from 'zod';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { performBulkModeration, getResourcesForBulkModeration } from '@/lib/moderation/bulk-moderation';

// Define the schema for bulk moderation request
const bulkModerationSchema = z.object({
  resourceIds: z.array(z.string()).min(1, 'At least one resource ID must be provided'),
  action: z.enum(['approve', 'reject', 'archive', 'feature', 'unfeature']),
  reason: z.string().optional(),
  sendNotifications: z.boolean().optional().default(true),
});

// Define the schema for resource filtering
const resourceFilterSchema = z.object({
  types: z.array(z.nativeEnum(ResourceType)).optional(),
  statuses: z.array(z.nativeEnum(ResourceStatus)).optional(),
  fromDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  toDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  searchTerm: z.string().optional(),
  authorId: z.string().optional(),
  limit: z.number().optional().default(100),
});

/**
 * API handler for bulk moderation actions
 * Supports:
 * - POST: Perform bulk moderation action
 * - GET: Retrieve resources for bulk moderation
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify the user is authenticated and has admin or moderator role
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const userRole = session.user?.role;
  if (userRole !== 'ADMIN' && userRole !== 'MODERATOR') {
    return res.status(403).json({ message: 'Forbidden - Insufficient permissions' });
  }

  try {
    // Handle POST request for bulk moderation
    if (req.method === 'POST') {
      const validatedData = bulkModerationSchema.parse(req.body);
      
      const result = await performBulkModeration({
        ...validatedData,
        moderatorId: session.user.id,
      });
      
      if (result.success) {
        return res.status(200).json({ 
          message: 'Bulk moderation completed',
          ...result 
        });
      } else {
        return res.status(500).json({ 
          message: 'Bulk moderation failed',
          ...result 
        });
      }
    }
    
    // Handle GET request to retrieve resources for moderation
    else if (req.method === 'GET') {
      const validatedFilters = resourceFilterSchema.parse(req.query);
      
      const resources = await getResourcesForBulkModeration(validatedFilters);
      
      return res.status(200).json({ 
        resources,
        count: resources.length,
      });
    }
    
    // Handle unsupported methods
    else {
      return res.status(405).json({ message: 'Method not allowed' });
    }
  } 
  // Handle validation errors
  catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ 
        message: 'Validation error',
        errors: error.errors 
      });
    }
    
    console.error('Error in bulk moderation API:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
}
