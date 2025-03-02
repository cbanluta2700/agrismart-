import prisma from '@/lib/prisma';
import { ModerationAction, ModerationItemType } from '@/types/moderation';
import { notificationService } from './notificationService';

export const moderationService = {
  /**
   * Creates a moderation log entry
   */
  createLog: async (
    groupId: string,
    moderatorId: string,
    action: ModerationAction,
    itemType: ModerationItemType,
    itemId: string,
    reason?: string
  ) => {
    return prisma.moderationLog.create({
      data: {
        groupId,
        moderatorId,
        action,
        itemType,
        itemId,
        reason: reason || null
      }
    });
  },

  /**
   * Handles hiding/unhiding a post
   */
  togglePostVisibility: async (
    postId: string,
    hidden: boolean,
    moderatorId: string,
    groupId: string,
    reason?: string
  ) => {
    // Update the post
    const post = await prisma.forumPost.update({
      where: { id: postId },
      data: { hidden },
      include: { author: true }
    });

    // Create moderation log
    await moderationService.createLog(
      groupId,
      moderatorId,
      hidden ? ModerationAction.HIDE : ModerationAction.UNHIDE,
      ModerationItemType.POST,
      postId,
      reason
    );

    // Send notification to post author
    if (post.authorId !== moderatorId) {
      await notificationService.notifyPostModerated(
        post.authorId,
        post.id,
        hidden ? 'hidden' : 'unhidden',
        groupId
      );
    }

    return post;
  },

  /**
   * Handles hiding/unhiding a comment
   */
  toggleCommentVisibility: async (
    commentId: string,
    hidden: boolean,
    moderatorId: string,
    groupId: string,
    reason?: string
  ) => {
    // Update the comment
    const comment = await prisma.comment.update({
      where: { id: commentId },
      data: { hidden },
      include: { author: true }
    });

    // Create moderation log
    await moderationService.createLog(
      groupId,
      moderatorId,
      hidden ? ModerationAction.HIDE : ModerationAction.UNHIDE,
      ModerationItemType.COMMENT,
      commentId,
      reason
    );

    // Send notification to comment author
    if (comment.authorId !== moderatorId) {
      await notificationService.notifyCommentModerated(
        comment.authorId,
        comment.id,
        hidden ? 'hidden' : 'unhidden',
        groupId
      );
    }

    return comment;
  },

  /**
   * Handles locking/unlocking a post
   */
  togglePostLock: async (
    postId: string,
    locked: boolean,
    moderatorId: string,
    groupId: string,
    reason?: string
  ) => {
    // Update the post
    const post = await prisma.forumPost.update({
      where: { id: postId },
      data: { locked },
      include: { author: true }
    });

    // Create moderation log
    await moderationService.createLog(
      groupId,
      moderatorId,
      locked ? ModerationAction.LOCK : ModerationAction.UNLOCK,
      ModerationItemType.POST,
      postId,
      reason
    );

    // Send notification to post author
    if (post.authorId !== moderatorId) {
      await notificationService.notifyPostModerated(
        post.authorId,
        post.id,
        locked ? 'locked' : 'unlocked',
        groupId
      );
    }

    return post;
  },

  /**
   * Handles changing a member's role
   */
  changeMemberRole: async (
    groupId: string,
    userId: string,
    newRole: string,
    moderatorId: string,
    reason?: string
  ) => {
    // Update the member
    const member = await prisma.groupMember.update({
      where: {
        groupId_userId: {
          groupId,
          userId
        }
      },
      data: { role: newRole },
      include: { user: true }
    });

    // Create moderation log
    await moderationService.createLog(
      groupId,
      moderatorId,
      ModerationAction.ROLE_CHANGE,
      ModerationItemType.MEMBER,
      userId,
      reason
    );

    // Send notification to the member
    if (userId !== moderatorId) {
      await notificationService.notifyRoleChange(
        userId,
        groupId,
        newRole
      );
    }

    return member;
  }
};

export default moderationService;
