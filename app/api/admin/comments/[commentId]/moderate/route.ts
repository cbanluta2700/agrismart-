/**
 * API endpoint for moderating comments
 * Allows admins and moderators to approve or reject comments
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/utils/logger';
import { authOptions } from '@/lib/auth';
import { runPostResponseTask } from '@/lib/vercel/fluid-compute';
import { createPublicClient } from '@vercel/analytics';

// Create a dedicated logger for moderation actions
const routeLogger = logger.child('api.admin.comments.moderate');

// Analytics client for tracking moderation actions
const analytics = createPublicClient({
  debug: process.env.NODE_ENV === 'development'
});

// Moderation request validation schema
const moderationRequestSchema = z.object({
  action: z.enum(['approve', 'reject']),
  moderatorId: z.string().min(1),
  reason: z.string().optional(),
});

/**
 * Moderate a comment (approve or reject)
 */
export async function POST(
  request: Request,
  { params }: { params: { commentId: string } }
) {
  const startTime = Date.now();
  const { commentId } = params;
  
  try {
    // Verify admin/moderator authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !session.user.roles?.some(role => 
      ['ADMIN', 'MODERATOR'].includes(role)
    )) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Unauthorized access' 
        },
        { status: 403 }
      );
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = moderationRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      routeLogger.warn('Invalid moderation request', { errors: validationResult.error.format() });
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Invalid moderation data',
          errors: validationResult.error.format()
        },
        { status: 400 }
      );
    }
    
    const { action, moderatorId, reason } = validationResult.data;
    
    // Check if the comment exists
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        reports: {
          select: { id: true }
        }
      }
    });
    
    if (!comment) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Comment not found' 
        },
        { status: 404 }
      );
    }
    
    // Update the comment moderation status
    const moderationStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
    const visible = action === 'approve';
    
    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        moderationStatus,
        visible,
        moderatedById: moderatorId,
        moderatedAt: new Date(),
        moderationReason: reason
      }
    });
    
    // Update all pending reports associated with this comment
    if (comment.reports.length > 0) {
      await prisma.report.updateMany({
        where: {
          commentId,
          status: 'PENDING'
        },
        data: {
          status: 'PROCESSED',
          processedAt: new Date(),
          processedById: moderatorId
        }
      });
    }
    
    // Create moderation log entry
    await prisma.moderationLog.create({
      data: {
        entityId: commentId,
        entityType: 'COMMENT',
        action: moderationStatus,
        moderatorId,
        reason,
        metadata: {
          authorId: comment.authorId,
          authorName: comment.author.name,
          commentContent: comment.content.substring(0, 100) + (comment.content.length > 100 ? '...' : '')
        }
      }
    });
    
    // Perform background tasks after response
    runPostResponseTask(
      async () => {
        // Track moderation action
        await analytics.track('comment_moderation_action', {
          commentId,
          moderatorId,
          action,
          executionTimeMs: Date.now() - startTime,
          reportCount: comment.reports.length,
          hasReason: !!reason
        });
        
        // Additional processes like sending notifications would go here
        // ...
        
        routeLogger.info(`Comment ${commentId} ${action}ed by moderator ${moderatorId}`, {
          moderatorId,
          commentId,
          action,
          authorId: comment.authorId
        });
      },
      {
        key: `comment-moderation-processing-${commentId}`,
        timeout: 30000 // 30 seconds timeout
      }
    );
    
    return NextResponse.json({
      status: 'success',
      message: `Comment ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      data: {
        commentId,
        moderationStatus: updatedComment.moderationStatus,
        visible: updatedComment.visible
      }
    });
  } catch (error) {
    routeLogger.error('Error moderating comment', error);
    
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to moderate comment',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
