import { trackModerationActivity } from './moderation-analytics';
import { runPostResponseTask } from './fluid-compute';
import { Comment, ModerationAction } from '@prisma/client';
import { kv } from '@vercel/kv';

export type NotificationType = 
  | 'comment_reported' 
  | 'comment_requires_review' 
  | 'moderation_action_taken' 
  | 'appeal_submitted'
  | 'appeal_status_updated';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  data: Record<string, any>;
  timestamp: string;
  read: boolean;
  readAt?: string;
}

const NOTIFICATION_TTL = 60 * 60 * 24 * 30; // 30 days in seconds
const NOTIFICATION_KEY_PREFIX = 'notification:';
const NOTIFICATION_LIST_KEY = 'notifications:list';
const UNREAD_NOTIFICATION_LIST_KEY = 'notifications:unread';

/**
 * Create a notification for moderators about a comment that needs attention
 */
export async function createNotification(
  type: NotificationType,
  priority: NotificationPriority,
  data: Record<string, any>
): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  try {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const notification: Notification = {
      id,
      type,
      priority,
      data,
      timestamp: new Date().toISOString(),
      read: false,
    };

    // Store notification in KV store
    await kv.set(`${NOTIFICATION_KEY_PREFIX}${id}`, notification, { ex: NOTIFICATION_TTL });
    
    // Add to notification lists
    await kv.zadd(NOTIFICATION_LIST_KEY, { 
      score: Date.now(), 
      member: id 
    });
    
    await kv.zadd(UNREAD_NOTIFICATION_LIST_KEY, { 
      score: getPriorityScore(priority), 
      member: id 
    });

    // Track analytics as a background task
    runPostResponseTask(async () => {
      await trackModerationActivity('notification_created', {
        notificationId: id,
        type,
        priority,
        data: JSON.stringify(data),
      });
    });

    return { success: true, notificationId: id };
  } catch (error) {
    console.error('Failed to create notification:', error);
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
  const priority = getPriorityFromReportCount(reportCount);
  
  return createNotification('comment_reported', priority, {
    commentId,
    reportId,
    reportCount,
    reason: reportReason,
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
  const priority = getPriorityFromAIConfidence(aiConfidence);
  
  return createNotification('comment_requires_review', priority, {
    commentId,
    aiConfidence,
    flaggedCategories,
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
  return createNotification('moderation_action_taken', 'medium', {
    commentId,
    actionType,
    moderatorId,
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
  return createNotification('appeal_submitted', 'high', {
    commentId,
    appealId,
    message: `User submitted an appeal for a moderated comment. Appeal ID: ${appealId}`,
  });
}

/**
 * Notify user when their appeal status is updated
 */
export async function notifyUserAppealUpdated(
  appealId: string,
  userId: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // This would typically push a notification to the user
    // via email, push notification, or in-app notification
    
    // For now, we'll just log it and track it
    console.log(`Sending notification to user ${userId} about appeal ${appealId} status update to ${status}`);
    
    // Track the notification
    runPostResponseTask(async () => {
      await trackModerationActivity('user_appeal_notification_sent', {
        appealId,
        userId,
        status,
        timestamp: new Date().toISOString(),
      });
    });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to notify user about appeal update:', error);
    return { success: false, error: 'Failed to send user notification' };
  }
}

/**
 * Create a notification when a user's appeal status is updated
 */
export async function notifyAppealStatusUpdated(
  appealId: string,
  status: string
) {
  return createNotification('appeal_status_updated', 'medium', {
    appealId,
    status,
    message: `Appeal ${appealId} status updated to ${status}`,
  });
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the notification
    const key = `${NOTIFICATION_KEY_PREFIX}${notificationId}`;
    const notification: Notification | null = await kv.get(key);
    
    if (!notification) {
      return { success: false, error: 'Notification not found' };
    }
    
    // Update notification
    notification.read = true;
    notification.readAt = new Date().toISOString();
    
    // Save updated notification
    await kv.set(key, notification, { ex: NOTIFICATION_TTL });
    
    // Remove from unread list
    await kv.zrem(UNREAD_NOTIFICATION_LIST_KEY, notificationId);
    
    // Track the action
    runPostResponseTask(async () => {
      await trackModerationActivity('notification_marked_read', {
        notificationId,
        timestamp: new Date().toISOString(),
      });
    });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    return { success: false, error: 'Failed to update notification' };
  }
}

/**
 * Get unread notifications
 */
export async function getUnreadNotifications(limit = 50): Promise<Notification[]> {
  try {
    // Get notification IDs from the unread sorted set
    const ids = await kv.zrange(UNREAD_NOTIFICATION_LIST_KEY, 0, limit - 1);
    
    if (!ids.length) {
      return [];
    }
    
    // Get the actual notifications
    const keys = ids.map(id => `${NOTIFICATION_KEY_PREFIX}${id}`);
    const notifications = await kv.mget<Notification[]>(...keys);
    
    return notifications.filter(Boolean) as Notification[];
  } catch (error) {
    console.error('Failed to get unread notifications:', error);
    return [];
  }
}

/**
 * Get all notifications with pagination
 */
export async function getAllNotifications(page = 1, pageSize = 20): Promise<{
  notifications: Notification[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  try {
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;
    
    // Get total count
    const total = await kv.zcard(NOTIFICATION_LIST_KEY);
    
    // Get notification IDs from the sorted set
    const ids = await kv.zrange(NOTIFICATION_LIST_KEY, start, end, { rev: true });
    
    if (!ids.length) {
      return {
        notifications: [],
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }
    
    // Get the actual notifications
    const keys = ids.map(id => `${NOTIFICATION_KEY_PREFIX}${id}`);
    const notifications = await kv.mget<Notification[]>(...keys);
    
    return {
      notifications: notifications.filter(Boolean) as Notification[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch (error) {
    console.error('Failed to get notifications:', error);
    return {
      notifications: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }
}

/**
 * Clear old notifications (used in cleanup jobs)
 */
export async function clearOldNotifications(olderThanDays = 30): Promise<number> {
  try {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    
    // Get notification IDs older than the cutoff
    const oldIds = await kv.zrangebyscore(NOTIFICATION_LIST_KEY, 0, cutoffTime);
    
    if (!oldIds.length) {
      return 0;
    }
    
    // Remove from sorted sets
    await kv.zrembyscore(NOTIFICATION_LIST_KEY, 0, cutoffTime);
    
    // Also remove from unread list if present
    await kv.zrem(UNREAD_NOTIFICATION_LIST_KEY, ...oldIds);
    
    // Delete actual notifications
    const keys = oldIds.map(id => `${NOTIFICATION_KEY_PREFIX}${id}`);
    await kv.del(...keys);
    
    return oldIds.length;
  } catch (error) {
    console.error('Failed to clear old notifications:', error);
    return 0;
  }
}

// Helper functions

/**
 * Convert priority to a score for sorting
 */
function getPriorityScore(priority: NotificationPriority): number {
  const now = Date.now();
  const priorityScores = {
    urgent: 4000000000, // Higher base score for urgent
    high: 3000000000,
    medium: 2000000000,
    low: 1000000000,
  };
  
  return now + priorityScores[priority];
}

/**
 * Determine priority based on report count
 */
function getPriorityFromReportCount(count: number): NotificationPriority {
  if (count >= 5) return 'urgent';
  if (count >= 3) return 'high';
  if (count >= 2) return 'medium';
  return 'low';
}

/**
 * Determine priority based on AI confidence
 */
function getPriorityFromAIConfidence(confidence: number): NotificationPriority {
  if (confidence >= 90) return 'urgent';
  if (confidence >= 75) return 'high';
  if (confidence >= 50) return 'medium';
  return 'low';
}
