import React, { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ResourceStatus, ResourceContentType } from '@/types/resources';
import { useResourceModeration } from '@/hooks/useResourceModeration';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ModeratedContentStatus } from '@/components/resources/ModeratedContentStatus';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ResourceModerationBannerProps {
  resourceId: string;
  resourceTitle: string;
  contentType: ResourceContentType;
  status: ResourceStatus;
  rejectionReason?: string;
  onStatusChange?: (newStatus: ResourceStatus) => void;
}

export const ResourceModerationBanner: React.FC<ResourceModerationBannerProps> = ({
  resourceId,
  resourceTitle,
  contentType,
  status,
  rejectionReason,
  onStatusChange,
}) => {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN';
  const isAuthor = session?.user?.id === resourceId;
  
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [reason, setReason] = useState('');
  
  const { approveResource, rejectResource, isLoading, error } = useResourceModeration({
    onSuccess: (action) => {
      setActionDialogOpen(false);
      if (action === 'approve' && onStatusChange) {
        onStatusChange('APPROVED');
      } else if (action === 'reject' && onStatusChange) {
        onStatusChange('REJECTED');
      }
    }
  });

  const handleOpenDialog = (action: 'approve' | 'reject') => {
    setActionType(action);
    setReason('');
    setActionDialogOpen(true);
  };

  const handleAction = async () => {
    if (actionType === 'approve') {
      await approveResource(resourceId, contentType);
    } else {
      await rejectResource(resourceId, contentType, reason);
    }
  };

  if (!isAdmin && status !== 'REJECTED') return null;

  return (
    <>
      <div className="mb-6">
        {status === 'PENDING' && isAdmin && (
          <Alert className="bg-orange-50 border-orange-200">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertTitle>Moderation Required</AlertTitle>
            <AlertDescription className="flex justify-between items-center">
              <div>
                This content is awaiting moderation.
              </div>
              <div className="flex space-x-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenDialog('reject')}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <XCircle className="mr-1 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleOpenDialog('approve')}
                >
                  <CheckCircle className="mr-1 h-4 w-4" />
                  Approve
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {status === 'REJECTED' && (
          <Alert className="bg-red-50 border-red-200">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertTitle>Content Rejected</AlertTitle>
            <AlertDescription>
              <div>
                This content has been rejected{rejectionReason ? ': ' + rejectionReason : '.'}
              </div>
              {isAdmin && (
                <div className="flex space-x-2 mt-2">
                  <Button
                    size="sm"
                    onClick={() => handleOpenDialog('approve')}
                    className="mt-2"
                  >
                    <CheckCircle className="mr-1 h-4 w-4" />
                    Approve
                  </Button>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {status === 'DRAFT' && isAdmin && (
          <Alert className="bg-gray-50 border-gray-200">
            <Clock className="h-4 w-4 text-gray-600" />
            <AlertTitle>Draft Content</AlertTitle>
            <AlertDescription className="flex justify-between items-center">
              <div>
                This content is in draft mode and not published yet.
              </div>
              <div className="flex space-x-2 mt-2">
                <Button
                  size="sm"
                  onClick={() => handleOpenDialog('approve')}
                >
                  <CheckCircle className="mr-1 h-4 w-4" />
                  Publish
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {status === 'APPROVED' && isAdmin && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle>Published Content</AlertTitle>
            <AlertDescription className="flex justify-between items-center">
              <div>
                This content has been approved and is publicly available.
              </div>
              <div className="flex space-x-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenDialog('reject')}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <XCircle className="mr-1 h-4 w-4" />
                  Unpublish
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {(isAdmin || isAuthor) && (
          <div className="mt-2 flex justify-end">
            <Button asChild variant="ghost" size="sm">
              <Link href={`/admin/resources/moderation/details/${resourceId}`}>
                <ExternalLink className="mr-1 h-4 w-4" />
                View in Moderation Dashboard
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Approve/Reject Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve Content' : 'Reject Content'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve' 
                ? `Are you sure you want to approve "${resourceTitle}"?` 
                : `Please provide a reason for rejecting "${resourceTitle}".`}
            </DialogDescription>
          </DialogHeader>
          
          {actionType === 'reject' && (
            <div className="py-4">
              <Textarea
                placeholder="Reason for rejection..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
              />
              {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button 
              variant={actionType === 'approve' ? 'default' : 'destructive'} 
              onClick={handleAction}
              disabled={(actionType === 'reject' && !reason.trim()) || isLoading}
            >
              {isLoading ? 'Processing...' : actionType === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
