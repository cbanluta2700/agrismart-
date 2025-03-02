import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { moderateContent, queueCommentForModeration } from '@/lib/vercel/ai-moderation';
import { trackModerationAction } from '@/lib/vercel/moderation-analytics';
import { getAuthOptions } from '@/lib/auth';
import { generateId } from '@/lib/utils/id';
import { logger } from '@/lib/utils/logger';

// Schema for request validation
const moderationRequestSchema = z.object({
  content: z.string().min(1).max(10000),
  contentId: z.string().optional(),
  contentType: z.enum(['comment', 'post', 'message', 'profile', 'other']).default('comment'),
  sensitivityLevel: z.number().min(0).max(1).default(0.7),
  categories: z.array(z.string()).optional()
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate the request body
    const body = await request.json();
    const validationResult = moderationRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validationResult.error.format()
        },
        { status: 400 }
      );
    }
    
    const { content, contentId, contentType, sensitivityLevel, categories } = validationResult.data;
    
    // Get the current session for user identification
    const session = await getServerSession(getAuthOptions() as any);
    const userId = session?.user?.id || 'anonymous';
    
    // Generate a content ID if one wasn't provided
    const finalContentId = contentId || `${contentType}:${generateId()}`;
    
    // Check if content should be moderated
    const moderationResult = await moderateContent(
      content,
      sensitivityLevel,
      categories
    );
    
    // Track this moderation check in analytics
    await trackModerationAction({
      contentId: finalContentId,
      action: moderationResult.isFlagged ? 'flagged' : 'approved',
      reason: moderationResult.flaggedCategories?.join(', ') || 'routine_check',
      userId,
      automated: true,
      source: 'ai-moderation-api'
    });
    
    // Return the moderation result
    return NextResponse.json({
      contentId: finalContentId,
      flagged: moderationResult.isFlagged,
      categories: moderationResult.categories,
      categoryScores: moderationResult.categoryScores,
      flaggedCategories: moderationResult.flaggedCategories
    });
  } catch (error) {
    // Log the error
    logger.error('Error in AI moderation API', { error });
    
    // Return a generic error response
    return NextResponse.json(
      {
        error: 'Failed to process moderation request',
        message: (error as Error).message
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Check if the user has permission to access this endpoint
  const session = await getServerSession(getAuthOptions() as any);
  
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // Only allow admins and moderators to access this endpoint
  const userRole = session?.user?.role || 'USER';
  if (!['ADMIN', 'MODERATOR'].includes(userRole)) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }
  
  // This endpoint can be used to check the moderation service status
  return NextResponse.json({
    status: 'operational',
    provider: process.env.OPENAI_API_KEY ? 'openai' : 'internal',
    features: {
      textModeration: true,
      commentQueueing: true,
      analyticsTracking: true
    }
  });
}
