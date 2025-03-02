import { prisma } from '@/lib/prisma';
import { notifyAppealSubmitted, notifyModerationActionTaken, notifyUserAppealUpdated } from '@/lib/vercel/notification-service';
import { trackModerationActivity } from '@/lib/vercel/moderation-analytics';
import { runPostResponseTask } from '@/lib/vercel/fluid-compute';
import { invalidateModerationCache } from '@/lib/vercel/cache-control';
import { z } from 'zod';

// Validation schema for appeal submission
export const AppealSubmissionSchema = z.object({
  commentId: z.string().uuid(),
  reason: z.string().min(10).max(1000),
  additionalInfo: z.string().max(2000).optional(),
});

// Types for appeal management
export type AppealStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type AppealSubmission = z.infer<typeof AppealSubmissionSchema>;

export type AppealWithDetails = {
  id: string;
  commentId: string;
  userId: string;
  reason: string;
  additionalInfo?: string | null;
  status: AppealStatus;
  moderatorNotes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  reviewedAt?: Date | null;
  reviewedBy?: string | null;
  user: {
    name: string | null;
    email: string | null;
  };
  comment: {
    content: string;
    createdAt: Date;
  };
};

/**
 * Submit an appeal for a moderated comment
 */
export async function submitAppeal(
  appealData: AppealSubmission,
  userId: string
): Promise<{ success: boolean; appealId?: string; error?: string }> {
  try {
    // Validate the appeal data
    AppealSubmissionSchema.parse(appealData);

    // Check if the comment exists
    const comment = await prisma.comment.findUnique({
      where: { id: appealData.commentId },
      select: { id: true, authorId: true, visible: true }
    });

    if (!comment) {
      return { success: false, error: 'Comment not found' };
    }
    
    // Check if this is the user's comment
    if (comment.authorId !== userId) {
      return { success: false, error: 'You can only appeal your own comments' };
    }

    // Check if the comment has actually been moderated
    if (comment.visible !== false) {
      return { success: false, error: 'This comment has not been moderated' };
    }

    // Check if an appeal already exists for this comment
    const existingAppeal = await prisma.moderationAppeal.findFirst({
      where: {
        commentId: appealData.commentId,
        userId: userId,
        status: 'PENDING'
      }
    });

    if (existingAppeal) {
      return { 
        success: false, 
        error: 'An appeal is already pending for this comment',
        appealId: existingAppeal.id
      };
    }

    // Create the appeal
    const appeal = await prisma.moderationAppeal.create({
      data: {
        commentId: appealData.commentId,
        userId: userId,
        reason: appealData.reason,
        additionalInfo: appealData.additionalInfo,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Run background tasks
    runPostResponseTask(async () => {
      // Create notification for moderators
      await notifyAppealSubmitted(appealData.commentId, appeal.id);

      // Track appeal submission
      await trackModerationActivity('appeal_submitted', {
        appealId: appeal.id,
        commentId: appealData.commentId,
        userId: userId
      });
    });

    return { success: true, appealId: appeal.id };
  } catch (error) {
    console.error('Error submitting appeal:', error);
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: `Invalid appeal data: ${error.errors.map(e => e.message).join(', ')}` 
      };
    }
    return { success: false, error: 'Failed to submit appeal' };
  }
}

/**
 * Get a list of pending appeals for moderation
 */
export async function getPendingAppeals(
  page = 1, 
  pageSize = 10
): Promise<{
  appeals: AppealWithDetails[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  try {
    const skip = (page - 1) * pageSize;
    const total = await prisma.moderationAppeal.count({
      where: { status: 'PENDING' }
    });

    const appeals = await prisma.moderationAppeal.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        comment: {
          select: {
            content: true,
            createdAt: true
          }
        }
      }
    });

    return {
      appeals: appeals as unknown as AppealWithDetails[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  } catch (error) {
    console.error('Error fetching pending appeals:', error);
    return {
      appeals: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0
    };
  }
}

/**
 * Get a specific appeal by ID
 */
export async function getAppealById(appealId: string): Promise<AppealWithDetails | null> {
  try {
    const appeal = await prisma.moderationAppeal.findUnique({
      where: { id: appealId },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        comment: {
          select: {
            content: true,
            createdAt: true
          }
        }
      }
    });

    return appeal as unknown as AppealWithDetails;
  } catch (error) {
    console.error('Error fetching appeal:', error);
    return null;
  }
}

/**
 * Approve an appeal and restore the comment
 */
export async function approveAppeal(
  appealId: string,
  moderatorId: string,
  moderatorNotes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the appeal
    const appeal = await prisma.moderationAppeal.findUnique({
      where: { id: appealId },
      include: {
        comment: true,
      },
    });

    if (!appeal) {
      return { success: false, error: 'Appeal not found' };
    }

    if (appeal.status !== 'PENDING') {
      return { success: false, error: 'This appeal has already been reviewed' };
    }

    // Update the appeal status
    const updatedAppeal = await prisma.moderationAppeal.update({
      where: { id: appealId },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewedBy: moderatorId,
        moderatorNotes,
      },
    });

    // Restore the comment visibility
    await prisma.comment.update({
      where: { id: appeal.commentId },
      data: {
        visible: true,
        updatedAt: new Date(),
      },
    });

    // Create notification for the user
    await createAppealStatusNotification(appealId, appeal.userId, 'APPROVED');

    // Run background tasks
    runPostResponseTask(async () => {
      // Create notification for moderators
      await notifyModerationActionTaken(
        appeal.commentId,
        'APPEAL_APPROVED',
        moderatorId
      );

      // Track action
      await trackModerationActivity('appeal_approved', {
        appealId,
        commentId: appeal.commentId,
        moderatorId
      });

      // Invalidate cache
      await invalidateModerationCache('comment', appeal.commentId);
    });

    return { success: true };
  } catch (error) {
    console.error('Error approving appeal:', error);
    return { success: false, error: 'Failed to approve appeal' };
  }
}

/**
 * Reject an appeal and keep the comment moderated
 */
export async function rejectAppeal(
  appealId: string,
  moderatorId: string,
  moderatorNotes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the appeal
    const appeal = await prisma.moderationAppeal.findUnique({
      where: { id: appealId }
    });

    if (!appeal) {
      return { success: false, error: 'Appeal not found' };
    }

    if (appeal.status !== 'PENDING') {
      return { success: false, error: 'This appeal has already been reviewed' };
    }

    // Update the appeal status
    const updatedAppeal = await prisma.moderationAppeal.update({
      where: { id: appealId },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
        reviewedBy: moderatorId,
        moderatorNotes,
      },
    });

    // Create notification for the user
    await createAppealStatusNotification(appealId, appeal.userId, 'REJECTED');

    // Run background tasks
    runPostResponseTask(async () => {
      // Track action
      await trackModerationActivity('appeal_rejected', {
        appealId,
        commentId: appeal.commentId,
        moderatorId
      });

      // Invalidate cache
      await invalidateModerationCache('comment', appeal.commentId);
    });

    return { success: true };
  } catch (error) {
    console.error('Error rejecting appeal:', error);
    return { success: false, error: 'Failed to reject appeal' };
  }
}

/**
 * Get user appeals
 */
export async function getUserAppeals(
  userId: string,
  page = 1,
  pageSize = 10
): Promise<{
  appeals: AppealWithDetails[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  try {
    const skip = (page - 1) * pageSize;
    const total = await prisma.moderationAppeal.count({
      where: { userId }
    });

    const appeals = await prisma.moderationAppeal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        comment: {
          select: {
            content: true,
            createdAt: true
          }
        }
      }
    });

    return {
      appeals: appeals as unknown as AppealWithDetails[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  } catch (error) {
    console.error('Error fetching user appeals:', error);
    return {
      appeals: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0
    };
  }
}

/**
 * Get appeals by status
 */
export async function getAppealsByStatus(
  status: string | null,
  page = 1, 
  pageSize = 10
): Promise<{
  appeals: AppealWithDetails[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  try {
    const skip = (page - 1) * pageSize;
    
    // Create the where clause based on status
    const whereClause = status && status !== 'all' 
      ? { status: status.toUpperCase() } 
      : {};
    
    const total = await prisma.moderationAppeal.count({
      where: whereClause
    });

    const appeals = await prisma.moderationAppeal.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        comment: {
          select: {
            content: true,
            createdAt: true
          }
        }
      }
    });

    return {
      appeals: appeals as unknown as AppealWithDetails[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  } catch (error) {
    console.error('Error fetching appeals by status:', error);
    return {
      appeals: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0
    };
  }
}

/**
 * Create a notification for a user when their appeal status changes
 */
export async function createAppealStatusNotification(
  appealId: string,
  userId: string,
  status: AppealStatus
): Promise<void> {
  try {
    // Create notification in the database
    await prisma.moderationAppealNotification.create({
      data: {
        appealId,
        userId,
        status,
        read: false,
        createdAt: new Date(),
      },
    });

    // Send notification to user
    await notifyUserAppealUpdated(appealId, userId, status);
  } catch (error) {
    console.error('Error creating appeal notification:', error);
  }
}

/**
 * Mark notifications as read for a specific appeal
 */
export async function markAppealNotificationsAsRead(
  appealId: string,
  userId: string
): Promise<void> {
  try {
    await prisma.moderationAppealNotification.updateMany({
      where: {
        appealId,
        userId,
      },
      data: {
        read: true,
      },
    });
  } catch (error) {
    console.error('Error marking appeal notifications as read:', error);
  }
}
