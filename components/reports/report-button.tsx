'use client';

import { useState } from 'react';
import { Flag, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useUser } from '@clerk/nextjs';
import useAnalytics from '@/hooks/useAnalytics';

interface ReportButtonProps {
  itemType: 'POST' | 'COMMENT' | 'USER';
  itemId: string;
  groupId: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children?: React.ReactNode;
}

const REPORT_REASONS = {
  POST: [
    'Inappropriate content',
    'Offensive language',
    'Misinformation',
    'Spam',
    'Harassment',
    'Irrelevant to group',
    'Other',
  ],
  COMMENT: [
    'Inappropriate content',
    'Offensive language',
    'Misinformation',
    'Spam',
    'Harassment',
    'Off-topic',
    'Other',
  ],
  USER: [
    'Impersonation',
    'Spam behavior',
    'Harassment',
    'Inappropriate profile',
    'Other',
  ],
};

export default function ReportButton({
  itemType,
  itemId,
  groupId,
  variant = 'ghost',
  size = 'default',
  className = '',
  children,
}: ReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { isSignedIn } = useUser();
  const analytics = useAnalytics();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isSignedIn) {
      toast({
        title: 'Report error',
        description: 'You must be logged in to report content',
        variant: 'destructive',
      });
      return;
    }

    if (!reason) {
      toast({
        title: 'Report error',
        description: 'Please select a reason for your report',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason,
          details,
          itemType,
          itemId,
          groupId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit report');
      }

      const data = await response.json();
      
      // Track the report submission
      analytics.trackReportSubmit(data.id, itemType, itemId, groupId);
      
      toast({
        title: 'Report submitted',
        description: 'Thank you for helping to keep our community safe. Moderators will review your report.',
      });
      
      setIsOpen(false);
      setReason('');
      setDetails('');
    } catch (error) {
      console.error('Error submitting report:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit report',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isSignedIn) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          {children || (
            <>
              <Flag className="h-4 w-4 mr-2" />
              Report
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Report {itemType.toLowerCase()}</DialogTitle>
          <DialogDescription>
            Please provide details about why you're reporting this {itemType.toLowerCase()}.
            Moderators will review your report as soon as possible.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Select value={reason} onValueChange={setReason} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS[itemType].map((reportReason) => (
                  <SelectItem key={reportReason} value={reportReason}>
                    {reportReason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="details">Additional details (optional)</Label>
            <Textarea
              id="details"
              placeholder="Provide any additional context that might help moderators..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
