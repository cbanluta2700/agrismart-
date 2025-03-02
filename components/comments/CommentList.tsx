import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import CommentDisplay, { Comment } from './CommentDisplay';
import CommentForm from './CommentForm';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAnalytics } from '@vercel/analytics/react';
import { kv } from '@vercel/kv';
import { toast } from 'react-hot-toast';
import { ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';

export interface CommentListProps {
  comments: Comment[];
  contentId: string;
  contentType: 'article' | 'guide' | 'video' | 'post' | 'other';
  currentUserId?: string;
  groupId?: string;
  showEnhancementTools?: boolean;
  allowReplies?: boolean;
  enableReactions?: boolean;
  title?: string;
}

const CommentList: React.FC<CommentListProps> = ({
  comments: initialComments,
  contentId,
  contentType,
  currentUserId = '',
  groupId = '',
  showEnhancementTools = true,
  allowReplies = true,
  enableReactions = true,
  title = 'Comments'
}) => {
  const { data: session, status } = useSession();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const analytics = useAnalytics();
  
  // Cache key for comments metrics
  const getCommentsMetricsCacheKey = () => `content:${contentType}:${contentId}:comments:metrics`;
  
  // Handle new comment submission
  const handleCommentSubmitted = (newComment: Comment) => {
    if (replyToId) {
      // Add reply to existing comment
      const updatedComments = addReplyToComment(comments, replyToId, newComment);
      setComments(updatedComments);
      setReplyToId(null);
      
      // Track reply with analytics
      analytics.track('comment_added', {
        commentId: newComment.id,
        contentId,
        contentType,
        isReply: true,
        parentId: replyToId
      });
    } else {
      // Add top-level comment
      setComments([...comments, newComment]);
      
      // Track new comment with analytics
      analytics.track('comment_added', {
        commentId: newComment.id,
        contentId,
        contentType,
        isReply: false
      });
    }
    
    // Update comment metrics in cache
    updateCommentMetrics();
  };
  
  // Update comment metrics in Vercel KV
  const updateCommentMetrics = async () => {
    try {
      const cacheKey = getCommentsMetricsCacheKey();
      const metrics = {
        count: comments.length + 1,
        lastUpdated: new Date().toISOString()
      };
      
      await kv.set(cacheKey, JSON.stringify(metrics));
      await kv.expire(cacheKey, 86400); // Expire in 24 hours
    } catch (error) {
      console.error('Failed to update comment metrics:', error);
    }
  };
  
  // Recursively add a reply to a comment
  const addReplyToComment = (commentsList: Comment[], parentId: string, newReply: Comment): Comment[] => {
    return commentsList.map(comment => {
      if (comment.id === parentId) {
        return {
          ...comment,
          children: [...(comment.children || []), newReply]
        };
      } else if (comment.children && comment.children.length > 0) {
        return {
          ...comment,
          children: addReplyToComment(comment.children, parentId, newReply)
        };
      }
      return comment;
    });
  };
  
  // Delete a comment
  const handleDeleteComment = async (commentId: string) => {
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }
      
      // Update local state to reflect deletion
      const updatedComments = deleteCommentById(comments, commentId);
      setComments(updatedComments);
      
      toast.success('Comment deleted');
      
      // Track deletion with analytics
      analytics.track('comment_deleted', {
        commentId,
        contentId,
        contentType
      });
    } catch (error) {
      toast.error('Failed to delete comment');
      console.error('Error deleting comment:', error);
    }
  };
  
  // Recursively delete a comment by ID
  const deleteCommentById = (commentsList: Comment[], targetId: string): Comment[] => {
    return commentsList.map(comment => {
      if (comment.id === targetId) {
        // Mark as deleted instead of removing, to maintain thread structure
        return { ...comment, isDeleted: true, content: '' };
      } else if (comment.children && comment.children.length > 0) {
        return {
          ...comment,
          children: deleteCommentById(comment.children, targetId)
        };
      }
      return comment;
    });
  };
  
  // Handle reactions (likes, etc.)
  const handleReaction = async (type: string, commentId: string) => {
    if (!session?.user) {
      toast.error('You must be logged in to react to comments');
      return;
    }
    
    try {
      const response = await fetch(`/api/comments/${commentId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type })
      });
      
      if (!response.ok) {
        throw new Error('Failed to add reaction');
      }
      
      const data = await response.json();
      
      // Update local state to reflect new reaction count
      const updatedComments = updateCommentReaction(comments, commentId, data.count, type);
      setComments(updatedComments);
      
      // Track reaction with analytics
      analytics.track('comment_reaction', {
        commentId,
        contentId,
        contentType,
        reactionType: type
      });
    } catch (error) {
      toast.error('Failed to add reaction');
      console.error('Error adding reaction:', error);
    }
  };
  
  // Update a comment's reaction count
  const updateCommentReaction = (
    commentsList: Comment[], 
    targetId: string, 
    newCount: number, 
    userReaction: string
  ): Comment[] => {
    return commentsList.map(comment => {
      if (comment.id === targetId) {
        return { 
          ...comment, 
          reactionCount: newCount,
          userReaction
        };
      } else if (comment.children && comment.children.length > 0) {
        return {
          ...comment,
          children: updateCommentReaction(comment.children, targetId, newCount, userReaction)
        };
      }
      return comment;
    });
  };
  
  // Handle comment content update (from quality enhancer)
  const handleContentUpdate = async (commentId: string, newContent: string) => {
    if (!session?.user) {
      toast.error('You must be logged in to update comments');
      return;
    }
    
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: newContent })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update comment');
      }
      
      // Update local state to reflect content change
      const updatedComments = updateCommentContent(comments, commentId, newContent);
      setComments(updatedComments);
      
      toast.success('Comment updated');
      
      // Track content update with analytics
      analytics.track('comment_updated', {
        commentId,
        contentId,
        contentType
      });
    } catch (error) {
      toast.error('Failed to update comment');
      console.error('Error updating comment:', error);
    }
  };
  
  // Update a comment's content
  const updateCommentContent = (
    commentsList: Comment[], 
    targetId: string, 
    newContent: string
  ): Comment[] => {
    return commentsList.map(comment => {
      if (comment.id === targetId) {
        return { ...comment, content: newContent };
      } else if (comment.children && comment.children.length > 0) {
        return {
          ...comment,
          children: updateCommentContent(comment.children, targetId, newContent)
        };
      }
      return comment;
    });
  };
  
  // Handle toggling the reply form
  const handleReply = (commentId: string) => {
    setReplyToId(replyToId === commentId ? null : commentId);
    
    // Track when a user starts a reply
    if (replyToId !== commentId) {
      analytics.track('comment_reply_started', {
        parentId: commentId,
        contentId,
        contentType
      });
    }
  };
  
  // Cancel reply form
  const handleCancelReply = () => {
    setReplyToId(null);
  };
  
  return (
    <div className="comments-section mt-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          {title} ({comments.length})
        </h3>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              <span className="text-sm">Hide</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              <span className="text-sm">Show</span>
            </>
          )}
        </Button>
      </div>
      
      {expanded && (
        <>
          {/* Comment Form */}
          {session?.user && (
            <div className="mb-6">
              <CommentForm
                contentId={contentId}
                contentType={contentType}
                onCommentSubmitted={handleCommentSubmitted}
                placeholder="Share your thoughts..."
                parentCommentId={replyToId || undefined}
                fullWidth
              />
              
              {replyToId && (
                <div className="mt-2 text-right">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleCancelReply}
                  >
                    Cancel Reply
                  </Button>
                </div>
              )}
            </div>
          )}
          
          {/* Comments List */}
          {comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map(comment => (
                <CommentDisplay
                  key={comment.id}
                  comment={comment}
                  currentUserId={currentUserId || ''}
                  groupId={groupId}
                  onDelete={handleDeleteComment}
                  onReaction={enableReactions ? handleReaction : undefined}
                  onReply={allowReplies ? handleReply : undefined}
                  showQualityEnhancement={showEnhancementTools}
                  onContentUpdate={handleContentUpdate}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No comments yet. Be the first to join the conversation!</p>
            </div>
          )}
          
          {/* Reply Form for nested comments */}
          {replyToId && session?.user && (
            <div className="mt-4 pl-8">
              <Separator className="mb-4" />
              <h4 className="text-sm font-medium mb-2">Reply to comment</h4>
              <CommentForm
                contentId={contentId}
                contentType={contentType}
                onCommentSubmitted={handleCommentSubmitted}
                placeholder="Write your reply..."
                parentCommentId={replyToId}
                fullWidth
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CommentList;
