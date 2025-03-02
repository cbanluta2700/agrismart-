'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Alert, 
  AlertDescription, 
  AlertTitle 
} from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  MessageSquare, 
  Calendar 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { AppealStatus, AppealWithDetails } from '@/lib/moderation/appeals';

interface AppealReviewCardProps {
  appeal: AppealWithDetails;
  onApprove: (appealId: string, moderatorNotes: string) => Promise<void>;
  onReject: (appealId: string, moderatorNotes: string) => Promise<void>;
  onClose?: () => void;
}

export function AppealReviewCard({ appeal, onApprove, onReject, onClose }: AppealReviewCardProps) {
  const { toast } = useToast();
  const [moderatorNotes, setModeratorNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleApprove = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      await onApprove(appeal.id, moderatorNotes);
      toast({
        title: 'Appeal Approved',
        description: 'The comment has been restored and the user notified.',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error approving appeal:', error);
      setError('Failed to approve appeal. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to approve appeal. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleReject = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      await onReject(appeal.id, moderatorNotes);
      toast({
        title: 'Appeal Rejected',
        description: 'The appeal has been rejected and the user notified.',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error rejecting appeal:', error);
      setError('Failed to reject appeal. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to reject appeal. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Helper function to render status badge
  const renderStatusBadge = (status: AppealStatus) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case 'APPROVED':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300"><CheckCircle className="h-3 w-3 mr-1" /> Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">Appeal Review</CardTitle>
            <CardDescription>
              Appeal submitted {formatDistanceToNow(new Date(appeal.createdAt), { addSuffix: true })}
            </CardDescription>
          </div>
          {renderStatusBadge(appeal.status as AppealStatus)}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-2">
          <h3 className="font-medium flex items-center">
            <User className="h-4 w-4 mr-2" />
            Appeal Author
          </h3>
          <div className="pl-6 text-sm">
            <p><span className="font-medium">Name:</span> {appeal.user.name || 'Unknown'}</p>
            <p><span className="font-medium">Email:</span> {appeal.user.email || 'Unknown'}</p>
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="font-medium flex items-center">
            <MessageSquare className="h-4 w-4 mr-2" />
            Moderated Comment
          </h3>
          <div className="pl-6">
            <div className="p-3 bg-muted rounded-md text-sm">
              {appeal.comment.content}
            </div>
            <p className="text-xs mt-1 text-muted-foreground flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              Posted {formatDistanceToNow(new Date(appeal.comment.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="font-medium">Appeal Reason</h3>
          <div className="p-3 bg-muted rounded-md text-sm">
            {appeal.reason}
          </div>
        </div>
        
        {appeal.additionalInfo && (
          <div className="space-y-2">
            <h3 className="font-medium">Additional Information</h3>
            <div className="p-3 bg-muted rounded-md text-sm">
              {appeal.additionalInfo}
            </div>
          </div>
        )}
        
        {appeal.status === 'PENDING' && (
          <div className="space-y-2">
            <Label htmlFor="moderatorNotes">Moderator Notes</Label>
            <Textarea
              id="moderatorNotes"
              placeholder="Add notes explaining your decision (optional)..."
              value={moderatorNotes}
              onChange={(e) => setModeratorNotes(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        )}
        
        {appeal.status !== 'PENDING' && appeal.moderatorNotes && (
          <div className="space-y-2">
            <h3 className="font-medium">Moderator Notes</h3>
            <div className="p-3 bg-muted rounded-md text-sm">
              {appeal.moderatorNotes}
            </div>
            {appeal.reviewedAt && (
              <p className="text-xs text-muted-foreground">
                Reviewed {formatDistanceToNow(new Date(appeal.reviewedAt), { addSuffix: true })}
              </p>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        {appeal.status === 'PENDING' ? (
          <>
            <Button 
              variant="outline" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <div className="space-x-2">
              <Button 
                variant="destructive" 
                onClick={handleReject}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processing...' : 'Reject Appeal'}
              </Button>
              <Button 
                variant="default" 
                onClick={handleApprove}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processing...' : 'Approve Appeal'}
              </Button>
            </div>
          </>
        ) : (
          <Button 
            variant="outline" 
            onClick={onClose}
            className="ml-auto"
          >
            Close
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
