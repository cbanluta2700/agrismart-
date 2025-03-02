import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';
import { 
  Card, 
  CardContent,
  CardFooter
} from '@/components/ui/card';
import {
  Avatar,
  AvatarFallback,
  AvatarImage
} from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { MoreHorizontal, MessageSquare, ThumbsUp, Flag } from 'lucide-react';
import ReportButton from '@/components/reports/report-button';
import CommentQualityEnhancer from './CommentQualityEnhancer';
import { useAnalytics } from '@vercel/analytics/react';
import { kv } from '@vercel/kv';
import { fluidCompute } from '@/lib/vercel/fluid-compute';

export interface Comment {
  id: string;
  content: string;
  authorId: string;
  author?: {
    id: string;
    name: string;
    image?: string;
  };
  createdAt: string;
  updatedAt: string;
  parentId?: string;
  contentId: string;
  contentType: string;
  isDeleted?: boolean;
  children?: Comment[];
  reactionCount?: number;
  userReaction?: string;
  moderationStatus?: 'pending' | 'approved' | 'rejected';
}

export interface CommentDisplayProps {
  comment: Comment;
  currentUserId: string;
  groupId?: string;
  onDelete?: (commentId: string) => void;
  onReaction?: (type: string, commentId: string) => void;
  onReply?: (commentId: string) => void;
  showQualityEnhancement?: boolean;
  onContentUpdate?: (commentId: string, newContent: string) => void;
  depth?: number;
  maxDepth?: number;
}

const CommentDisplay = ({
  comment,
  currentUserId,
  groupId = '',
  onDelete,
  onReaction,
  onReply,
  showQualityEnhancement = false,
  onContentUpdate,
  depth = 0,
  maxDepth = 3
}: CommentDisplayProps) => {
  const { data: session } = useSession();
  const [isEnhancerVisible, setIsEnhancerVisible] = useState(false);
  const analytics = useAnalytics();
  
  const isAuthor = currentUserId === comment.authorId;
  const hasChildren = comment.children && comment.children.length > 0;
  
  const handleContentUpdate = (newContent: string) => {
    if (onContentUpdate) {
      onContentUpdate(comment.id, newContent);
      
      // Log the event with Vercel Analytics
      analytics.track('comment_enhanced', {
        commentId: comment.id,
        userId: currentUserId,
        contentUpdated: true
      });
    }
  };
  
  const handleShowEnhancer = () => {
    setIsEnhancerVisible(prev => !prev);
    
    // Track when a user views enhancement suggestions
    if (!isEnhancerVisible) {
      analytics.track('view_comment_enhancements', {
        commentId: comment.id,
        userId: currentUserId,
        isAuthor
      });
    }
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Check if this is a deleted comment
  if (comment.isDeleted) {
    return (
      <Card className="mb-3">
        <CardContent className="py-3 text-gray-500 italic">
          This comment has been deleted
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mb-3">
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-start space-x-4">
            {/* Author Avatar */}
            <Avatar className="h-10 w-10">
              {comment.author?.image ? (
                <AvatarImage src={comment.author.image} alt={comment.author.name || 'User'} />
              ) : (
                <AvatarFallback>
                  {comment.author?.name ? getInitials(comment.author.name) : 'U'}
                </AvatarFallback>
              )}
            </Avatar>

            {/* Comment Content */}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-sm">
                    {comment.author?.name || comment.authorId}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </span>
                  
                  {/* Show moderation status badge if needed */}
                  {comment.moderationStatus && comment.moderationStatus !== 'approved' && (
                    <Badge variant={comment.moderationStatus === 'pending' ? 'outline' : 'destructive'}>
                      {comment.moderationStatus}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* Actions dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {isAuthor && onDelete && (
                        <DropdownMenuItem onClick={() => onDelete(comment.id)}>
                          Delete
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem>
                        <ReportButton
                          itemType="COMMENT"
                          itemId={comment.id}
                          groupId={groupId}
                          size="sm"
                          variant="ghost"
                        />
                      </DropdownMenuItem>
                      {session?.user && (
                        <DropdownMenuItem onClick={handleShowEnhancer}>
                          {isEnhancerVisible ? 'Hide Quality Tool' : 'Quality Tool'}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              {/* Comment text */}
              <div className="mt-2 text-sm text-gray-800 break-words">
                {comment.content}
              </div>
            </div>
          </div>
          
          {/* Quality Enhancement Component */}
          {showQualityEnhancement && isEnhancerVisible && (
            <CommentQualityEnhancer
              commentId={comment.id}
              commentContent={comment.content}
              onContentUpdate={handleContentUpdate}
              isAuthor={isAuthor}
            />
          )}
        </CardContent>
        
        <CardFooter className="py-2 px-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Like button */}
            {onReaction && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onReaction('LIKE', comment.id)}
                className="flex items-center space-x-1 text-gray-500 hover:text-blue-500"
              >
                <ThumbsUp className="h-4 w-4" />
                <span>{comment.reactionCount || 0}</span>
              </Button>
            )}
            
            {/* Reply button */}
            {onReply && depth < maxDepth && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onReply(comment.id)}
                className="flex items-center space-x-1 text-gray-500 hover:text-blue-500"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Reply</span>
              </Button>
            )}
          </div>
          
          {/* Enhancement suggestion button */}
          {!isEnhancerVisible && showQualityEnhancement && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShowEnhancer}
              className="text-xs text-gray-500 hover:text-emerald-500"
            >
              Enhance Comment
            </Button>
          )}
        </CardFooter>
      </Card>
      
      {/* Render child comments recursively */}
      {hasChildren && depth < maxDepth && (
        <div className="pl-8 mt-2 space-y-2">
          {comment.children!.map((childComment) => (
            <CommentDisplay
              key={childComment.id}
              comment={childComment}
              currentUserId={currentUserId}
              groupId={groupId}
              onDelete={onDelete}
              onReaction={onReaction}
              onReply={onReply}
              showQualityEnhancement={showQualityEnhancement}
              onContentUpdate={onContentUpdate}
              depth={depth + 1}
              maxDepth={maxDepth}
            />
          ))}
        </div>
      )}
      
      {/* Show "View more replies" button if max depth is reached */}
      {hasChildren && depth >= maxDepth && (
        <div className="pl-8 mt-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-blue-500 hover:text-blue-700"
            onClick={() => window.location.href = `/comments/${comment.id}`}
          >
            View {comment.children!.length} more {comment.children!.length === 1 ? 'reply' : 'replies'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default CommentDisplay;
