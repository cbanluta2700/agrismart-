'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Icons } from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';
import { CalendarDateRangePicker } from '@/components/ui/date-range-picker';
import { Pagination } from '@/components/ui/pagination';
import { CommentModerationTable } from './table';
import { CommentModerationDetail } from './detail';
import { EmptyPlaceholder } from '@/components/admin/empty-placeholder';

interface CommentModerationDashboardProps {
  userId: string;
}

export function CommentModerationDashboard({ userId }: CommentModerationDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Query params
  const tab = searchParams.get('tab') || 'reported';
  const page = Number(searchParams.get('page') || '1');
  const selectedCommentId = searchParams.get('commentId');
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [comments, setComments] = useState<any[]>([]);
  const [totalComments, setTotalComments] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>();
  
  // Fetch comments based on current filters and pagination
  const fetchComments = async () => {
    setIsLoading(true);
    
    try {
      const response = await axios.get('/api/admin/comments', {
        params: {
          tab,
          page,
          limit: 10,
          search: searchQuery,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          sortField,
          sortDirection,
          fromDate: dateRange?.from?.toISOString(),
          toDate: dateRange?.to?.toISOString(),
        },
      });
      
      if (response.data.status === 'success') {
        setComments(response.data.data.comments);
        setTotalComments(response.data.data.total);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
      toast.error('Failed to load comments for moderation');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update query params
  const updateQuery = (params: Record<string, string | null>) => {
    const urlSearchParams = new URLSearchParams(searchParams.toString());
    
    Object.entries(params).forEach(([key, value]) => {
      if (value === null) {
        urlSearchParams.delete(key);
      } else {
        urlSearchParams.set(key, value);
      }
    });
    
    const newUrl = `${window.location.pathname}?${urlSearchParams.toString()}`;
    router.push(newUrl);
  };
  
  // Change tab handler
  const handleTabChange = (value: string) => {
    updateQuery({ tab: value, page: '1', commentId: null });
  };
  
  // Apply filters handler
  const handleApplyFilters = () => {
    updateQuery({ page: '1' });
    fetchComments();
  };
  
  // Reset filters handler
  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSortField('createdAt');
    setSortDirection('desc');
    setDateRange(undefined);
    updateQuery({ 
      page: '1', 
      search: null,
      status: null,
      sortField: null,
      sortDirection: null,
      fromDate: null,
      toDate: null
    });
  };
  
  // Handle comment selection
  const handleSelectComment = (commentId: string) => {
    updateQuery({ commentId: commentId });
  };
  
  // Handle pagination
  const handlePageChange = (newPage: number) => {
    updateQuery({ page: newPage.toString() });
  };
  
  // Load comments when filters or pagination changes
  useEffect(() => {
    fetchComments();
  }, [tab, page]);
  
  // View mode: table or detail
  const viewMode = selectedCommentId ? 'detail' : 'table';
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Comment Moderation</CardTitle>
            <CardDescription>
              Review and moderate user comments across the platform
            </CardDescription>
          </div>
          
          {viewMode === 'detail' && (
            <Button
              variant="ghost"
              onClick={() => updateQuery({ commentId: null })}
            >
              <Icons.arrowLeft className="mr-2 h-4 w-4" />
              Back to list
            </Button>
          )}
        </div>
      </CardHeader>
      
      {viewMode === 'table' && (
        <>
          <Tabs value={tab} onValueChange={handleTabChange}>
            <div className="px-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="reported">
                  Reported
                  <Badge variant="secondary" className="ml-2">
                    New
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="pending">Pending Review</TabsTrigger>
                <TabsTrigger value="moderated">Moderated</TabsTrigger>
                <TabsTrigger value="all">All Comments</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value={tab} className="p-0">
              <CardContent className="p-4 border-b">
                <div className="flex flex-col gap-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="search" className="text-sm font-medium">
                        Search Comments
                      </label>
                      <Input
                        id="search"
                        placeholder="Search by content or username..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="status" className="text-sm font-medium">
                        Status
                      </label>
                      <Select
                        value={statusFilter}
                        onValueChange={setStatusFilter}
                      >
                        <SelectTrigger id="status">
                          <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="PENDING">Pending</SelectItem>
                          <SelectItem value="APPROVED">Approved</SelectItem>
                          <SelectItem value="REJECTED">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="sort" className="text-sm font-medium">
                        Sort By
                      </label>
                      <div className="flex gap-2">
                        <Select
                          value={sortField}
                          onValueChange={setSortField}
                        >
                          <SelectTrigger id="sort">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="createdAt">Date</SelectItem>
                            <SelectItem value="reportCount">Reports</SelectItem>
                            <SelectItem value="toxicityScore">Toxicity</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                        >
                          {sortDirection === 'asc' ? (
                            <Icons.arrowUp className="h-4 w-4" />
                          ) : (
                            <Icons.arrowDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium">Date Range</label>
                      <CalendarDateRangePicker
                        date={dateRange}
                        setDate={setDateRange}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={handleResetFilters}
                    >
                      Reset Filters
                    </Button>
                    
                    <Button onClick={handleApplyFilters}>
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </CardContent>
              
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex justify-center items-center py-24">
                    <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : comments.length > 0 ? (
                  <CommentModerationTable
                    comments={comments}
                    onSelectComment={handleSelectComment}
                  />
                ) : (
                  <EmptyPlaceholder
                    title="No comments found"
                    description="No comments matching your filters were found."
                    icon={<Icons.messageSquare className="h-12 w-12" />}
                  />
                )}
              </CardContent>
              
              <CardFooter className="flex justify-between border-t p-4">
                <div className="text-sm text-muted-foreground">
                  Showing {comments.length} of {totalComments} comments
                </div>
                
                <Pagination
                  currentPage={page}
                  totalPages={Math.ceil(totalComments / 10)}
                  onPageChange={handlePageChange}
                />
              </CardFooter>
            </TabsContent>
          </Tabs>
        </>
      )}
      
      {viewMode === 'detail' && selectedCommentId && (
        <CommentModerationDetail
          commentId={selectedCommentId}
          moderatorId={userId}
          onActionComplete={() => {
            updateQuery({ commentId: null });
            fetchComments();
          }}
        />
      )}
    </Card>
  );
}
