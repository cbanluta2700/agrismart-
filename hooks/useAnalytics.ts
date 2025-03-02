import { useCallback } from 'react';
import { useSession } from 'next-auth/react';

/**
 * Hook for tracking user interactions and events
 */
export const useAnalytics = () => {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  /**
   * Track a user event
   */
  const trackEvent = useCallback(
    async ({
      type,
      entityType,
      entityId,
      groupId,
      metadata = {},
    }: {
      type: string;
      entityType: string;
      entityId?: string;
      groupId?: string;
      metadata?: Record<string, any>;
    }) => {
      try {
        const response = await fetch('/api/analytics/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type,
            entityType,
            entityId,
            userId,
            groupId,
            metadata,
            timestamp: new Date().toISOString(),
          }),
        });

        if (!response.ok) {
          // Silent fail for analytics - don't disrupt user experience
          console.error('Analytics tracking failed:', await response.text());
        }
      } catch (error) {
        // Silent fail for analytics - don't disrupt user experience
        console.error('Analytics tracking error:', error);
      }
    },
    [userId]
  );

  /**
   * Track a post view
   */
  const trackPostView = useCallback(
    (postId: string, groupId?: string) => {
      trackEvent({
        type: 'POST_VIEW',
        entityType: 'post',
        entityId: postId,
        groupId,
      });
    },
    [trackEvent]
  );

  /**
   * Track a post creation
   */
  const trackPostCreate = useCallback(
    (postId: string, groupId?: string) => {
      trackEvent({
        type: 'POST_CREATE',
        entityType: 'post',
        entityId: postId,
        groupId,
      });
    },
    [trackEvent]
  );

  /**
   * Track a post like
   */
  const trackPostLike = useCallback(
    (postId: string, groupId?: string) => {
      trackEvent({
        type: 'POST_LIKE',
        entityType: 'post',
        entityId: postId,
        groupId,
      });
    },
    [trackEvent]
  );

  /**
   * Track a comment creation
   */
  const trackCommentCreate = useCallback(
    (commentId: string, postId: string, groupId?: string) => {
      trackEvent({
        type: 'COMMENT_CREATE',
        entityType: 'comment',
        entityId: commentId,
        groupId,
        metadata: { postId },
      });
    },
    [trackEvent]
  );

  /**
   * Track a group join
   */
  const trackGroupJoin = useCallback(
    (groupId: string) => {
      trackEvent({
        type: 'GROUP_JOIN',
        entityType: 'group',
        entityId: groupId,
        groupId,
      });
    },
    [trackEvent]
  );

  /**
   * Track a search
   */
  const trackSearch = useCallback(
    (query: string, resultsCount: number) => {
      trackEvent({
        type: 'SEARCH_PERFORM',
        entityType: 'search',
        metadata: { query, resultsCount },
      });
    },
    [trackEvent]
  );

  /**
   * Track a report submission
   */
  const trackReportSubmit = useCallback(
    (reportId: string, itemType: string, itemId: string, groupId?: string) => {
      trackEvent({
        type: 'REPORT_SUBMIT',
        entityType: 'report',
        entityId: reportId,
        groupId,
        metadata: { itemType, itemId },
      });
    },
    [trackEvent]
  );

  return {
    trackEvent,
    trackPostView,
    trackPostCreate,
    trackPostLike,
    trackCommentCreate,
    trackGroupJoin,
    trackSearch,
    trackReportSubmit,
  };
};

export default useAnalytics;
