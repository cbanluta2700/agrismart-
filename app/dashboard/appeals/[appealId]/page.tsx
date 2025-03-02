'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  MessageSquare, 
  Calendar,
  ArrowLeft
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatDistanceToNow } from 'date-fns';
import { AppealWithDetails, AppealStatus } from '@/lib/moderation/appeals';

export default function AppealDetailPage({ params }: { params: { appealId: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appeal, setAppeal] = useState<AppealWithDetails | null>(null);
  
  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=/dashboard/appeals/${params.appealId}`);
    }
  }, [status, router, params.appealId]);
  
  // Fetch appeal details
  useEffect(() => {
    const fetchAppealDetails = async () => {
      if (!params.appealId || status !== 'authenticated') return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`/api/user/appeals/${params.appealId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Appeal not found');
          } else if (response.status === 403) {
            throw new Error('You do not have permission to view this appeal');
          } else {
            throw new Error('Failed to fetch appeal details');
          }
        }
        
        const data = await response.json();
        setAppeal(data);
      } catch (error) {
        console.error('Error fetching appeal details:', error);
        setError((error as Error).message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAppealDetails();
  }, [params.appealId, status]);
  
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
  
  // Loading state
  if (status === 'loading' || (status === 'authenticated' && isLoading)) {
    return (
      <div className="container py-10 space-y-6">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  
  // Not authenticated
  if (status === 'unauthenticated') {
    return (
      <div className="container py-10">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to view this appeal</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="container py-10 space-y-6">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/dashboard/appeals">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Appeals
          </Link>
        </Button>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (!appeal) {
    return (
      <div className="container py-10 space-y-6">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/dashboard/appeals">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Appeals
          </Link>
        </Button>
        
        <Card>
          <CardHeader>
            <CardTitle>Appeal Not Found</CardTitle>
            <CardDescription>We couldn't find the appeal you're looking for</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild>
              <Link href="/dashboard/appeals">View All Appeals</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container py-10 space-y-6">
      <Button variant="ghost" asChild className="mb-6">
        <Link href="/dashboard/appeals">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Appeals
        </Link>
      </Button>
      
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl">Appeal Details</CardTitle>
              <CardDescription>
                Submitted {formatDistanceToNow(new Date(appeal.createdAt), { addSuffix: true })}
              </CardDescription>
            </div>
            {renderStatusBadge(appeal.status as AppealStatus)}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
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
          
          <Alert className={
            appeal.status === 'APPROVED' 
              ? 'bg-green-50 text-green-800 border-green-200' 
              : appeal.status === 'REJECTED'
                ? 'bg-red-50 text-red-800 border-red-200'
                : 'bg-yellow-50 text-yellow-800 border-yellow-200'
          }>
            <div className="flex items-center gap-2">
              {appeal.status === 'APPROVED' 
                ? <CheckCircle className="h-4 w-4" /> 
                : appeal.status === 'REJECTED'
                  ? <XCircle className="h-4 w-4" />
                  : <Clock className="h-4 w-4" />
              }
              <AlertTitle>
                {appeal.status === 'APPROVED' 
                  ? 'Appeal Approved' 
                  : appeal.status === 'REJECTED'
                    ? 'Appeal Rejected'
                    : 'Appeal Pending Review'
                }
              </AlertTitle>
            </div>
            <AlertDescription>
              {appeal.status === 'APPROVED' 
                ? 'Your appeal has been approved and your comment has been restored.'
                : appeal.status === 'REJECTED'
                  ? 'Your appeal has been reviewed and rejected. Your comment remains moderated.'
                  : 'Your appeal is currently being reviewed by our moderation team.'
              }
            </AlertDescription>
          </Alert>
        </CardContent>
        
        <CardFooter>
          <Button variant="outline" asChild className="w-full">
            <Link href="/dashboard/appeals">
              Return to Appeals Dashboard
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
