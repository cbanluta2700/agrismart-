import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { trackModerationCleanupJob } from '@/lib/vercel/moderation-analytics';
import { invalidateModerationCache } from '@/lib/vercel/cache-control';
import { clearOldNotifications } from '@/lib/vercel/notification-service';
import { addDays, addHours, subDays } from 'date-fns';
import { logger } from '@/lib/utils/logger';

/**
 * Cleanup routine for the moderation system
 * This endpoint is called daily via a Vercel cron job to:
 * 1. Remove expired moderation tokens
 * 2. Auto-approve content that's been in PENDING state for too long
 * 3. Clean up moderation logs older than the retention period
 * 4. Clean up old moderation notifications
 */
export async function GET(request: Request) {
  // Track job execution start time
  const startTime = Date.now();
  let cleanupStatus = 'success';
  let error = null;
  
  try {
    // 1. Clean up expired tokens
    const tokenExpiryDate = addDays(new Date(), -1);
    const { count: deletedTokens } = await prisma.moderationToken.deleteMany({
      where: {
        createdAt: {
          lt: tokenExpiryDate
        }
      }
    });
    
    logger.info(`Deleted ${deletedTokens} expired moderation tokens`);
    
    // 2. Auto-approve old pending content (over 72 hours)
    const pendingContentExpiryDate = addHours(new Date(), -72);
    const pendingContents = await prisma.moderatedContent.findMany({
      where: {
        moderationStatus: 'PENDING',
        createdAt: {
          lt: pendingContentExpiryDate
        }
      },
      select: {
        id: true,
        contentType: true,
        contentId: true
      }
    });
    
    // Update status and make content visible
    const autoApprovalPromises = pendingContents.map(async (content) => {
      // Update moderation status to AUTO_APPROVED
      await prisma.moderatedContent.update({
        where: { id: content.id },
        data: {
          moderationStatus: 'AUTO_APPROVED',
          reason: 'Auto-approved due to age (72+ hours with no review)'
        }
      });
      
      // Log auto approval action
      await prisma.moderationLog.create({
        data: {
          contentId: content.id,
          action: 'AUTO_APPROVE',
          reason: 'Auto-approved due to timeout',
          contentType: content.contentType
        }
      });
      
      // Also make the content visible - different tables for different content types
      switch (content.contentType) {
        case 'COMMENT':
          await prisma.comment.update({
            where: { id: content.contentId },
            data: { visible: true }
          });
          break;
        case 'FORUM_POST':
          await prisma.forumPost.update({
            where: { id: content.contentId },
            data: { visible: true }
          });
          break;
        case 'REVIEW':
          await prisma.review.update({
            where: { id: content.contentId },
            data: { visible: true }
          });
          break;
        // Add other content types as needed
      }
      
      // Invalidate cache for this item
      await invalidateModerationCache(content.contentType, content.contentId);
    });
    
    // Wait for all auto approvals to complete
    await Promise.all(autoApprovalPromises);
    
    logger.info(`Auto-approved ${pendingContents.length} pending content items due to age`);
    
    // 3. Clean up old moderation logs (older than 90 days)
    const logRetentionDate = subDays(new Date(), 90);
    const { count: deletedLogs } = await prisma.moderationLog.deleteMany({
      where: {
        createdAt: {
          lt: logRetentionDate
        }
      }
    });
    
    logger.info(`Deleted ${deletedLogs} moderation logs older than 90 days`);
    
    // 4. Clean up old notifications (older than 30 days)
    const clearedNotificationsCount = await clearOldNotifications(30);
    
    logger.info(`Cleared ${clearedNotificationsCount} old notifications`);
    
    // Successful cleanup completed
    const response = {
      status: 'success',
      expiredTokensDeleted: deletedTokens,
      autoApprovedContents: pendingContents.length,
      oldLogsDeleted: deletedLogs,
      oldNotificationsCleared: clearedNotificationsCount,
      executionTimeMs: Date.now() - startTime
    };
    
    // Track successful job execution
    await trackModerationCleanupJob(
      'success',
      response.executionTimeMs,
      {
        expiredTokensDeleted: deletedTokens,
        autoApprovedContents: pendingContents.length,
        oldLogsDeleted: deletedLogs,
        oldNotificationsCleared: clearedNotificationsCount
      }
    );
    
    // Invalidate all moderation analytics caches
    await invalidateModerationCache('analytics', 'summary');
    
    return NextResponse.json(response);
  } catch (err) {
    // Handle errors
    logger.error('Error in moderation cleanup:', err);
    cleanupStatus = 'error';
    error = err instanceof Error ? err.message : 'Unknown error';
    
    // Track failed job execution
    await trackModerationCleanupJob(
      'error',
      Date.now() - startTime,
      { error }
    );
    
    return NextResponse.json(
      {
        status: 'error',
        message: 'Moderation cleanup job failed',
        error,
        executionTimeMs: Date.now() - startTime
      },
      { status: 500 }
    );
  }
}

// Export config for Edge functions
export const config = {
  runtime: 'edge',
  regions: 'auto'
};
