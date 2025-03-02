'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { UserAppealsNotifications } from '@/components/moderation/UserAppealsNotifications';
import { AppealWithDetails } from '@/lib/moderation/appeals';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatDistanceToNow } from 'date-fns';

export default function UserAppealsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appeals, setAppeals] = useState<AppealWithDetails[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  
  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/dashboard/appeals');
    }
  }, [status, router]);
  
  // Fetch user appeals
  const fetchAppeals = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/user/appeals');
      
      if (!response.ok) {
        throw new Error('Failed to fetch appeals');
      }
      
      const data = await response.json();
      setAppeals(data.appeals);
    } catch (error) {
      console.error('Error fetching appeals:', error);
      setError('Failed to load appeals. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Initial fetch
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      fetchAppeals();
    }
  }, [status, session]);
  
  // Filtered appeals based on active tab
  const filteredAppeals = appeals.filter(appeal => {
    if (activeTab === 'all') return true;
    return appeal.status.toLowerCase() === activeTab.toLowerCase();
  });
  
  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
            <Clock className="h-3 w-3 mr-1" /> Pending
          </Badge>
        );
      case 'APPROVED':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
            <CheckCircle className="h-3 w-3 mr-1" /> Approved
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
            <XCircle className="h-3 w-3 mr-1" /> Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Loading state
  if (status === 'loading' || (status === 'authenticated' && isLoading)) {
    return (
      <div className="container py-10 space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-10 w-full" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
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
            <CardDescription>Please log in to view your appeals</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">My Appeals</h1>
        <p className="text-muted-foreground">
          Track the status of your content moderation appeals
        </p>
      </div>
      
      <UserAppealsNotifications userId={session?.user?.id || ''} />
      
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Appeal History</h2>
          <Button variant="outline" size="sm" onClick={fetchAppeals} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
        
        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">
                  All
                  <Badge variant="secondary" className="ml-2">{appeals.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="pending">
                  Pending
                  <Badge variant="secondary" className="ml-2">
                    {appeals.filter(a => a.status === 'PENDING').length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="approved">
                  Approved
                  <Badge variant="secondary" className="ml-2">
                    {appeals.filter(a => a.status === 'APPROVED').length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="rejected">
                  Rejected
                  <Badge variant="secondary" className="ml-2">
                    {appeals.filter(a => a.status === 'REJECTED').length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            {filteredAppeals.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No appeals found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAppeals.map((appeal) => (
                  <Card key={appeal.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base">Appeal</CardTitle>
                        <StatusBadge status={appeal.status} />
                      </div>
                      <CardDescription>
                        Submitted {formatDistanceToNow(new Date(appeal.createdAt), { addSuffix: true })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium mb-1">Moderated Comment</h4>
                          <div className="bg-muted p-3 rounded-md text-sm">
                            {appeal.comment.content}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium mb-1">Appeal Reason</h4>
                          <p className="text-sm">{appeal.reason}</p>
                        </div>
                        
                        {appeal.additionalInfo && (
                          <div>
                            <h4 className="text-sm font-medium mb-1">Additional Information</h4>
                            <p className="text-sm">{appeal.additionalInfo}</p>
                          </div>
                        )}
                        
                        {appeal.status !== 'PENDING' && appeal.reviewedAt && (
                          <div className="text-sm text-muted-foreground">
                            Reviewed {formatDistanceToNow(new Date(appeal.reviewedAt), { addSuffix: true })}
                          </div>
                        )}
                        
                        {appeal.moderatorNotes && (
                          <div>
                            <h4 className="text-sm font-medium mb-1">Moderator Notes</h4>
                            <p className="text-sm italic">{appeal.moderatorNotes}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
