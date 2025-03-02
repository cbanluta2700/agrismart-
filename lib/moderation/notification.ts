import { prisma } from '@/lib/prisma';
import { User, Comment, ModerationAction } from '@prisma/client';
import { trackModerationActivity } from '@/lib/vercel/moderation-analytics';
import { runPostResponseTask } from '@/lib/vercel/fluid-compute';

export type NotificationType = 
  | 'comment_reported' 
  | 'comment_requires_review' 
  | 'moderation_action_taken' 
  | 'appeal_submitted';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

interface NotificationData {
  commentId?: string;
  reportId?: string;
  reportCount?: number;
  moderationActionId?: string;
  appealId?: string;
  actionType?: ModerationAction;
  message?: string;
}

/**
 * Create a notification for moderators about a comment that needs attention
 */
export async function createModeratorNotification(
  type: NotificationType,
  priority: NotificationPriority,
  data: NotificationData
) {
  try {
    // Create the notification in the database
    const notification = await prisma.moderationNotification.create({
      data: {
        type,
        priority,
        data: JSON.stringify(data),
        read: false,
        sentAt: new Date(),
      },
    });

    // Run analytics tracking as a background task
    runPostResponseTask(async () => {
      await trackModerationActivity('notification_created', {
        notificationId: notification.id,
        type,
        priority,
      });
    });

    return { success: true, notificationId: notification.id };
  } catch (error) {
    console.error('Failed to create moderator notification:', error);
    return { success: false, error: 'Failed to create notification' };
  }
}

/**
 * Create a notification when a comment is reported
 */
export async function notifyCommentReported(
  commentId: string,
  reportId: string,
  reportCount: number,
  reportReason: string
) {
  const priority = getPriorityBasedOnReportCount(reportCount);
  
  return createModeratorNotification('comment_reported', priority, {
    commentId,
    reportId,
    reportCount,
    message: `Comment reported for: ${reportReason}. This comment has been reported ${reportCount} time(s).`,
  });
}

/**
 * Create a notification when AI analysis flags a comment for review
 */
export async function notifyCommentRequiresReview(
  commentId: string,
  aiConfidence: number,
  flaggedCategories: string[]
) {
  const priority = getPriorityBasedOnAIConfidence(aiConfidence);
  
  return createModeratorNotification('comment_requires_review', priority, {
    commentId,
    message: `AI flagged comment for review with ${aiConfidence.toFixed(2)}% confidence. Categories: ${flaggedCategories.join(', ')}`,
  });
}

/**
 * Create a notification when a moderation action is taken on a comment
 */
export async function notifyModerationActionTaken(
  commentId: string,
  actionType: ModerationAction,
  moderatorId: string
) {
  return createModeratorNotification('moderation_action_taken', 'medium', {
    commentId,
    actionType,
    message: `Moderation action '${actionType}' taken on comment ${commentId} by moderator ${moderatorId}`,
  });
}

/**
 * Create a notification when a user appeals a comment moderation decision
 */
export async function notifyAppealSubmitted(
  commentId: string,
  appealId: string
) {
  return createModeratorNotification('appeal_submitted', 'high', {
    commentId,
    appealId,
    message: `User submitted an appeal for comment ${commentId}`,
  });
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  try {
    await prisma.moderationNotification.update({
      where: { id: notificationId },
      data: { read: true, readAt: new Date() },
    });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    return { success: false, error: 'Failed to update notification' };
  }
}

/**
 * Get unread notifications for moderators
 */
export async function getUnreadNotifications(limit = 50) {
  return prisma.moderationNotification.findMany({
    where: { read: false },
    orderBy: [
      { priority: 'desc' },
      { sentAt: 'desc' },
    ],
    take: limit,
  });
}

/**
 * Get all notifications with pagination
 */
export async function getAllNotifications(page = 1, pageSize = 20) {
  const skip = (page - 1) * pageSize;
  
  const [notifications, total] = await Promise.all([
    prisma.moderationNotification.findMany({
      orderBy: [
        { sentAt: 'desc' },
      ],
      skip,
      take: pageSize,
    }),
    prisma.moderationNotification.count(),
  ]);
  
  return { 
    notifications, 
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Helper: Determine priority based on report count
 */
function getPriorityBasedOnReportCount(count: number): NotificationPriority {
  if (count >= 5) return 'urgent';
  if (count >= 3) return 'high';
  if (count >= 2) return 'medium';
  return 'low';
}

/**
 * Helper: Determine priority based on AI confidence
 */
function getPriorityBasedOnAIConfidence(confidence: number): NotificationPriority {
  if (confidence >= 90) return 'urgent';
  if (confidence >= 75) return 'high';
  if (confidence >= 50) return 'medium';
  return 'low';
}
