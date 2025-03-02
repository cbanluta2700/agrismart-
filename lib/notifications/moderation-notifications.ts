import { ResourceStatus, ResourceType, User } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/mail';

/**
 * Interface for moderation notification parameters
 */
export interface ModerationNotificationParams {
  resourceId: string;
  action: 'approve' | 'reject' | 'archive' | 'feature' | 'unfeature';
  moderatorId: string;
  reason?: string;
  batchId?: string;
}

/**
 * Interface for notification preferences
 */
export interface NotificationPreferences {
  email: boolean;
  inApp: boolean;
  batchSummary: boolean;
}

/**
 * Maps moderation actions to human-readable descriptions
 */
const actionDescriptions = {
  approve: 'approved',
  reject: 'rejected',
  archive: 'archived',
  feature: 'featured',
  unfeature: 'unfeatured (removed from featured)'
};

/**
 * Get user notification preferences
 */
export async function getUserNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      notificationPreferences: true
    }
  });

  // Default preferences if not set
  const defaultPreferences: NotificationPreferences = {
    email: true,
    inApp: true,
    batchSummary: false
  };

  if (!user?.notificationPreferences) {
    return defaultPreferences;
  }

  try {
    // Parse stored preferences or use defaults
    return {
      ...defaultPreferences,
      ...JSON.parse(user.notificationPreferences as string)
    };
  } catch (error) {
    console.error('Error parsing notification preferences:', error);
    return defaultPreferences;
  }
}

/**
 * Send a moderation notification to the resource author
 */
export async function notifyAuthor(params: ModerationNotificationParams): Promise<boolean> {
  const { resourceId, action, moderatorId, reason, batchId } = params;

  try {
    // Get resource details including author
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      include: {
        author: true
      }
    });

    if (!resource || !resource.author) {
      console.error(`Resource or author not found for resource ${resourceId}`);
      return false;
    }

    // Get author notification preferences
    const preferences = await getUserNotificationPreferences(resource.author.id);

    // Get moderator name
    const moderator = await prisma.user.findUnique({
      where: { id: moderatorId },
      select: { name: true, email: true }
    });

    const moderatorName = moderator?.name || 'A moderator';
    const actionDescription = actionDescriptions[action];
    const resourceTitle = resource.title || `Resource ${resourceId}`;

    // Create notification message
    const message = {
      subject: `Your ${resource.type.toLowerCase()} has been ${actionDescription}`,
      body: `
        <p>Hello ${resource.author.name || 'there'},</p>
        <p>${moderatorName} has ${actionDescription} your ${resource.type.toLowerCase()} "${resourceTitle}".</p>
        ${reason ? `<p>Reason: ${reason}</p>` : ''}
        <p>You can view your ${resource.type.toLowerCase()} <a href="${process.env.NEXT_PUBLIC_URL}/resources/${resourceId}">here</a>.</p>
        <p>Thank you for your contribution to AgriSmart!</p>
      `
    };

    // Send in-app notification if enabled
    if (preferences.inApp) {
      await prisma.notification.create({
        data: {
          userId: resource.author.id,
          type: 'MODERATION',
          title: message.subject,
          message: `Your ${resource.type.toLowerCase()} "${resourceTitle}" has been ${actionDescription}.`,
          data: JSON.stringify({
            resourceId,
            action,
            moderatorId,
            reason,
            batchId
          }),
          read: false
        }
      });
    }

    // Send email notification if enabled and author has email
    if (preferences.email && resource.author.email) {
      await sendEmail({
        to: resource.author.email,
        subject: message.subject,
        html: message.body
      });
    }

    return true;
  } catch (error) {
    console.error('Error sending author notification:', error);
    return false;
  }
}

/**
 * Send a moderation notification to all administrators
 */
export async function notifyAdministrators(params: ModerationNotificationParams): Promise<number> {
  const { resourceId, action, moderatorId, reason, batchId } = params;

  try {
    // Get resource details
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!resource) {
      console.error(`Resource not found for resource ${resourceId}`);
      return 0;
    }

    // Get all administrators and moderators (excluding the current moderator)
    const administrators = await prisma.user.findMany({
      where: {
        role: {
          in: ['ADMIN', 'MODERATOR']
        },
        id: {
          not: moderatorId // Don't notify the moderator who took the action
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        notificationPreferences: true
      }
    });

    // Get moderator name
    const moderator = await prisma.user.findUnique({
      where: { id: moderatorId },
      select: { name: true, email: true }
    });

    const moderatorName = moderator?.name || 'Unknown moderator';
    const actionDescription = actionDescriptions[action];
    const resourceTitle = resource.title || `Resource ${resourceId}`;
    const authorName = resource.author?.name || 'Unknown author';

    let notificationsSent = 0;

    // Notify each administrator based on their preferences
    for (const admin of administrators) {
      const preferences = await getUserNotificationPreferences(admin.id);

      // Skip if neither email nor in-app notifications are enabled
      if (!preferences.email && !preferences.inApp) {
        continue;
      }

      // Create notification message
      const message = {
        subject: `Moderation Action: ${resource.type} ${actionDescription}`,
        body: `
          <p>Hello ${admin.name || 'Administrator'},</p>
          <p>${moderatorName} has ${actionDescription} a ${resource.type.toLowerCase()} "${resourceTitle}" by ${authorName}.</p>
          ${reason ? `<p>Reason: ${reason}</p>` : ''}
          <p>You can view the ${resource.type.toLowerCase()} <a href="${process.env.NEXT_PUBLIC_URL}/resources/${resourceId}">here</a>.</p>
          <p>You can review the moderation history <a href="${process.env.NEXT_PUBLIC_URL}/admin/resources/moderation-logs">here</a>.</p>
        `
      };

      // Send in-app notification if enabled
      if (preferences.inApp) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'ADMIN_MODERATION',
            title: message.subject,
            message: `${moderatorName} ${actionDescription} ${resource.type.toLowerCase()} "${resourceTitle}" by ${authorName}.`,
            data: JSON.stringify({
              resourceId,
              action,
              moderatorId,
              reason,
              batchId
            }),
            read: false
          }
        });
      }

      // Send email notification if enabled and admin has email
      if (preferences.email && admin.email) {
        await sendEmail({
          to: admin.email,
          subject: message.subject,
          html: message.body
        });
      }

      notificationsSent++;
    }

    return notificationsSent;
  } catch (error) {
    console.error('Error sending administrator notifications:', error);
    return 0;
  }
}

/**
 * Send notifications for a batch moderation action
 */
export async function sendBatchModerationNotifications(
  batchId: string,
  action: ModerationNotificationParams['action'],
  moderatorId: string,
  reason?: string
): Promise<{ authors: number; admins: number }> {
  try {
    // Get all moderation logs with this batch ID
    const moderationLogs = await prisma.resourceModerationLog.findMany({
      where: {
        batchId,
        action
      },
      select: {
        resourceId: true
      }
    });

    const resourceIds = moderationLogs.map(log => log.resourceId);
    
    if (resourceIds.length === 0) {
      return { authors: 0, admins: 0 };
    }

    // Get resources with their authors
    const resources = await prisma.resource.findMany({
      where: {
        id: {
          in: resourceIds
        }
      },
      select: {
        id: true,
        title: true,
        type: true,
        authorId: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            notificationPreferences: true
          }
        }
      }
    });

    // Group resources by author
    const resourcesByAuthor = resources.reduce((acc, resource) => {
      const authorId = resource.authorId;
      if (!acc[authorId]) {
        acc[authorId] = [];
      }
      acc[authorId].push(resource);
      return acc;
    }, {} as Record<string, typeof resources>);

    let authorNotifications = 0;
    
    // Send batch notifications to authors
    for (const [authorId, authorResources] of Object.entries(resourcesByAuthor)) {
      const author = authorResources[0].author;
      if (!author) continue;
      
      const preferences = await getUserNotificationPreferences(authorId);
      
      // Skip if neither email nor in-app notifications are enabled
      if (!preferences.email && !preferences.inApp) {
        continue;
      }
      
      // If batch summary is not enabled, send individual notifications
      if (!preferences.batchSummary) {
        for (const resource of authorResources) {
          await notifyAuthor({
            resourceId: resource.id,
            action,
            moderatorId,
            reason,
            batchId
          });
        }
        authorNotifications += authorResources.length;
        continue;
      }
      
      // Send batch summary notification
      const actionDescription = actionDescriptions[action];
      const resourceCount = authorResources.length;
      const resourceTypeCount = authorResources.reduce((acc, resource) => {
        const type = resource.type;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Create resource type summary text
      const resourceTypesSummary = Object.entries(resourceTypeCount)
        .map(([type, count]) => `${count} ${type.toLowerCase()}${count > 1 ? 's' : ''}`)
        .join(', ');
      
      // Get moderator name
      const moderator = await prisma.user.findUnique({
        where: { id: moderatorId },
        select: { name: true }
      });
      const moderatorName = moderator?.name || 'A moderator';
      
      // Create notification message
      const message = {
        subject: `${resourceCount} of your resources have been ${actionDescription}`,
        body: `
          <p>Hello ${author.name || 'there'},</p>
          <p>${moderatorName} has ${actionDescription} ${resourceCount} of your resources (${resourceTypesSummary}).</p>
          ${reason ? `<p>Reason: ${reason}</p>` : ''}
          <p>You can view your resources <a href="${process.env.NEXT_PUBLIC_URL}/account/resources">here</a>.</p>
          <p>Thank you for your contributions to AgriSmart!</p>
        `
      };
      
      // Send in-app notification if enabled
      if (preferences.inApp) {
        await prisma.notification.create({
          data: {
            userId: authorId,
            type: 'MODERATION_BATCH',
            title: message.subject,
            message: `${resourceCount} of your resources (${resourceTypesSummary}) have been ${actionDescription}.`,
            data: JSON.stringify({
              resourceIds: authorResources.map(r => r.id),
              action,
              moderatorId,
              reason,
              batchId
            }),
            read: false
          }
        });
      }
      
      // Send email notification if enabled and author has email
      if (preferences.email && author.email) {
        await sendEmail({
          to: author.email,
          subject: message.subject,
          html: message.body
        });
      }
      
      authorNotifications++;
    }
    
    // Notify all administrators with a summary
    const actionDescription = actionDescriptions[action];
    const resourceCount = resources.length;
    const resourceTypeCount = resources.reduce((acc, resource) => {
      const type = resource.type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Create resource type summary text
    const resourceTypesSummary = Object.entries(resourceTypeCount)
      .map(([type, count]) => `${count} ${type.toLowerCase()}${count > 1 ? 's' : ''}`)
      .join(', ');
    
    // Get all administrators and moderators (excluding the current moderator)
    const administrators = await prisma.user.findMany({
      where: {
        role: {
          in: ['ADMIN', 'MODERATOR']
        },
        id: {
          not: moderatorId // Don't notify the moderator who took the action
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        notificationPreferences: true
      }
    });
    
    // Get moderator name
    const moderator = await prisma.user.findUnique({
      where: { id: moderatorId },
      select: { name: true }
    });
    const moderatorName = moderator?.name || 'Unknown moderator';
    
    let adminNotifications = 0;
    
    // Send batch summary notification to each administrator
    for (const admin of administrators) {
      const preferences = await getUserNotificationPreferences(admin.id);
      
      // Skip if neither email nor in-app notifications are enabled
      if (!preferences.email && !preferences.inApp) {
        continue;
      }
      
      // Create notification message
      const message = {
        subject: `Batch Moderation: ${resourceCount} resources ${actionDescription}`,
        body: `
          <p>Hello ${admin.name || 'Administrator'},</p>
          <p>${moderatorName} has ${actionDescription} ${resourceCount} resources (${resourceTypesSummary}) in a batch operation.</p>
          ${reason ? `<p>Reason: ${reason}</p>` : ''}
          <p>You can review the moderation history <a href="${process.env.NEXT_PUBLIC_URL}/admin/resources/moderation-logs">here</a>.</p>
        `
      };
      
      // Send in-app notification if enabled
      if (preferences.inApp) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'ADMIN_MODERATION_BATCH',
            title: message.subject,
            message: `${moderatorName} ${actionDescription} ${resourceCount} resources (${resourceTypesSummary}) in a batch operation.`,
            data: JSON.stringify({
              resourceIds: resources.map(r => r.id),
              action,
              moderatorId,
              reason,
              batchId
            }),
            read: false
          }
        });
      }
      
      // Send email notification if enabled and admin has email
      if (preferences.email && admin.email) {
        await sendEmail({
          to: admin.email,
          subject: message.subject,
          html: message.body
        });
      }
      
      adminNotifications++;
    }
    
    return {
      authors: authorNotifications,
      admins: adminNotifications
    };
  } catch (error) {
    console.error('Error sending batch moderation notifications:', error);
    return { authors: 0, admins: 0 };
  }
}
