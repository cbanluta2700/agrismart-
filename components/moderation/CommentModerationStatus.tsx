import React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { AlertCircle, CheckCircle, Shield, Trash2, Eye, Flag } from 'lucide-react';
import { trackModerationAction } from '@/lib/vercel/moderation-analytics';
import { cleanCache } from '@/lib/vercel/cache-control';

interface CommentModerationStatusProps {
  /**
   * The ID of the comment
   */
  commentId: string;
  
  /**
   * The current moderation status of the comment
   */
  status: 'pending' | 'approved' | 'flagged' | 'rejected';
  
  /**
   * The reason for flagging/rejecting (if applicable)
   */
  reason?: string;
  
  /**
   * Whether the moderation was automatic
   */
  automated?: boolean;
  
  /**
   * The content of the comment (for moderator preview)
   */
  content?: string;
  
  /**
   * Callback when moderation status changes
   */
  onStatusChange?: (newStatus: 'pending' | 'approved' | 'flagged' | 'rejected') => void;
  
  /**
   * Whether to show moderator controls
   */
  showModeratorControls?: boolean;
}

/**
 * Component for displaying comment moderation status and providing moderation actions
 */
export function CommentModerationStatus({
  commentId,
  status,
  reason,
  automated = false,
  content,
  onStatusChange,
  showModeratorControls: externalShowControls
}: CommentModerationStatusProps) {
  const { data: session } = useSession();
  const router = useRouter();
  
  // Only show moderator controls if the user is a moderator or admin
  const isModeratorUser = session?.user?.role === 'ADMIN' || session?.user?.role === 'MODERATOR';
  const showModeratorControls = externalShowControls !== undefined 
    ? externalShowControls 
    : isModeratorUser;
  
  /**
   * Update the comment's moderation status
   */
  const updateModerationStatus = async (newStatus: 'approved' | 'flagged' | 'rejected') => {
    try {
      const response = await fetch(`/api/admin/moderation/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus,
          reason: newStatus === 'approved' ? undefined : reason || 'Policy violation'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update moderation status');
      }
      
      // Track the moderation action
      await trackModerationAction({
        contentId: commentId,
        action: newStatus,
        reason: newStatus === 'approved' ? undefined : reason || 'Policy violation',
        userId: session?.user?.id || 'unknown',
        automated: false,
        source: 'manual'
      });
      
      // Invalidate cache for this comment
      await cleanCache(`comment:${commentId}`);
      
      // Call the status change callback if provided
      if (onStatusChange) {
        onStatusChange(newStatus);
      }
      
      // Refresh the page to show the updated status
      router.refresh();
    } catch (error) {
      console.error('Error updating moderation status:', error);
    }
  };
  
  const renderStatus = () => {
    switch (status) {
      case 'pending':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Pending Review
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                This comment is waiting for moderation
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'approved':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Approved
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                This comment has been approved{automated ? ' automatically' : ' by a moderator'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'flagged':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  <Flag className="h-3 w-3 mr-1" />
                  Flagged
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {reason || 'This comment has been flagged for review'}
                {automated ? ' (AI-detected)' : ''}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'rejected':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  <Trash2 className="h-3 w-3 mr-1" />
                  Rejected
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {reason || 'This comment violated community guidelines'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
    }
  };
  
  return (
    <div className="flex items-center space-x-2">
      {renderStatus()}
      
      {showModeratorControls && status !== 'approved' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => updateModerationStatus('approved')}
          className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          Approve
        </Button>
      )}
      
      {showModeratorControls && status !== 'rejected' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => updateModerationStatus('rejected')}
          className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Reject
        </Button>
      )}
      
      {showModeratorControls && content && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              <div className="text-sm">
                <p className="font-medium mb-1">Comment Content:</p>
                <p className="text-xs">{content}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      {automated && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-gray-400">
                <Shield className="h-4 w-4" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              This comment was moderated by AI
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
