import prisma from '@/lib/prisma';
import { ContentType, ModerationAction } from '@prisma/client';

/**
 * Perform the appropriate action based on moderation decision
 * 
 * @param contentType Type of content being moderated
 * @param contentId ID of the content
 * @param action Moderation action to take
 * @param contentEdits Optional edits to apply to the content
 * @param moderatorId ID of the moderator performing the action
 */
export async function performModeratorAction(
  contentType: ContentType,
  contentId: string,
  action?: ModerationAction | null,
  contentEdits?: Record<string, any>,
  moderatorId?: string
): Promise<void> {
  if (!action) return;
  
  switch (action) {
    case 'APPROVED':
      await approveContent(contentType, contentId);
      break;
      
    case 'REJECTED':
      await rejectContent(contentType, contentId);
      break;
      
    case 'WARNING_ISSUED':
      await issueWarning(contentType, contentId, moderatorId);
      break;
      
    case 'CONTENT_EDITED':
      if (contentEdits) {
        await editContent(contentType, contentId, contentEdits);
      }
      break;
      
    case 'USER_SUSPENDED':
      await suspendUser(contentType, contentId);
      break;
      
    case 'USER_BANNED':
      await banUser(contentType, contentId);
      break;
      
    case 'RESTRICTED_VISIBILITY':
      await restrictVisibility(contentType, contentId);
      break;
      
    case 'NO_ACTION':
    default:
      // No action needed
      break;
  }
}

/**
 * Approve content
 */
async function approveContent(contentType: ContentType, contentId: string): Promise<void> {
  switch (contentType) {
    case 'POST':
      await prisma.post.update({
        where: { id: contentId },
        data: { 
          published: true,
          status: 'PUBLISHED'
        }
      });
      break;
      
    case 'COMMENT':
      await prisma.comment.update({
        where: { id: contentId },
        data: { 
          visible: true,
          status: 'APPROVED'
        }
      });
      break;
      
    case 'PRODUCT':
      await prisma.marketplaceProduct.update({
        where: { id: contentId },
        data: { 
          status: 'ACTIVE',
          moderationApproved: true
        }
      });
      break;
      
    case 'RESOURCE':
      await prisma.resource.update({
        where: { id: contentId },
        data: { 
          published: true,
          status: 'PUBLISHED'
        }
      });
      break;
      
    case 'GROUP':
      await prisma.group.update({
        where: { id: contentId },
        data: { 
          status: 'ACTIVE',
          moderationApproved: true
        }
      });
      break;
      
    case 'EVENT':
      await prisma.event.update({
        where: { id: contentId },
        data: { 
          published: true,
          status: 'ACTIVE'
        }
      });
      break;
      
    case 'PROFILE':
      await prisma.user.update({
        where: { id: contentId },
        data: { 
          profileVerified: true,
          profileStatus: 'VERIFIED'
        }
      });
      break;
      
    case 'MESSAGE':
      await prisma.message.update({
        where: { id: contentId },
        data: { 
          visible: true,
          status: 'DELIVERED'
        }
      });
      break;
  }
}

/**
 * Reject content
 */
async function rejectContent(contentType: ContentType, contentId: string): Promise<void> {
  switch (contentType) {
    case 'POST':
      await prisma.post.update({
        where: { id: contentId },
        data: { 
          published: false,
          status: 'REJECTED'
        }
      });
      break;
      
    case 'COMMENT':
      await prisma.comment.update({
        where: { id: contentId },
        data: { 
          visible: false,
          status: 'REJECTED'
        }
      });
      break;
      
    case 'PRODUCT':
      await prisma.marketplaceProduct.update({
        where: { id: contentId },
        data: { 
          status: 'REJECTED',
          moderationApproved: false
        }
      });
      break;
      
    case 'RESOURCE':
      await prisma.resource.update({
        where: { id: contentId },
        data: { 
          published: false,
          status: 'REJECTED'
        }
      });
      break;
      
    case 'GROUP':
      await prisma.group.update({
        where: { id: contentId },
        data: { 
          status: 'REJECTED',
          moderationApproved: false
        }
      });
      break;
      
    case 'EVENT':
      await prisma.event.update({
        where: { id: contentId },
        data: { 
          published: false,
          status: 'REJECTED'
        }
      });
      break;
      
    case 'PROFILE':
      await prisma.user.update({
        where: { id: contentId },
        data: { 
          profileVerified: false,
          profileStatus: 'REJECTED'
        }
      });
      break;
      
    case 'MESSAGE':
      await prisma.message.update({
        where: { id: contentId },
        data: { 
          visible: false,
          status: 'BLOCKED'
        }
      });
      break;
  }
}

/**
 * Issue warning to content creator
 */
async function issueWarning(contentType: ContentType, contentId: string, moderatorId?: string): Promise<void> {
  // Get creator ID based on content type
  let userId: string | null = null;
  let contentTitle: string = 'content';
  
  switch (contentType) {
    case 'POST':
      const post = await prisma.post.findUnique({
        where: { id: contentId },
        select: { authorId: true, title: true }
      });
      userId = post?.authorId || null;
      contentTitle = post?.title || 'post';
      break;
      
    case 'COMMENT':
      const comment = await prisma.comment.findUnique({
        where: { id: contentId },
        select: { authorId: true }
      });
      userId = comment?.authorId || null;
      contentTitle = 'comment';
      break;
      
    case 'PRODUCT':
      const product = await prisma.marketplaceProduct.findUnique({
        where: { id: contentId },
        select: { sellerId: true, name: true }
      });
      userId = product?.sellerId || null;
      contentTitle = product?.name || 'product';
      break;
      
    case 'RESOURCE':
      const resource = await prisma.resource.findUnique({
        where: { id: contentId },
        select: { authorId: true, title: true }
      });
      userId = resource?.authorId || null;
      contentTitle = resource?.title || 'resource';
      break;
      
    case 'GROUP':
      const group = await prisma.group.findUnique({
        where: { id: contentId },
        select: { ownerId: true, name: true }
      });
      userId = group?.ownerId || null;
      contentTitle = group?.name || 'group';
      break;
      
    case 'EVENT':
      const event = await prisma.event.findUnique({
        where: { id: contentId },
        select: { creatorId: true, title: true }
      });
      userId = event?.creatorId || null;
      contentTitle = event?.title || 'event';
      break;
      
    case 'PROFILE':
      userId = contentId; // In this case, contentId is userId
      contentTitle = 'profile';
      break;
      
    case 'MESSAGE':
      const message = await prisma.message.findUnique({
        where: { id: contentId },
        select: { senderId: true }
      });
      userId = message?.senderId || null;
      contentTitle = 'message';
      break;
  }
  
  if (userId) {
    // Create user warning
    await prisma.userWarning.create({
      data: {
        userId,
        reason: `Moderation violation related to ${contentType.toLowerCase()}: ${contentTitle}`,
        warningLevel: 'MODERATE',
        contentType,
        contentId,
        moderatorId: moderatorId,
      }
    });
    
    // Create notification for the user
    await prisma.notification.create({
      data: {
        userId,
        type: 'WARNING',
        title: 'Content Warning',
        message: `Your ${contentType.toLowerCase()} "${contentTitle}" has been flagged for violating community guidelines.`,
        read: false,
        data: {
          contentType,
          contentId
        }
      }
    });
  }
}

/**
 * Edit content with moderator-provided edits
 */
async function editContent(contentType: ContentType, contentId: string, edits: Record<string, any>): Promise<void> {
  switch (contentType) {
    case 'POST':
      await prisma.post.update({
        where: { id: contentId },
        data: { 
          title: edits.title,
          content: edits.content,
          moderated: true
        }
      });
      break;
      
    case 'COMMENT':
      await prisma.comment.update({
        where: { id: contentId },
        data: { 
          content: edits.content,
          moderated: true
        }
      });
      break;
      
    case 'PRODUCT':
      await prisma.marketplaceProduct.update({
        where: { id: contentId },
        data: { 
          name: edits.name,
          description: edits.description,
          moderated: true
        }
      });
      break;
      
    case 'RESOURCE':
      await prisma.resource.update({
        where: { id: contentId },
        data: { 
          title: edits.title,
          description: edits.description,
          content: edits.content,
          moderated: true
        }
      });
      break;
      
    case 'GROUP':
      await prisma.group.update({
        where: { id: contentId },
        data: { 
          name: edits.name,
          description: edits.description,
          moderated: true
        }
      });
      break;
      
    case 'EVENT':
      await prisma.event.update({
        where: { id: contentId },
        data: { 
          title: edits.title,
          description: edits.description,
          moderated: true
        }
      });
      break;
      
    case 'PROFILE':
      await prisma.user.update({
        where: { id: contentId },
        data: { 
          name: edits.name,
          bio: edits.bio,
          moderated: true
        }
      });
      break;
      
    case 'MESSAGE':
      await prisma.message.update({
        where: { id: contentId },
        data: { 
          content: edits.content,
          moderated: true
        }
      });
      break;
  }
}

/**
 * Suspend user account
 */
async function suspendUser(contentType: ContentType, contentId: string): Promise<void> {
  // Get user ID based on content type
  let userId: string | null = null;
  
  switch (contentType) {
    case 'POST':
      const post = await prisma.post.findUnique({
        where: { id: contentId },
        select: { authorId: true }
      });
      userId = post?.authorId || null;
      break;
      
    case 'COMMENT':
      const comment = await prisma.comment.findUnique({
        where: { id: contentId },
        select: { authorId: true }
      });
      userId = comment?.authorId || null;
      break;
      
    case 'PRODUCT':
      const product = await prisma.marketplaceProduct.findUnique({
        where: { id: contentId },
        select: { sellerId: true }
      });
      userId = product?.sellerId || null;
      break;
      
    case 'RESOURCE':
      const resource = await prisma.resource.findUnique({
        where: { id: contentId },
        select: { authorId: true }
      });
      userId = resource?.authorId || null;
      break;
      
    case 'GROUP':
      const group = await prisma.group.findUnique({
        where: { id: contentId },
        select: { ownerId: true }
      });
      userId = group?.ownerId || null;
      break;
      
    case 'EVENT':
      const event = await prisma.event.findUnique({
        where: { id: contentId },
        select: { creatorId: true }
      });
      userId = event?.creatorId || null;
      break;
      
    case 'PROFILE':
      userId = contentId; // In this case, contentId is userId
      break;
      
    case 'MESSAGE':
      const message = await prisma.message.findUnique({
        where: { id: contentId },
        select: { senderId: true }
      });
      userId = message?.senderId || null;
      break;
  }
  
  if (userId) {
    // Suspend user account
    const suspensionEnd = new Date();
    suspensionEnd.setDate(suspensionEnd.getDate() + 7); // 7-day suspension
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'SUSPENDED',
        suspendedUntil: suspensionEnd
      }
    });
    
    // Create notification for the user
    await prisma.notification.create({
      data: {
        userId,
        type: 'ACCOUNT',
        title: 'Account Suspended',
        message: `Your account has been suspended for 7 days due to violation of community guidelines.`,
        read: false
      }
    });
  }
}

/**
 * Ban user account
 */
async function banUser(contentType: ContentType, contentId: string): Promise<void> {
  // Get user ID based on content type
  let userId: string | null = null;
  
  switch (contentType) {
    case 'POST':
      const post = await prisma.post.findUnique({
        where: { id: contentId },
        select: { authorId: true }
      });
      userId = post?.authorId || null;
      break;
      
    case 'COMMENT':
      const comment = await prisma.comment.findUnique({
        where: { id: contentId },
        select: { authorId: true }
      });
      userId = comment?.authorId || null;
      break;
      
    case 'PRODUCT':
      const product = await prisma.marketplaceProduct.findUnique({
        where: { id: contentId },
        select: { sellerId: true }
      });
      userId = product?.sellerId || null;
      break;
      
    case 'RESOURCE':
      const resource = await prisma.resource.findUnique({
        where: { id: contentId },
        select: { authorId: true }
      });
      userId = resource?.authorId || null;
      break;
      
    case 'GROUP':
      const group = await prisma.group.findUnique({
        where: { id: contentId },
        select: { ownerId: true }
      });
      userId = group?.ownerId || null;
      break;
      
    case 'EVENT':
      const event = await prisma.event.findUnique({
        where: { id: contentId },
        select: { creatorId: true }
      });
      userId = event?.creatorId || null;
      break;
      
    case 'PROFILE':
      userId = contentId; // In this case, contentId is userId
      break;
      
    case 'MESSAGE':
      const message = await prisma.message.findUnique({
        where: { id: contentId },
        select: { senderId: true }
      });
      userId = message?.senderId || null;
      break;
  }
  
  if (userId) {
    // Ban user account
    await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'BANNED',
        banReason: 'Violation of community guidelines',
        bannedAt: new Date()
      }
    });
    
    // Create notification for the user
    await prisma.notification.create({
      data: {
        userId,
        type: 'ACCOUNT',
        title: 'Account Banned',
        message: `Your account has been permanently banned due to severe violation of community guidelines.`,
        read: false
      }
    });
  }
}

/**
 * Restrict content visibility
 */
async function restrictVisibility(contentType: ContentType, contentId: string): Promise<void> {
  switch (contentType) {
    case 'POST':
      await prisma.post.update({
        where: { id: contentId },
        data: { 
          visibility: 'RESTRICTED',
          sensitiveContent: true
        }
      });
      break;
      
    case 'COMMENT':
      await prisma.comment.update({
        where: { id: contentId },
        data: { 
          visibility: 'RESTRICTED',
          sensitiveContent: true
        }
      });
      break;
      
    case 'PRODUCT':
      await prisma.marketplaceProduct.update({
        where: { id: contentId },
        data: { 
          visibility: 'RESTRICTED',
          sensitiveContent: true
        }
      });
      break;
      
    case 'RESOURCE':
      await prisma.resource.update({
        where: { id: contentId },
        data: { 
          visibility: 'RESTRICTED',
          sensitiveContent: true
        }
      });
      break;
      
    case 'GROUP':
      await prisma.group.update({
        where: { id: contentId },
        data: { 
          visibility: 'RESTRICTED',
          sensitiveContent: true
        }
      });
      break;
      
    case 'EVENT':
      await prisma.event.update({
        where: { id: contentId },
        data: { 
          visibility: 'RESTRICTED',
          sensitiveContent: true
        }
      });
      break;
      
    case 'PROFILE':
      await prisma.user.update({
        where: { id: contentId },
        data: { 
          profileVisibility: 'RESTRICTED'
        }
      });
      break;
      
    case 'MESSAGE':
      await prisma.message.update({
        where: { id: contentId },
        data: { 
          visibility: 'RESTRICTED',
          sensitiveContent: true
        }
      });
      break;
  }
}
