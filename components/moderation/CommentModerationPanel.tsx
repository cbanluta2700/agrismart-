import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  CheckIcon, 
  XMarkIcon, 
  PencilIcon, 
  TrashIcon, 
  FunnelIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ModerationStatus } from '@prisma/client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { trackCommentModerationView } from '@/lib/vercel/moderation-analytics';

// Types for comments with moderation information
interface Comment {
  id: string;
  content: string;
  visible: boolean;
  createdAt: string;
  updatedAt: string;
  postId: string;
  post?: {
    title: string;
  };
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  moderation?: {
    status: ModerationStatus;
    reason?: string;
    modifiedContent?: string;
    token?: string;
  };
}

type FilterStatus = 'ALL' | 'PENDING' | 'NEEDS_REVIEW' | 'AUTO_APPROVED' | 'APPROVED' | 'REJECTED' | 'EDITED';

interface CommentModerationPanelProps {
  initialComments?: Comment[];
  onComplete?: () => void;
}

// Maps moderation statuses to UI elements
const statusInfo: Record<ModerationStatus, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  NEEDS_REVIEW: { label: 'Needs Review', color: 'bg-orange-100 text-orange-800' },
  AUTO_APPROVED: { label: 'Auto-Approved', color: 'bg-green-100 text-green-800' },
  APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
  EDITED: { label: 'Edited', color: 'bg-blue-100 text-blue-800' },
};

export default function CommentModerationPanel({ 
  initialComments = [],
  onComplete
}: CommentModerationPanelProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [loading, setLoading] = useState(initialComments.length === 0);
  const [actionLoading, setActionLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('NEEDS_REVIEW');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [moderationReason, setModerationReason] = useState('');
  
  // Track view in Vercel Analytics
  useEffect(() => {
    trackCommentModerationView();
  }, []);
  
  // Load comments on component mount and when filters change
  useEffect(() => {
    if (initialComments.length === 0) {
      fetchComments();
    }
  }, [filterStatus, page]);
  
  // Fetch comments from the API based on filters
  const fetchComments = async () => {
    setLoading(true);
    
    try {
      // Build query params from filters
      const queryParams = new URLSearchParams();
      
      if (filterStatus !== 'ALL') {
        queryParams.append('status', filterStatus);
      }
      
      queryParams.append('page', page.toString());
      queryParams.append('limit', '10');
      
      const response = await fetch(`/api/moderation/queue?${queryParams.toString()}&contentType=COMMENT`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }
      
      const data = await response.json();
      
      if (page === 1) {
        setComments(data.items);
      } else {
        setComments(prev => [...prev, ...data.items]);
      }
      
      setHasMore(data.hasMore);
      if (data.items.length > 0 && !selectedComment) {
        setSelectedComment(data.items[0]);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load comments for moderation.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handlers for moderation actions
  const handleApprove = async () => {
    if (!selectedComment) return;
    await performModerationAction('APPROVE');
  };
  
  const handleReject = async () => {
    if (!selectedComment) return;
    await performModerationAction('REJECT');
  };
  
  const handleEdit = () => {
    if (!selectedComment) return;
    setEditedContent(selectedComment.content);
    setEditDialogOpen(true);
  };
  
  const submitEdit = async () => {
    if (!selectedComment) return;
    setEditDialogOpen(false);
    await performModerationAction('EDIT', editedContent);
  };
  
  const performModerationAction = async (action: 'APPROVE' | 'REJECT' | 'EDIT', modifiedContent?: string) => {
    if (!selectedComment || !selectedComment.moderation?.token) return;
    
    setActionLoading(true);
    
    try {
      const response = await fetch(`/api/forum/comments?id=${selectedComment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: selectedComment.content, // Keep original content for reference
          moderationToken: selectedComment.moderation.token,
          moderationAction: action,
          moderationReason: moderationReason || `Comment ${action.toLowerCase()}ed via moderation panel`,
          moderatedContent: modifiedContent,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to perform moderation action');
      }
      
      // Update local state
      setComments(prev => 
        prev.map(comment => 
          comment.id === selectedComment.id 
            ? {
                ...comment,
                content: modifiedContent || comment.content,
                visible: action !== 'REJECT',
                moderation: {
                  ...comment.moderation!,
                  status: action === 'APPROVE' ? 'APPROVED' : 
                          action === 'REJECT' ? 'REJECTED' : 'EDITED',
                  reason: moderationReason,
                  modifiedContent
                }
              }
            : comment
        )
      );
      
      toast({
        title: 'Success',
        description: `Comment successfully ${action.toLowerCase()}ed.`,
        variant: 'default',
      });
      
      // Clear moderation reason
      setModerationReason('');
      
      // Select next comment if available
      selectNextComment();
      
    } catch (error) {
      console.error(`Error ${action.toLowerCase()}ing comment:`, error);
      toast({
        title: 'Error',
        description: `Failed to ${action.toLowerCase()} comment.`,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };
  
  const selectNextComment = () => {
    if (!selectedComment) return;
    
    const currentIndex = comments.findIndex(c => c.id === selectedComment.id);
    if (currentIndex < comments.length - 1) {
      setSelectedComment(comments[currentIndex + 1]);
    } else {
      // If we're at the end of the list, try to load more or reset selection
      if (hasMore) {
        setPage(p => p + 1);
      } else if (comments.length > 0) {
        setSelectedComment(null);
        
        // If onComplete is provided, call it
        if (onComplete && typeof onComplete === 'function') {
          onComplete();
        }
      }
    }
  };
  
  const loadMore = () => {
    if (hasMore && !loading) {
      setPage(p => p + 1);
    }
  };
  
  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Left panel - Comments list */}
      <div className="w-full md:w-1/3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xl flex justify-between items-center">
              Comments Queue
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowFilters(prev => !prev)}
                className="ml-2"
              >
                <FunnelIcon className="h-4 w-4 mr-1" />
                Filter
              </Button>
            </CardTitle>
            
            {/* Filter controls */}
            <div className={`mt-2 ${showFilters ? 'block' : 'hidden'}`}>
              <Select
                value={filterStatus}
                onValueChange={(value) => setFilterStatus(value as FilterStatus)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Comments</SelectItem>
                  <SelectItem value="NEEDS_REVIEW">Needs Review</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="AUTO_APPROVED">Auto-Approved</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="EDITED">Edited</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-6">
                <Spinner />
              </div>
            ) : comments.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-500">No comments found matching criteria</p>
              </div>
            ) : (
              <>
                <ul className="divide-y divide-gray-200 max-h-[60vh] overflow-y-auto pr-2">
                  {comments.map((comment) => {
                    const status = comment.moderation?.status || 'PENDING';
                    const statusData = statusInfo[status] || { label: 'Unknown', color: 'bg-gray-100 text-gray-800' };
                    
                    return (
                      <li 
                        key={comment.id}
                        className={`py-3 cursor-pointer rounded-md hover:bg-gray-50 ${
                          selectedComment?.id === comment.id ? 'bg-gray-100' : ''
                        }`}
                        onClick={() => setSelectedComment(comment)}
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between items-start">
                            <div className="font-medium">{comment.author.name}</div>
                            <Badge className={statusData.color}>{statusData.label}</Badge>
                          </div>
                          
                          <div className="text-sm text-gray-600 line-clamp-2">
                            {comment.content}
                          </div>
                          
                          <div className="text-xs text-gray-500">
                            {format(new Date(comment.createdAt), 'MMM d, yyyy')}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                
                {hasMore && (
                  <div className="mt-4 text-center">
                    <Button variant="outline" onClick={loadMore} disabled={loading}>
                      {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
                      Load More
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Right panel - Selected comment details */}
      <div className="w-full md:w-2/3">
        {selectedComment ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Comment Details</CardTitle>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-6">
                {/* Author and post info */}
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-medium">Author</h3>
                    <p>{selectedComment.author.name}</p>
                  </div>
                  {selectedComment.post && (
                    <div>
                      <h3 className="font-medium">Post</h3>
                      <p>{selectedComment.post.title}</p>
                    </div>
                  )}
                  <div>
                    <h3 className="font-medium">Created</h3>
                    <p>{format(new Date(selectedComment.createdAt), 'PPP')}</p>
                  </div>
                </div>
                
                {/* Comment content */}
                <div>
                  <h3 className="font-medium mb-2">Content</h3>
                  <div className="p-4 bg-gray-50 rounded-md whitespace-pre-wrap">
                    {selectedComment.content}
                  </div>
                </div>
                
                {/* Moderation status */}
                <div>
                  <h3 className="font-medium mb-2">Moderation Status</h3>
                  <div className="flex items-center">
                    <Badge className={statusInfo[selectedComment.moderation?.status || 'PENDING'].color}>
                      {statusInfo[selectedComment.moderation?.status || 'PENDING'].label}
                    </Badge>
                    {selectedComment.moderation?.reason && (
                      <span className="ml-2 text-sm text-gray-600">
                        {selectedComment.moderation.reason}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Moderation reason input */}
                <div>
                  <h3 className="font-medium mb-2">Reason for Moderation (Optional)</h3>
                  <Textarea
                    value={moderationReason}
                    onChange={(e) => setModerationReason(e.target.value)}
                    placeholder="Enter reason for moderation action..."
                    className="w-full"
                  />
                </div>
                
                {/* Action buttons */}
                <div className="flex space-x-3 pt-4">
                  <Button
                    variant="default"
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={handleApprove}
                    disabled={actionLoading}
                  >
                    <CheckIcon className="h-5 w-5 mr-1" />
                    Approve
                  </Button>
                  
                  <Button
                    variant="default"
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    onClick={handleEdit}
                    disabled={actionLoading}
                  >
                    <PencilIcon className="h-5 w-5 mr-1" />
                    Edit
                  </Button>
                  
                  <Button
                    variant="default"
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    onClick={handleReject}
                    disabled={actionLoading}
                  >
                    <XMarkIcon className="h-5 w-5 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-gray-500">Select a comment to moderate</p>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Comment</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[200px]"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitEdit} disabled={actionLoading}>
              {actionLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
