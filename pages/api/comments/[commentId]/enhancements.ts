import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { z } from 'zod';
import { createLogger } from '@/lib/utils/logger';
import { 
  generateCommentEnhancements, 
  getCommentQualityEnhancement,
  applyQualityEnhancement
} from '@/lib/moderation/comment/quality-enhancement';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/api/rate-limit';

const logger = createLogger('api.comments.enhancements');

// Input validation schemas
const GetEnhancementsSchema = z.object({
  commentId: z.string().uuid(),
});

const ApplyEnhancementsSchema = z.object({
  commentId: z.string().uuid(),
  enhancedContent: z.string().min(1),
  appliedSuggestions: z.array(z.string()),
});

// Rate limiter for enhancement generation
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 100,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = session.user.id;
  const { commentId } = req.query;

  try {
    // Apply rate limiting
    await limiter.check(res, 10, `enhancements-${userId}`);

    switch (req.method) {
      case 'GET':
        // Get comment quality enhancements
        return await handleGetEnhancements(req, res, String(commentId), userId);
      
      case 'POST':
        // Generate new enhancements for a comment
        return await handleGenerateEnhancements(req, res, String(commentId), userId);
      
      case 'PUT':
        // Apply enhancements to a comment
        return await handleApplyEnhancements(req, res, userId);
      
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    logger.error(`Error handling comment enhancement request: ${error.message}`, error);
    
    if (error.message === 'Too many requests') {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle GET request to retrieve existing enhancements
 */
async function handleGetEnhancements(
  req: NextApiRequest, 
  res: NextApiResponse,
  commentId: string,
  userId: string
) {
  try {
    // Validate input
    GetEnhancementsSchema.parse({ commentId });
    
    // Check if comment exists and user has access
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { 
        id: true,
        authorId: true,
        postId: true,
        post: {
          select: {
            groupId: true,
          }
        }
      }
    });
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    // Check if user is either the author or a moderator of the group
    const isAuthor = comment.authorId === userId;
    const isModerator = await checkIfModerator(userId, comment.post.groupId);
    
    if (!isAuthor && !isModerator) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Get existing enhancements
    const enhancements = await getCommentQualityEnhancement(commentId);
    
    if (!enhancements) {
      return res.status(404).json({ error: 'No enhancements found for this comment' });
    }
    
    return res.status(200).json(enhancements);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request parameters', details: error.errors });
    }
    throw error;
  }
}

/**
 * Handle POST request to generate new enhancements
 */
async function handleGenerateEnhancements(
  req: NextApiRequest, 
  res: NextApiResponse,
  commentId: string,
  userId: string
) {
  try {
    // Validate input
    GetEnhancementsSchema.parse({ commentId });
    
    // Check if comment exists and user has access
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { 
        id: true, 
        content: true,
        authorId: true,
        postId: true,
        post: {
          select: {
            title: true,
            groupId: true,
          }
        }
      }
    });
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    // Check if user is either the author or a moderator of the group
    const isAuthor = comment.authorId === userId;
    const isModerator = await checkIfModerator(userId, comment.post.groupId);
    
    if (!isAuthor && !isModerator) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Generate enhancements
    const contextData = {
      postTitle: comment.post.title,
      isCurrentUserAuthor: isAuthor,
    };
    
    const enhancements = await generateCommentEnhancements(
      commentId,
      comment.content,
      undefined, // Let the function fetch analysis if needed
      contextData
    );
    
    return res.status(200).json(enhancements);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request parameters', details: error.errors });
    }
    throw error;
  }
}

/**
 * Handle PUT request to apply enhancements
 */
async function handleApplyEnhancements(
  req: NextApiRequest, 
  res: NextApiResponse,
  userId: string
) {
  try {
    // Validate input
    const data = ApplyEnhancementsSchema.parse(req.body);
    
    // Apply the enhancements
    const success = await applyQualityEnhancement(
      data.commentId,
      data.enhancedContent,
      userId,
      data.appliedSuggestions
    );
    
    if (!success) {
      return res.status(400).json({ error: 'Failed to apply enhancements' });
    }
    
    return res.status(200).json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request parameters', details: error.errors });
    }
    throw error;
  }
}

/**
 * Helper function to check if a user is a moderator of a group
 */
async function checkIfModerator(userId: string, groupId: string): Promise<boolean> {
  const userRole = await prisma.groupMember.findFirst({
    where: {
      userId,
      groupId,
      role: {
        in: ['ADMIN', 'MODERATOR']
      }
    }
  });
  
  return !!userRole;
}
