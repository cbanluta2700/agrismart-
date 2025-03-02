import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useAIModeration } from '@/lib/hooks/useAIModeration';

interface CommentFormProps {
  /**
   * The ID of the content being commented on
   */
  contentId: string;
  
  /**
   * The type of content being commented on
   */
  contentType: 'article' | 'guide' | 'video' | 'post' | 'other';
  
  /**
   * Callback when a comment is successfully submitted
   */
  onCommentSubmitted?: (comment: any) => void;
  
  /**
   * Placeholder text for the comment textarea
   */
  placeholder?: string;
  
  /**
   * Whether to show the comment form at full width
   */
  fullWidth?: boolean;
  
  /**
   * Optional parent comment ID if this is a reply
   */
  parentCommentId?: string;
}

/**
 * Comment form component with AI moderation integration
 */
export function CommentForm({
  contentId,
  contentType,
  onCommentSubmitted,
  placeholder = 'Share your thoughts...',
  fullWidth = false,
  parentCommentId
}: CommentFormProps) {
  const { data: session, status } = useSession();
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [moderationError, setModerationError] = useState<string | null>(null);
  
  // Use our AI moderation hook
  const { 
    checkContent, 
    isChecking, 
    getMessageForFlag 
  } = useAIModeration({
    contentType: 'comment',
    showToasts: false,
    onFlagged: (result) => {
      setModerationError(
        getMessageForFlag(result.flaggedCategories || [])
      );
    },
    onApproved: () => {
      setModerationError(null);
    }
  });
  
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setComment(newValue);
    
    // Clear moderation error when user starts typing again
    if (moderationError) {
      setModerationError(null);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!comment.trim()) {
      return;
    }
    
    // Check if user is logged in
    if (status !== 'authenticated') {
      toast.error('You must be logged in to comment');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // First, check the content with AI moderation
      const moderationResult = await checkContent(comment);
      
      if (moderationResult.flagged) {
        // Content was flagged, display error and prevent submission
        setModerationError(
          getMessageForFlag(moderationResult.flaggedCategories || [])
        );
        setIsSubmitting(false);
        return;
      }
      
      // Content passed moderation, submit the comment
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: comment,
          contentId,
          contentType,
          parentCommentId,
          moderationStatus: 'pending' // All comments start as pending
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit comment');
      }
      
      const newComment = await response.json();
      
      // Reset form and clear error
      setComment('');
      setModerationError(null);
      
      // Call the comment submitted callback if provided
      if (onCommentSubmitted) {
        onCommentSubmitted(newComment);
      }
      
      toast.success('Comment submitted successfully');
    } catch (error) {
      toast.error((error as Error).message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // If user is not authenticated, show login prompt
  if (status === 'unauthenticated') {
    return (
      <div className="text-center p-4 border rounded-md bg-gray-50">
        <p className="text-sm text-gray-600 mb-2">
          Please sign in to join the conversation
        </p>
        <Button
          variant="outline"
          onClick={() => window.location.href = '/auth/signin?callbackUrl=' + window.location.href}
        >
          Sign In
        </Button>
      </div>
    );
  }
  
  return (
    <form onSubmit={handleSubmit} className={`${fullWidth ? 'w-full' : 'max-w-2xl'} mx-auto`}>
      <div className="space-y-4">
        <Textarea
          value={comment}
          onChange={handleCommentChange}
          placeholder={placeholder}
          className="min-h-[100px] resize-y"
          disabled={isSubmitting || isChecking}
        />
        
        {moderationError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4 mr-2" />
            <AlertDescription>{moderationError}</AlertDescription>
          </Alert>
        )}
        
        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={!comment.trim() || isSubmitting || isChecking || !!moderationError}
          >
            {isSubmitting || isChecking ? 'Processing...' : 'Submit Comment'}
          </Button>
        </div>
      </div>
    </form>
  );
}
