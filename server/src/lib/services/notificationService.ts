import { prisma } from '../db';

export type NotificationType = 
  | 'POST_CREATED' 
  | 'COMMENT_CREATED' 
  | 'GROUP_INVITATION' 
  | 'GROUP_JOIN_REQUEST'
  | 'GROUP_ROLE_UPDATED'
  | 'POST_MODERATED'
  | 'COMMENT_MODERATED'
  | 'MENTION';

export type SourceType = 'POST' | 'COMMENT' | 'GROUP' | 'USER';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  linkUrl?: string;
  sourceId?: string;
  sourceType?: SourceType;
}

/**
 * Creates a new notification for a user
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        content: params.content,
        linkUrl: params.linkUrl,
        sourceId: params.sourceId,
        sourceType: params.sourceType,
        read: false,
      },
    });
    
    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    throw error;
  }
}

/**
 * Creates notifications for multiple users with the same content
 */
export async function createBulkNotifications(userIds: string[], params: Omit<CreateNotificationParams, 'userId'>) {
  try {
    const notifications = await prisma.notification.createMany({
      data: userIds.map(userId => ({
        userId,
        type: params.type,
        title: params.title,
        content: params.content,
        linkUrl: params.linkUrl,
        sourceId: params.sourceId,
        sourceType: params.sourceType,
        read: false,
      })),
    });
    
    return notifications;
  } catch (error) {
    console.error('Failed to create bulk notifications:', error);
    throw error;
  }
}

/**
 * Creates a notification for a new post in a group
 */
export async function notifyNewPost(postId: string, authorId: string, groupId: string) {
  try {
    // Get the post details
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: { select: { name: true } },
        group: { select: { name: true } },
      },
    });
    
    if (!post) {
      throw new Error('Post not found');
    }
    
    // Get all members of the group except the author
    const groupMembers = await prisma.groupMember.findMany({
      where: {
        groupId,
        userId: { not: authorId }, // Exclude the author
      },
      select: { userId: true },
    });
    
    if (groupMembers.length === 0) {
      return; // No members to notify
    }
    
    // Create notifications for all group members
    await createBulkNotifications(
      groupMembers.map(member => member.userId),
      {
        type: 'POST_CREATED',
        title: 'New post in group',
        content: `${post.author.name} posted "${post.title}" in ${post.group.name}`,
        linkUrl: `/forum/posts/${postId}`,
        sourceId: postId,
        sourceType: 'POST',
      }
    );
  } catch (error) {
    console.error('Failed to notify about new post:', error);
    throw error;
  }
}

/**
 * Creates a notification for a new comment on a post
 */
export async function notifyNewComment(commentId: string, authorId: string, postId: string) {
  try {
    // Get the comment details
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        author: { select: { name: true } },
        post: {
          select: {
            id: true,
            title: true,
            authorId: true,
            groupId: true,
          },
        },
      },
    });
    
    if (!comment) {
      throw new Error('Comment not found');
    }
    
    // Notify the post author if they're not the comment author
    if (comment.post.authorId !== authorId) {
      await createNotification({
        userId: comment.post.authorId,
        type: 'COMMENT_CREATED',
        title: 'New comment on your post',
        content: `${comment.author.name} commented on your post "${comment.post.title}"`,
        linkUrl: `/forum/posts/${postId}#comment-${commentId}`,
        sourceId: commentId,
        sourceType: 'COMMENT',
      });
    }
    
    // If the post is in a group, notify group admins and moderators
    if (comment.post.groupId) {
      const groupModerators = await prisma.groupMember.findMany({
        where: {
          groupId: comment.post.groupId,
          role: { in: ['ADMIN', 'MODERATOR'] },
          userId: { not: authorId }, // Exclude the comment author
        },
        select: { userId: true },
      });
      
      if (groupModerators.length > 0) {
        await createBulkNotifications(
          groupModerators.map(mod => mod.userId),
          {
            type: 'COMMENT_CREATED',
            title: 'New comment in your group',
            content: `${comment.author.name} commented on "${comment.post.title}"`,
            linkUrl: `/forum/posts/${postId}#comment-${commentId}`,
            sourceId: commentId,
            sourceType: 'COMMENT',
          }
        );
      }
    }
  } catch (error) {
    console.error('Failed to notify about new comment:', error);
    throw error;
  }
}

/**
 * Creates a notification for a group invitation
 */
export async function notifyGroupInvitation(userId: string, groupId: string, inviterId: string) {
  try {
    // Get group and inviter details
    const [group, inviter] = await Promise.all([
      prisma.group.findUnique({
        where: { id: groupId },
        select: { name: true },
      }),
      prisma.user.findUnique({
        where: { id: inviterId },
        select: { name: true },
      }),
    ]);
    
    if (!group || !inviter) {
      throw new Error('Group or inviter not found');
    }
    
    await createNotification({
      userId,
      type: 'GROUP_INVITATION',
      title: 'You have been invited to join a group',
      content: `${inviter.name} has invited you to join the group "${group.name}"`,
      linkUrl: `/forum/groups/${groupId}`,
      sourceId: groupId,
      sourceType: 'GROUP',
    });
  } catch (error) {
    console.error('Failed to notify about group invitation:', error);
    throw error;
  }
}

/**
 * Creates a notification for a group role update
 */
export async function notifyGroupRoleUpdate(userId: string, groupId: string, newRole: string) {
  try {
    // Get group details
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { name: true },
    });
    
    if (!group) {
      throw new Error('Group not found');
    }
    
    await createNotification({
      userId,
      type: 'GROUP_ROLE_UPDATED',
      title: 'Your role in a group has been updated',
      content: `Your role in the group "${group.name}" has been updated to ${newRole.toLowerCase()}`,
      linkUrl: `/forum/groups/${groupId}`,
      sourceId: groupId,
      sourceType: 'GROUP',
    });
  } catch (error) {
    console.error('Failed to notify about role update:', error);
    throw error;
  }
}

/**
 * Creates a notification for a moderated post
 */
export async function notifyPostModeration(postId: string, authorId: string, action: string, reason?: string) {
  try {
    // Get post details
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { title: true },
    });
    
    if (!post) {
      throw new Error('Post not found');
    }
    
    const actionText = action === 'HIDE' ? 'hidden' : 
                      action === 'UNHIDE' ? 'unhidden' :
                      action === 'LOCK' ? 'locked' :
                      action === 'UNLOCK' ? 'unlocked' :
                      action === 'PIN' ? 'pinned' :
                      action === 'UNPIN' ? 'unpinned' : 'moderated';
    
    let content = `Your post "${post.title}" has been ${actionText}`;
    if (reason) {
      content += `: ${reason}`;
    }
    
    await createNotification({
      userId: authorId,
      type: 'POST_MODERATED',
      title: `Your post has been ${actionText}`,
      content,
      linkUrl: `/forum/posts/${postId}`,
      sourceId: postId,
      sourceType: 'POST',
    });
  } catch (error) {
    console.error('Failed to notify about post moderation:', error);
    throw error;
  }
}

/**
 * Creates a notification for a moderated comment
 */
export async function notifyCommentModeration(commentId: string, authorId: string, action: string, reason?: string) {
  try {
    // Get comment details
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        post: { select: { id: true, title: true } },
      },
    });
    
    if (!comment) {
      throw new Error('Comment not found');
    }
    
    const actionText = action === 'HIDE' ? 'hidden' : 
                      action === 'UNHIDE' ? 'unhidden' : 'moderated';
    
    let content = `Your comment on "${comment.post.title}" has been ${actionText}`;
    if (reason) {
      content += `: ${reason}`;
    }
    
    await createNotification({
      userId: authorId,
      type: 'COMMENT_MODERATED',
      title: `Your comment has been ${actionText}`,
      content,
      linkUrl: `/forum/posts/${comment.post.id}#comment-${commentId}`,
      sourceId: commentId,
      sourceType: 'COMMENT',
    });
  } catch (error) {
    console.error('Failed to notify about comment moderation:', error);
    throw error;
  }
}

/**
 * Creates a notification for a user mention
 */
export async function notifyMention(
  mentionedUserId: string, 
  mentionerUserId: string, 
  sourceId: string, 
  sourceType: SourceType
) {
  try {
    // Get mentioner details
    const mentioner = await prisma.user.findUnique({
      where: { id: mentionerUserId },
      select: { name: true },
    });
    
    if (!mentioner) {
      throw new Error('Mentioner not found');
    }
    
    let title = 'You were mentioned';
    let content = `${mentioner.name} mentioned you`;
    let linkUrl = '';
    
    // Get source details based on source type
    if (sourceType === 'POST') {
      const post = await prisma.post.findUnique({
        where: { id: sourceId },
        select: { title: true },
      });
      
      if (post) {
        title = 'You were mentioned in a post';
        content = `${mentioner.name} mentioned you in the post "${post.title}"`;
        linkUrl = `/forum/posts/${sourceId}`;
      }
    } else if (sourceType === 'COMMENT') {
      const comment = await prisma.comment.findUnique({
        where: { id: sourceId },
        include: {
          post: { select: { id: true, title: true } },
        },
      });
      
      if (comment) {
        title = 'You were mentioned in a comment';
        content = `${mentioner.name} mentioned you in a comment on "${comment.post.title}"`;
        linkUrl = `/forum/posts/${comment.post.id}#comment-${sourceId}`;
      }
    }
    
    await createNotification({
      userId: mentionedUserId,
      type: 'MENTION',
      title,
      content,
      linkUrl,
      sourceId,
      sourceType,
    });
  } catch (error) {
    console.error('Failed to notify about mention:', error);
    throw error;
  }
}
