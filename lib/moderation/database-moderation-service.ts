/**
 * Vercel SDK Integrated Moderation Service
 * Optimized for Vercel's serverless environment
 */

import { prisma } from '@/lib/prisma';
import { 
  ContentType, 
  ModerationStatus, 
  ModerationAction, 
  ModerationPriority,
  ModerationToken,
  ModeratedContent,
  CommentModerationLog
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { cachedResponse, withCacheControl } from '@/lib/vercel/cache-control';
import { getModerationFeatureFlag } from '@/lib/vercel/edge-config';
import { trackModerationAction, trackAIModerationResult } from '@/lib/vercel/moderation-analytics';

/**
 * Generate a moderation token for a specific content item
 * Optimized for Vercel serverless functions
 */
export async function generateModerationToken(
  contentType: ContentType,
  contentId: string,
  userId?: string,
  expiresInHours: number = 24,
  maxUsageCount?: number,
  reason?: string,
): Promise<ModerationToken> {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);
  
  const token = await prisma.moderationToken.create({
    data: {
      token: randomUUID(),
      contentType,
      contentId,
      createdById: userId,
      expiresAt,
      maxUsageCount,
      issuedReason: reason,
    }
  });
  
  // Track token generation in Vercel Analytics if feature enabled
  const trackAnalytics = await getModerationFeatureFlag('showModerationAnalytics', true);
  if (trackAnalytics) {
    trackModerationAction(contentId, contentType, 'NO_ACTION', undefined);
  }
  
  return token;
}

/**
 * Validate a moderation token with Vercel edge caching
 */
export async function validateModerationToken(
  token: string,
): Promise<{ valid: boolean; token?: ModerationToken; error?: string }> {
  try {
    // Check if edge caching is enabled
    const enableEdgeCaching = await getModerationFeatureFlag('enableEdgeCaching', true);
    
    // Find the token
    const moderationToken = await prisma.moderationToken.findUnique({
      where: { token },
    });
    
    // Token doesn't exist
    if (!moderationToken) {
      return { valid: false, error: 'Invalid token' };
    }
    
    // Token is revoked
    if (moderationToken.revoked) {
      return { valid: false, error: 'Token has been revoked' };
    }
    
    // Token is expired
    if (moderationToken.expiresAt < new Date()) {
      return { valid: false, error: 'Token has expired' };
    }
    
    // Token has reached max usage
    if (
      moderationToken.maxUsageCount !== null &&
      moderationToken.currentUsageCount >= moderationToken.maxUsageCount
    ) {
      return { valid: false, error: 'Token usage limit reached' };
    }
    
    // Update usage count
    await prisma.moderationToken.update({
      where: { id: moderationToken.id },
      data: {
        currentUsageCount: {
          increment: 1,
        },
      },
    });
    
    return { valid: true, token: moderationToken };
  } catch (error) {
    console.error('Error validating token:', error);
    return { valid: false, error: 'Failed to validate token' };
  }
}

/**
 * Revoke a moderation token
 */
export async function revokeModerationToken(token: string): Promise<boolean> {
  try {
    await prisma.moderationToken.update({
      where: { token },
      data: { revoked: true },
    });
    return true;
  } catch (error) {
    console.error('Error revoking token:', error);
    return false;
  }
}

/**
 * Create or update moderated content with AI integration
 */
export async function updateModeratedContent(
  contentType: ContentType,
  contentId: string,
  data: {
    originalContent?: string;
    modifiedContent?: string;
    moderationStatus?: ModerationStatus;
    moderatedById?: string;
    reason?: string;
    aiScore?: number;
  }
): Promise<ModeratedContent> {
  const useAI = await getModerationFeatureFlag('enableAIModeration', true);
  const aiConfidenceThreshold = await getModerationFeatureFlag('moderationAIConfidenceThreshold', 0.8);
  
  // Check if entry exists
  const existing = await prisma.moderatedContent.findUnique({
    where: {
      contentType_contentId: {
        contentType,
        contentId,
      }
    }
  });
  
  // If AI moderation is enabled and we have content, potentially use AI
  if (useAI && (data.originalContent || data.modifiedContent) && data.aiScore) {
    // Track AI moderation result
    const aiDecision = data.aiScore > aiConfidenceThreshold ? 'flagged' : 'clean';
    trackAIModerationResult(contentType, data.aiScore, aiDecision);
    
    // Auto-set status based on AI if not explicitly provided
    if (!data.moderationStatus) {
      data.moderationStatus = aiDecision === 'flagged' ? 'NEEDS_REVIEW' : 'AUTO_APPROVED';
    }
  }
  
  if (existing) {
    // Update existing entry
    return await prisma.moderatedContent.update({
      where: {
        contentType_contentId: {
          contentType,
          contentId,
        }
      },
      data: {
        ...data,
        moderatedAt: data.moderationStatus ? new Date() : undefined,
        updatedAt: new Date(),
      }
    });
  } else {
    // Create new entry
    return await prisma.moderatedContent.create({
      data: {
        contentType,
        contentId,
        originalContent: data.originalContent,
        modifiedContent: data.modifiedContent,
        moderationStatus: data.moderationStatus || 'PENDING',
        moderatedById: data.moderatedById,
        moderatedAt: data.moderationStatus ? new Date() : undefined,
        reason: data.reason,
        aiScore: data.aiScore,
      }
    });
  }
}

/**
 * Get moderated content by content type and ID with Vercel edge caching
 */
export async function getModeratedContent(
  contentType: ContentType,
  contentId: string
): Promise<ModeratedContent | null> {
  return await prisma.moderatedContent.findUnique({
    where: {
      contentType_contentId: {
        contentType,
        contentId,
      }
    }
  });
}

/**
 * Log a comment moderation action with Vercel analytics tracking
 */
export async function logCommentModeration(
  commentId: string,
  action: ModerationAction,
  data?: {
    reviewerId?: string;
    previousContent?: string;
    updatedContent?: string;
    reason?: string;
    systemGenerated?: boolean;
  }
): Promise<CommentModerationLog> {
  const log = await prisma.commentModerationLog.create({
    data: {
      commentId,
      reviewerId: data?.reviewerId,
      action,
      previousContent: data?.previousContent,
      updatedContent: data?.updatedContent,
      reason: data?.reason,
      systemGenerated: data?.systemGenerated || false,
    }
  });
  
  // Track in Vercel Analytics
  const trackAnalytics = await getModerationFeatureFlag('showModerationAnalytics', true);
  if (trackAnalytics) {
    trackModerationAction(commentId, 'COMMENT', action);
  }
  
  return log;
}

/**
 * Get moderation logs for a specific comment with optimized caching
 */
export async function getCommentModerationLogs(
  commentId: string
): Promise<CommentModerationLog[]> {
  return await prisma.commentModerationLog.findMany({
    where: { commentId },
    orderBy: { createdAt: 'desc' },
    include: {
      reviewer: {
        select: {
          id: true,
          name: true,
          image: true,
        }
      }
    }
  });
}

/**
 * Get all content pending moderation with pagination and Vercel edge optimization
 */
export async function getPendingModeration(
  options?: {
    contentType?: ContentType;
    page?: number;
    limit?: number;
    includeAiChecked?: boolean;
  }
): Promise<{
  items: ModeratedContent[];
  totalCount: number;
  pageCount: number;
}> {
  const page = options?.page || 1;
  const limit = options?.limit || 20;
  
  // Build where clause
  const where: any = {
    moderationStatus: options?.includeAiChecked 
      ? { in: ['PENDING', 'NEEDS_REVIEW'] }
      : 'PENDING'
  };
  
  if (options?.contentType) {
    where.contentType = options.contentType;
  }
  
  // Get counts and items
  const [totalCount, items] = await Promise.all([
    prisma.moderatedContent.count({ where }),
    prisma.moderatedContent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        moderatedBy: {
          select: {
            id: true,
            name: true,
            image: true,
          }
        }
      }
    })
  ]);
  
  const pageCount = Math.ceil(totalCount / limit);
  
  return {
    items,
    totalCount,
    pageCount
  };
}
