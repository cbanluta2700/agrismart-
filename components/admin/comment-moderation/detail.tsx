'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface Report {
  id: string;
  reporterId: string;
  reporter: {
    id: string;
    name: string;
  };
  category: {
    id: string;
    name: string;
    severity: number;
  };
  description?: string;
  status: 'PENDING' | 'PROCESSED' | 'DISMISSED';
  createdAt: string;
}

interface CommentModerationDetailProps {
  commentId: string;
  moderatorId: string;
  onActionComplete: () => void;
}

export function CommentModerationDetail({
  commentId,
  moderatorId,
  onActionComplete,
}: CommentModerationDetailProps) {
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isModerating, setIsModerating] = useState(false);
  const [comment, setComment] = useState<any>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [moderationReason, setModerationReason] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject'>('approve');
  
  // Fetch comment details
  useEffect(() => {
    const fetchCommentDetails = async () => {
      setIsLoading(true);
      
      try {
        const response = await axios.get(`/api/admin/comments/${commentId}`);
        
        if (response.data.status === 'success') {
          setComment(response.data.data.comment);
          setReports(response.data.data.reports || []);
          setAnalysisResults(response.data.data.analysisResults || null);
        }
      } catch (error) {
        console.error('Failed to fetch comment details:', error);
        toast.error('Failed to load comment details');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCommentDetails();
  }, [commentId]);
  
  // Handle moderation action
  const handleModerateComment = async (action: 'approve' | 'reject') => {
    setIsModerating(true);
    
    try {
      const response = await axios.post(`/api/admin/comments/${commentId}/moderate`, {
        action,
        moderatorId,
        reason: moderationReason.trim() || undefined,
      });
      
      if (response.data.status === 'success') {
        toast.success(`Comment ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
        onActionComplete();
      }
    } catch (error) {
      console.error('Failed to moderate comment:', error);
      toast.error('Failed to process moderation action');
    } finally {
      setIsModerating(false);
      setShowConfirmDialog(false);
    }
  };
  
  // Handle confirm dialog
  const handleConfirmDialog = (action: 'approve' | 'reject') => {
    setConfirmAction(action);
    setShowConfirmDialog(true);
  };
  
  // Get severity color
  const getSeverityColor = (severity: number) => {
    switch (severity) {
      case 5:
        return 'bg-red-500';
      case 4:
        return 'bg-orange-500';
      case 3:
        return 'bg-yellow-500';
      case 2:
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  // Get toxicity color class based on score
  const getToxicityColorClass = (score: number) => {
    if (score >= 0.8) return 'text-red-500';
    if (score >= 0.5) return 'text-yellow-500';
    return 'text-green-500';
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  // Error state
  if (!comment) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Icons.alertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">Failed to load comment</h3>
        <p className="text-sm text-muted-foreground mt-2 mb-6">
          The comment could not be found or you don't have permission to view it.
        </p>
        <Button onClick={onActionComplete}>Back to List</Button>
      </div>
    );
  }
  
  return (
    <>
      <CardContent className="p-6">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Comment Content</h3>
              <div className="p-4 rounded-md bg-muted">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground">
                      {comment.author.image ? (
                        <img
                          src={comment.author.image}
                          alt={comment.author.name}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <Icons.user className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{comment.author.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Posted on {format(new Date(comment.createdAt), 'MMMM d, yyyy h:mm a')}
                      </div>
                    </div>
                  </div>
                  <Badge variant={comment.visible ? 'outline' : 'destructive'}>
                    {comment.visible ? 'Visible' : 'Hidden'}
                  </Badge>
                </div>
                <p className="mt-2 whitespace-pre-wrap">{comment.content}</p>
              </div>
            </div>
            
            {comment.parentId && comment.parent && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">In Reply To</h3>
                <div className="p-3 rounded-md bg-muted/50 border">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-foreground">
                      {comment.parent.author?.image ? (
                        <img
                          src={comment.parent.author.image}
                          alt={comment.parent.author.name}
                          className="h-6 w-6 rounded-full object-cover"
                        />
                      ) : (
                        <Icons.user className="h-3 w-3" />
                      )}
                    </div>
                    <div className="text-sm font-medium">{comment.parent.author?.name || 'Unknown User'}</div>
                  </div>
                  <p className="text-sm line-clamp-2">{comment.parent.content}</p>
                </div>
              </div>
            )}
            
            <Tabs defaultValue="reports" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="reports">
                  Reports ({reports.length})
                </TabsTrigger>
                <TabsTrigger value="analysis">
                  AI Analysis
                </TabsTrigger>
              </TabsList>
              <TabsContent value="reports" className="p-4 border rounded-md mt-2">
                {reports.length > 0 ? (
                  <div className="space-y-4">
                    {reports.map((report) => (
                      <div key={report.id} className="border-b pb-4 last:border-0 last:pb-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                Reported by {report.reporter.name}
                              </span>
                              <Badge 
                                className={getSeverityColor(report.category.severity)}
                              >
                                Severity {report.category.severity}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {format(new Date(report.createdAt), 'MMMM d, yyyy h:mm a')}
                            </div>
                          </div>
                          <Badge variant={report.status === 'PENDING' ? 'outline' : 'secondary'}>
                            {report.status}
                          </Badge>
                        </div>
                        <div className="mt-2">
                          <div className="text-sm font-medium">
                            {report.category.name}
                          </div>
                          {report.description && (
                            <p className="text-sm mt-1">{report.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <Icons.fileX className="h-8 w-8 mx-auto mb-2" />
                    <p>No reports found for this comment</p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="analysis" className="p-4 border rounded-md mt-2">
                {analysisResults ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-md border">
                        <div className="text-sm font-medium mb-1">Toxicity Score</div>
                        <div className={`text-xl font-bold ${getToxicityColorClass(analysisResults.toxicityScore)}`}>
                          {(analysisResults.toxicityScore * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="p-3 rounded-md border">
                        <div className="text-sm font-medium mb-1">Recommendation</div>
                        <div className="text-xl font-bold">
                          {analysisResults.moderationRecommendation}
                        </div>
                      </div>
                    </div>
                    
                    {analysisResults.categories && (
                      <div>
                        <div className="text-sm font-medium mb-2">Content Categories</div>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(analysisResults.categories).map(([category, score]: [string, any]) => (
                            <div key={category} className="flex items-center justify-between p-2 rounded-md border">
                              <span className="text-sm">{category}</span>
                              <Badge className={parseFloat(score) > 0.5 ? 'bg-red-500' : 'bg-green-500'}>
                                {(parseFloat(score) * 100).toFixed(1)}%
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {analysisResults.analysisNotes && (
                      <div>
                        <div className="text-sm font-medium mb-1">Analysis Notes</div>
                        <p className="text-sm p-3 rounded-md bg-muted">
                          {analysisResults.analysisNotes}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <Icons.fileX className="h-8 w-8 mx-auto mb-2" />
                    <p>No AI analysis data available for this comment</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
          
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Moderation Actions</CardTitle>
                <CardDescription>
                  Take action on this comment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="moderation-reason">Moderation Reason (Optional)</Label>
                    <Textarea
                      id="moderation-reason"
                      placeholder="Enter reason for moderation action..."
                      value={moderationReason}
                      onChange={(e) => setModerationReason(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      disabled={isModerating}
                      onClick={() => handleConfirmDialog('approve')}
                    >
                      <Icons.check className="mr-2 h-4 w-4" />
                      Approve Comment
                    </Button>
                    <Button
                      variant="destructive"
                      className="w-full justify-start"
                      disabled={isModerating}
                      onClick={() => handleConfirmDialog('reject')}
                    >
                      <Icons.x className="mr-2 h-4 w-4" />
                      Reject Comment
                    </Button>
                  </div>
                  
                  <Separator />
                  
                  <div className="text-sm font-medium">User Management</div>
                  
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      disabled={isModerating}
                    >
                      <Icons.userCog className="mr-2 h-4 w-4" />
                      View User Profile
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      disabled={isModerating}
                    >
                      <Icons.messageCircle className="mr-2 h-4 w-4" />
                      View User Comments
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-amber-500 hover:text-amber-600"
                      disabled={isModerating}
                    >
                      <Icons.alertTriangle className="mr-2 h-4 w-4" />
                      Warn User
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Comment Info</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge>
                        {comment.moderationStatus}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span>
                        {format(new Date(comment.createdAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reports:</span>
                      <span>{comment.reportCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ID:</span>
                      <span className="font-mono text-xs">{comment.id.substring(0, 8)}...</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </CardContent>
      
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'approve' ? 'Approve Comment' : 'Reject Comment'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'approve'
                ? 'This will approve the comment and make it visible to all users.'
                : 'This will reject the comment and hide it from all users.'}
              {moderationReason && (
                <div className="mt-2 p-2 bg-muted rounded-md">
                  <span className="font-medium">Reason:</span> {moderationReason}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isModerating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleModerateComment(confirmAction)}
              disabled={isModerating}
              className={confirmAction === 'reject' ? 'bg-destructive text-destructive-foreground' : ''}
            >
              {isModerating ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                confirmAction === 'approve' ? 'Approve' : 'Reject'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
