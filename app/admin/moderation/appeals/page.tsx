'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardDescription,
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AppealsList } from '@/components/admin/moderation/AppealsList';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AppealWithDetails } from '@/lib/moderation/appeals';
import { PageHeader } from '@/components/admin/PageHeader';

export default function AppealsManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appeals, setAppeals] = useState<AppealWithDetails[]>([]);
  const [totalAppeals, setTotalAppeals] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingCount, setPendingCount] = useState(0);
  
  // Redirect if user is not authenticated or not an admin
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/admin/moderation/appeals');
    } else if (status === 'authenticated' && session?.user?.role !== 'ADMIN' && session?.user?.role !== 'MODERATOR') {
      router.push('/dashboard');
    }
  }, [status, session, router]);
  
  // Fetch appeals
  const fetchAppeals = async (page = 1, status = activeTab) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/admin/appeals?page=${page}&status=${status}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch appeals');
      }
      
      const data = await response.json();
      
      setAppeals(data.appeals);
      setTotalAppeals(data.total);
      setCurrentPage(data.page);
      setTotalPages(data.totalPages);
      
      // Fetch pending count if not on the pending tab
      if (status !== 'pending') {
        const pendingResponse = await fetch('/api/admin/appeals/counts');
        if (pendingResponse.ok) {
          const counts = await pendingResponse.json();
          setPendingCount(counts.pending);
        }
      } else {
        setPendingCount(data.total);
      }
    } catch (error) {
      console.error('Error fetching appeals:', error);
      setError('Failed to load appeals. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Initial fetch
  useEffect(() => {
    if (status === 'authenticated' && (session?.user?.role === 'ADMIN' || session?.user?.role === 'MODERATOR')) {
      fetchAppeals(1, activeTab);
    }
  }, [status, session, activeTab]);
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setCurrentPage(1);
  };
  
  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchAppeals(page, activeTab);
  };
  
  // Handle approve
  const handleApproveAppeal = async (appealId: string, moderatorNotes: string) => {
    try {
      const response = await fetch(`/api/admin/appeals/${appealId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ moderatorNotes }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to approve appeal');
      }
      
      // Refresh the appeals list
      fetchAppeals(currentPage, activeTab);
    } catch (error) {
      console.error('Error approving appeal:', error);
      throw error;
    }
  };
  
  // Handle reject
  const handleRejectAppeal = async (appealId: string, moderatorNotes: string) => {
    try {
      const response = await fetch(`/api/admin/appeals/${appealId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ moderatorNotes }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to reject appeal');
      }
      
      // Refresh the appeals list
      fetchAppeals(currentPage, activeTab);
    } catch (error) {
      console.error('Error rejecting appeal:', error);
      throw error;
    }
  };
  
  // If loading or not authenticated yet
  if (status === 'loading' || (status === 'authenticated' && !session?.user)) {
    return (
      <div className="container py-10">
        <Card>
          <CardHeader>
            <CardTitle>Appeals Management</CardTitle>
            <CardDescription>Loading...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
  
  // If not an admin or moderator
  if (status === 'authenticated' && session?.user?.role !== 'ADMIN' && session?.user?.role !== 'MODERATOR') {
    return (
      <div className="container py-10">
        <Card>
          <CardHeader>
            <CardTitle>Unauthorized</CardTitle>
            <CardDescription>You do not have permission to access this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container py-10 space-y-6">
      <PageHeader
        title="Appeals Management"
        description="Review and manage moderation appeals submitted by users"
      />
      
      <Card>
        <CardHeader className="pb-3">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList>
              <TabsTrigger value="pending">
                Pending
                {pendingCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{pendingCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="all">All Appeals</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <AppealsList
              initialAppeals={appeals}
              totalAppeals={totalAppeals}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              onApprove={handleApproveAppeal}
              onReject={handleRejectAppeal}
              onRefresh={() => fetchAppeals(currentPage, activeTab)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
