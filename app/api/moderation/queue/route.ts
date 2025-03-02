import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { ContentType, ModerationPriority, ModerationStatus } from '@prisma/client';
import { applyModerationRules } from '@/lib/moderation/rules';
import { checkContentWithAI } from '@/lib/moderation/ai-check';
import { cachedResponse } from '@/lib/vercel/cache-control';
import { getModerationFeatureFlag } from '@/lib/vercel/edge-config';
import { 
  trackModerationQueueView, 
  trackModerationAction,
  trackModerationQueuePerformance,
  trackAIModerationResult
} from '@/lib/vercel/moderation-analytics';
import { 
  updateModeratedContent, 
  generateModerationToken 
} from '@/lib/moderation/database-moderation-service';

// Schema for submitting content to moderation queue
const submitSchema = z.object({
  contentId: z.string(),
  contentType: z.nativeEnum(ContentType),
  reason: z.string().optional(),
  priority: z.nativeEnum(ModerationPriority).optional(),
  content: z.string().optional(), // Actual content for AI checking if needed
  metadata: z.record(z.any()).optional(), // Additional metadata about the content
});

// Schema for getting moderation queue items
const getQueueSchema = z.object({
  status: z.nativeEnum(ModerationStatus).optional(),
  contentType: z.nativeEnum(ContentType).optional(),
  priority: z.nativeEnum(ModerationPriority).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// POST - Submit content to moderation queue
export async function POST(request: NextRequest) {
  const startTime = Date.now(); // For performance tracking
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const data = await request.json();
    const validated = submitSchema.parse(data);
    
    // Check if already in queue
    const existing = await prisma.moderationQueue.findFirst({
      where: {
        contentId: validated.contentId,
        contentType: validated.contentType,
        status: {
          in: ['PENDING', 'IN_REVIEW']
        }
      }
    });
    
    if (existing) {
      return NextResponse.json(
        { message: 'Content already in moderation queue', id: existing.id },
        { status: 200 }
      );
    }
    
    // Process through AI moderation if content is provided
    let aiConfidenceScore = null;
    let autoFlagged = false;
    
    // Check if AI moderation is enabled via feature flag
    const useAI = await getModerationFeatureFlag('enableAIModeration', true);
    
    if (useAI && validated.content) {
      const aiResult = await checkContentWithAI(
        validated.content,
        validated.contentType
      );
      
      aiConfidenceScore = aiResult.confidenceScore;
      autoFlagged = aiResult.flagged;
      
      // Track AI moderation result in Vercel Analytics 
      trackAIModerationResult(
        validated.contentType, 
        aiResult.confidenceScore, 
        aiResult.flagged ? 'flagged' : 'clean'
      );
    }
    
    // Apply moderation rules
    const ruleResult = await applyModerationRules(
      validated.contentType,
      validated.content || '',
      validated.metadata
    );
    
    // Create moderation queue item
    const queueItem = await prisma.moderationQueue.create({
      data: {
        contentId: validated.contentId,
        contentType: validated.contentType,
        reason: validated.reason,
        priority: validated.priority || ruleResult.priority || 'NORMAL',
        reporterId: session.user.id,
        autoFlagged: autoFlagged || ruleResult.autoFlagged,
        aiConfidenceScore,
        status: ruleResult.autoAction ? ruleResult.status : 'PENDING',
        actionTaken: ruleResult.autoAction,
      }
    });
    
    // If there was an automated action, create history record
    if (ruleResult.autoAction) {
      await prisma.moderationHistory.create({
        data: {
          queueItemId: queueItem.id,
          status: ruleResult.status,
          actionTaken: ruleResult.autoAction,
          notes: `Automated action: ${ruleResult.reason}`,
        }
      });
    }
    
    // Also update the ModeratedContent record using our database service
    if (validated.content) {
      await updateModeratedContent(
        validated.contentType,
        validated.contentId,
        {
          originalContent: validated.content,
          moderationStatus: queueItem.status as ModerationStatus,
          reason: validated.reason,
          aiScore: aiConfidenceScore
        }
      );
    }
    
    // Generate a moderation token if needed
    let moderationToken = null;
    if (queueItem.status === 'PENDING' || queueItem.status === 'NEEDS_REVIEW') {
      moderationToken = await generateModerationToken(
        validated.contentType,
        validated.contentId,
        session.user.id,
        24, // 24 hour expiration
        5,  // 5 uses max
        validated.reason
      );
    }
    
    // Track performance in Vercel Analytics
    const loadTime = Date.now() - startTime;
    trackModerationQueuePerformance(loadTime, 1);
    
    return NextResponse.json({ 
      id: queueItem.id, 
      status: queueItem.status,
      autoFlagged: queueItem.autoFlagged,
      moderationToken: moderationToken?.token
    });
    
  } catch (error) {
    console.error('Error submitting to moderation queue:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Failed to submit content for moderation' }, { status: 500 });
  }
}

// GET - Retrieve moderation queue with filters
export async function GET(request: NextRequest) {
  const startTime = Date.now(); // For performance tracking
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has moderation permissions
    const userPermissions = await prisma.userPermission.findMany({
      where: {
        userId: session.user.id,
        permission: {
          in: ['ADMIN', 'MODERATOR']
        }
      }
    });
    
    const isModerator = userPermissions.length > 0;
    
    if (!isModerator) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const { status, contentType, priority, page, limit } = getQueueSchema.parse(queryParams);
    
    // Build where clause for query
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (contentType) {
      where.contentType = contentType;
    }
    
    if (priority) {
      where.priority = priority;
    }
    
    // Query moderation queue items
    const [queueItems, totalCount] = await Promise.all([
      prisma.moderationQueue.findMany({
        where,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          submittedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          },
          reviewedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          },
          history: {
            orderBy: {
              createdAt: 'desc'
            },
            take: 5, // Latest 5 history items
          }
        }
      }),
      prisma.moderationQueue.count({ where })
    ]);
    
    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    // Track view in Vercel Analytics
    const filterParams = {
      status: status || 'all',
      contentType: contentType || 'all',
      priority: priority || 'all',
      page: page.toString()
    };
    trackModerationQueueView(filterParams);
    
    // Track performance in Vercel Analytics
    const loadTime = Date.now() - startTime;
    trackModerationQueuePerformance(loadTime, queueItems.length, filterParams);
    
    // Return with caching for better performance
    const enableEdgeCaching = await getModerationFeatureFlag('enableEdgeCaching', true);
    
    if (enableEdgeCaching) {
      return cachedResponse({
        items: queueItems, 
        pagination: {
          page,
          limit,
          totalItems: totalCount,
          totalPages,
          hasNextPage,
          hasPrevPage
        }
      }, 
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      },
      {
        duration: 'shortTerm', // Cache for a short time as moderation queue changes frequently
        staleWhileRevalidate: true
      });
    } else {
      // No caching if feature is disabled
      return NextResponse.json({
        items: queueItems, 
        pagination: {
          page,
          limit,
          totalItems: totalCount,
          totalPages,
          hasNextPage,
          hasPrevPage
        }
      });
    }
    
  } catch (error) {
    console.error('Error retrieving moderation queue:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request parameters', details: error.errors }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Failed to retrieve moderation queue' }, { status: 500 });
  }
}

// Export config for Vercel Edge functions
export const config = {
  runtime: 'edge',
  regions: 'auto'
};
