'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/components/ui/use-toast';
import { Loader2, AlertCircle, CheckCircle, Clock, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ContentType, ModerationPriority, ModerationStatus } from '@prisma/client';
import Link from 'next/link';
import { Pagination } from '@/components/ui/pagination';
import { useSession } from 'next-auth/react';

// Types for moderation queue items
interface ModerationQueueItem {
  id: string;
  contentId: string;
  contentType: ContentType;
  status: ModerationStatus;
  priority: ModerationPriority;
  reason?: string;
  autoFlagged: boolean;
  createdAt: string;
  reporterId?: string;
  reporter?: {
    id: string;
    name?: string;
    image?: string;
  };
  moderatorId?: string;
  moderator?: {
    id: string;
    name?: string;
    image?: string;
  };
  assignedAt?: string;
  resolvedAt?: string;
  history?: ModerationHistoryItem[];
}

interface ModerationHistoryItem {
  id: string;
  status: ModerationStatus;
  actionTaken?: string;
  moderatorId?: string;
  moderator?: {
    id: string;
    name?: string;
    image?: string;
  };
  notes?: string;
  createdAt: string;
}

interface PaginationData {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

// Moderation Queue Page Component
export default function ModerationQueuePage() {
  const session = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State for queue data
  const [queueItems, setQueueItems] = useState<ModerationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    totalItems: 0,
    totalPages: 0
  });
  
  // Filters
  const [status, setStatus] = useState<ModerationStatus | ''>('PENDING');
  const [contentType, setContentType] = useState<ContentType | ''>('');
  const [priority, setPriority] = useState<ModerationPriority | ''>('');
  
  // Initialize from URL params if available
  useEffect(() => {
    const page = searchParams.get('page') ? parseInt(searchParams.get('page') as string) : 1;
    const statusParam = searchParams.get('status') as ModerationStatus | null;
    const contentTypeParam = searchParams.get('contentType') as ContentType | null;
    const priorityParam = searchParams.get('priority') as ModerationPriority | null;
    
    if (page > 0) {
      setPagination(prev => ({ ...prev, page }));
    }
    
    if (statusParam) {
      setStatus(statusParam);
    }
    
    if (contentTypeParam) {
      setContentType(contentTypeParam);
    }
    
    if (priorityParam) {
      setPriority(priorityParam);
    }
  }, [searchParams]);
  
  // Fetch moderation queue data
  useEffect(() => {
    async function fetchModerationQueue() {
      try {
        setLoading(true);
        setError(null);
        
        // Build query params
        const params = new URLSearchParams();
        params.append('page', pagination.page.toString());
        params.append('limit', pagination.limit.toString());
        
        if (status) {
          params.append('status', status);
        }
        
        if (contentType) {
          params.append('contentType', contentType);
        }
        
        if (priority) {
          params.append('priority', priority);
        }
        
        const response = await fetch(`/api/moderation/queue?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error(`Error fetching moderation queue: ${response.statusText}`);
        }
        
        const data = await response.json();
        setQueueItems(data.items);
        setPagination(data.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        toast({
          title: 'Error',
          description: err instanceof Error ? err.message : 'Failed to load moderation queue',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }
    
    // Only fetch if user is logged in
    if (session.status === 'authenticated') {
      fetchModerationQueue();
    }
  }, [pagination.page, status, contentType, priority, session.status]);
  
  // Update URL with filters
  const updateFilters = () => {
    const params = new URLSearchParams();
    params.append('page', '1'); // Reset to page 1 when filters change
    
    if (status) {
      params.append('status', status);
    }
    
    if (contentType) {
      params.append('contentType', contentType);
    }
    
    if (priority) {
      params.append('priority', priority);
    }
    
    router.push(`/admin/moderation?${params.toString()}`);
  };
  
  // Handle page change
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`/admin/moderation?${params.toString()}`);
  };
  
  // UI helpers
  const getStatusBadge = (status: ModerationStatus) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'IN_REVIEW':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">In Review</Badge>;
      case 'APPROVED':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Rejected</Badge>;
      case 'NEEDS_REVIEW':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800">Needs Review</Badge>;
      case 'AUTO_APPROVED':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Auto-Approved</Badge>;
      case 'AUTO_REJECTED':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Auto-Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const getPriorityBadge = (priority: ModerationPriority) => {
    switch (priority) {
      case 'LOW':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Low</Badge>;
      case 'NORMAL':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Normal</Badge>;
      case 'HIGH':
        return <Badge variant="outline" className="bg-orange-100 text-orange-800">High</Badge>;
      case 'URGENT':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Urgent</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };
  
  const getContentTypeDisplay = (type: ContentType) => {
    switch (type) {
      case 'POST': return 'Post';
      case 'COMMENT': return 'Comment';
      case 'PRODUCT': return 'Product';
      case 'RESOURCE': return 'Resource';
      case 'PROFILE': return 'User Profile';
      case 'GROUP': return 'Group';
      case 'MESSAGE': return 'Message';
      case 'EVENT': return 'Event';
      default: return type;
    }
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Moderation Queue</h1>
          <p className="text-muted-foreground">Review and moderate content across the platform</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => router.push('/admin/moderation/rules')}>
            <Shield className="w-4 h-4 mr-2" />
            Moderation Rules
          </Button>
          <Button variant="outline" onClick={() => router.push('/admin/moderation/analytics')}>
            Analytics
          </Button>
        </div>
      </div>
      
      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter the moderation queue by status, content type, and priority</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="w-full md:w-auto">
              <p className="text-sm font-medium mb-2">Status</p>
              <Select value={status} onValueChange={(value) => setStatus(value as ModerationStatus | '')}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="IN_REVIEW">In Review</SelectItem>
                  <SelectItem value="NEEDS_REVIEW">Needs Review</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="AUTO_APPROVED">Auto-Approved</SelectItem>
                  <SelectItem value="AUTO_REJECTED">Auto-Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-full md:w-auto">
              <p className="text-sm font-medium mb-2">Content Type</p>
              <Select value={contentType} onValueChange={(value) => setContentType(value as ContentType | '')}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select content type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any Type</SelectItem>
                  <SelectItem value="POST">Posts</SelectItem>
                  <SelectItem value="COMMENT">Comments</SelectItem>
                  <SelectItem value="PRODUCT">Products</SelectItem>
                  <SelectItem value="RESOURCE">Resources</SelectItem>
                  <SelectItem value="PROFILE">User Profiles</SelectItem>
                  <SelectItem value="GROUP">Groups</SelectItem>
                  <SelectItem value="MESSAGE">Messages</SelectItem>
                  <SelectItem value="EVENT">Events</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-full md:w-auto">
              <p className="text-sm font-medium mb-2">Priority</p>
              <Select value={priority} onValueChange={(value) => setPriority(value as ModerationPriority | '')}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any Priority</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-full md:w-auto flex items-end">
              <Button onClick={updateFilters}>
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Moderation Queue */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              Moderation Items
              {pagination.totalItems > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({pagination.totalItems} total)
                </span>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading moderation queue...</span>
            </div>
          ) : error ? (
            <div className="flex justify-center items-center py-12 text-red-500">
              <AlertCircle className="h-8 w-8 mr-2" />
              {error}
            </div>
          ) : queueItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium">No items in moderation queue</p>
              <p>All content has been moderated or no content matches the current filters.</p>
            </div>
          ) : (
            <Table>
              <TableCaption>List of content pending moderation</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Content Type</TableHead>
                  <TableHead>Reported</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Moderator</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queueItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{getContentTypeDisplay(item.contentType)}</TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell>{getPriorityBadge(item.priority)}</TableCell>
                    <TableCell>
                      {item.reporter ? (
                        <div className="flex items-center">
                          <Avatar className="h-6 w-6 mr-2">
                            <AvatarImage src={item.reporter.image || undefined} />
                            <AvatarFallback>{item.reporter.name?.substring(0, 2) || 'U'}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{item.reporter.name || 'Unknown'}</span>
                        </div>
                      ) : item.autoFlagged ? (
                        <div className="flex items-center">
                          <Badge variant="outline" className="bg-purple-100 text-purple-800">
                            Auto-flagged
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.moderator ? (
                        <div className="flex items-center">
                          <Avatar className="h-6 w-6 mr-2">
                            <AvatarImage src={item.moderator.image || undefined} />
                            <AvatarFallback>{item.moderator.name?.substring(0, 2) || 'M'}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{item.moderator.name || 'Unknown'}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link href={`/admin/moderation/${item.id}`} passHref>
                        <Button size="sm">Review</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {pagination.totalPages > 1 && (
          <CardFooter className="flex justify-center border-t pt-6">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
