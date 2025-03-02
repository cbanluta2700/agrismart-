'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { AppealSubmissionSchema } from '@/lib/moderation/appeals';
import { z } from 'zod';

interface AppealSubmissionFormProps {
  commentId: string;
  onSuccess?: (appealId: string) => void;
  onCancel?: () => void;
}

export function AppealSubmissionForm({ commentId, onSuccess, onCancel }: AppealSubmissionFormProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  
  const [reason, setReason] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [remainingAppeals, setRemainingAppeals] = useState<number | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    if (!session?.user) {
      setError('You must be signed in to submit an appeal');
      setIsSubmitting(false);
      return;
    }
    
    // Validate the form data locally before sending to the server
    try {
      AppealSubmissionSchema.parse({
        commentId,
        reason,
        additionalInfo: additionalInfo || undefined,
      });
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        setError(validationError.errors.map(e => e.message).join(', '));
        setIsSubmitting(false);
        return;
      }
    }
    
    try {
      const response = await fetch('/api/comments/appeal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commentId,
          reason,
          additionalInfo: additionalInfo || undefined,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Failed to submit appeal');
        toast({
          title: 'Error',
          description: data.error || 'Failed to submit appeal',
          variant: 'destructive',
        });
      } else {
        setSuccess(true);
        setRemainingAppeals(data.rateLimit?.remaining);
        toast({
          title: 'Appeal Submitted',
          description: 'Your appeal has been submitted and will be reviewed by a moderator.',
          variant: 'default',
        });
        
        if (onSuccess) {
          onSuccess(data.appealId);
        }
      }
    } catch (error) {
      console.error('Error submitting appeal:', error);
      setError('An unexpected error occurred. Please try again later.');
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Appeal Submitted
          </CardTitle>
          <CardDescription>
            Your appeal has been submitted successfully
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="default" className="bg-green-50 border-green-200">
            <AlertTitle>Appeal Status</AlertTitle>
            <AlertDescription>
              Your appeal has been queued for review. You will be notified when a moderator reviews your appeal.
              {remainingAppeals !== null && (
                <p className="mt-2 text-sm text-muted-foreground">
                  You have {remainingAppeals} appeal submissions remaining today.
                </p>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={onCancel}>Close</Button>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Appeal Moderation Decision</CardTitle>
          <CardDescription>
            Explain why you believe this moderation decision should be reconsidered.
            Appeals are reviewed by our moderation team.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Appeal <span className="text-red-500">*</span></Label>
            <Textarea
              id="reason"
              placeholder="Please explain why you believe this comment should not have been moderated..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px]"
              required
            />
            <p className="text-xs text-muted-foreground">
              Minimum 10 characters, maximum 1000 characters.
              {reason.length > 0 && (
                <span className={reason.length > 1000 ? 'text-red-500' : ''}>
                  {' '}{reason.length}/1000
                </span>
              )}
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="additionalInfo">Additional Information (Optional)</Label>
            <Textarea
              id="additionalInfo"
              placeholder="Any additional context or information that might help with the review..."
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              Maximum 2000 characters.
              {additionalInfo.length > 0 && (
                <span className={additionalInfo.length > 2000 ? 'text-red-500' : ''}>
                  {' '}{additionalInfo.length}/2000
                </span>
              )}
            </p>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting || reason.length < 10 || reason.length > 1000 || additionalInfo.length > 2000}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Appeal'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
