import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import Head from 'next/head';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { ContentTypeIndicator } from '@/components/resources/ContentTypeIndicator';
import { ModeratedContentStatus } from '@/components/resources/ModeratedContentStatus';
import { useResourceModeration } from '@/hooks/useResourceModeration';
import { ResourceContentType, ResourceModerationItem, ResourceStatus } from '@/types/resources';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Eye,
  Pencil,
  Trash2,
  Check,
  X,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster, toast } from '@/components/ui/toaster';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch data');
  return res.json();
};

const ResourcesModerationPage: NextPage = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN';
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ResourceStatus | 'ALL'>('PENDING');
  const [typeFilter, setTypeFilter] = useState<ResourceContentType | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  
  const [selectedItem, setSelectedItem] = useState<ResourceModerationItem | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'delete' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  const { 
    approveResource, 
    rejectResource, 
    deleteResource, 
    isLoading, 
    error 
  } = useResourceModeration({
    onSuccess: (action) => {
      setActionDialogOpen(false);
      toast({
        title: `Success!`,
        description: `The content has been ${
          action === 'approve' ? 'approved' : 
          action === 'reject' ? 'rejected' : 'deleted'
        } successfully.`,
        variant: 'default',
      });
      mutate();
    }
  });

  // Get the API URL with filters
  const getApiUrl = () => {
    let url = `/api/admin/resources/moderation?page=${page}&itemsPerPage=${itemsPerPage}`;
    if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
    if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;
    if (typeFilter !== 'ALL') url += `&type=${typeFilter}`;
    return url;
  };

  const { data, error: fetchError, isLoading: isLoadingData, mutate } = useSWR<{
    items: ResourceModerationItem[];
    totalItems: number;
    totalPages: number;
    page: number;
  }>(isAdmin ? getApiUrl() : null, fetcher);

  // Check for action parameter to show success message
  useEffect(() => {
    const { action } = router.query;
    if (action) {
      toast({
        title: 'Success!',
        description: `The content has been ${action} successfully.`,
        variant: 'default',
      });
      
      // Remove the query parameter to prevent showing the toast on page refresh
      const { pathname } = router;
      router.replace(pathname, undefined, { shallow: true });
    }
  }, [router]);

  const openActionDialog = (item: ResourceModerationItem, action: 'approve' | 'reject' | 'delete') => {
    setSelectedItem(item);
    setActionType(action);
    setRejectionReason('');
    setActionDialogOpen(true);
  };

  const handleAction = async () => {
    if (!selectedItem || !actionType) return;
    
    try {
      if (actionType === 'approve') {
        await approveResource(selectedItem.id, selectedItem.contentType);
      } else if (actionType === 'reject') {
        await rejectResource(selectedItem.id, selectedItem.contentType, rejectionReason);
      } else if (actionType === 'delete') {
        await deleteResource(selectedItem.id, selectedItem.contentType);
      }
    } catch (err) {
      console.error('Error performing action:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!isAdmin) {
    return (
      <AdminLayout>
        <Head>
          <title>Content Moderation | AgriSmart Admin</title>
        </Head>
        <div className="container mx-auto py-8">
          <Card>
            <CardHeader>
              <CardTitle>Unauthorized Access</CardTitle>
              <CardDescription>
                You do not have permission to access this page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Please contact an administrator if you believe this is an error.</p>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Head>
        <title>Content Moderation | AgriSmart Admin</title>
      </Head>

      <div className="container mx-auto py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">Content Moderation</h1>
            <p className="text-gray-500">Review and moderate content submissions</p>
          </div>
          <div className="mt-4 md:mt-0">
            <Button asChild>
              <a href="/admin/resources/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Resource
              </a>
            </Button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <form onSubmit={(e) => e.preventDefault()} className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Search by title or author..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
                <Button type="submit">
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </Button>
              </form>
            </div>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Content Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="article">Articles</SelectItem>
                  <SelectItem value="guide">Guides</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                  <SelectItem value="glossary">Glossary</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Content Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoadingData ? (
            <div className="p-8 text-center">Loading content...</div>
          ) : fetchError ? (
            <div className="p-8 text-center text-red-500">Error loading content</div>
          ) : data?.items.length === 0 ? (
            <div className="p-8 text-center">No content found matching your filters</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.id.slice(0, 8)}</TableCell>
                      <TableCell className="font-medium">{item.title}</TableCell>
                      <TableCell>
                        <ContentTypeIndicator type={item.contentType} />
                      </TableCell>
                      <TableCell>{item.authorName}</TableCell>
                      <TableCell>{formatDate(item.createdAt)}</TableCell>
                      <TableCell>
                        <ModeratedContentStatus status={item.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => window.open(`/resources/${item.contentType}s/${item.slug || item.id}`, '_blank')}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.location.href = `/admin/resources/edit/${item.contentType}/${item.id}`}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {item.status === 'PENDING' && (
                              <>
                                <DropdownMenuItem onClick={() => openActionDialog(item, 'approve')}>
                                  <Check className="mr-2 h-4 w-4 text-green-500" />
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openActionDialog(item, 'reject')}>
                                  <X className="mr-2 h-4 w-4 text-red-500" />
                                  Reject
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openActionDialog(item, 'delete')} className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {data && data.totalPages > 1 && (
                <div className="p-4 border-t">
                  <Pagination>
                    <PaginationPrevious>
                      <ChevronLeft className="h-4 w-4" />
                    </PaginationPrevious>
                    <PaginationItem>
                      <PaginationLink href="#" onClick={() => setPage(1)}>
                        1
                      </PaginationLink>
                    </PaginationItem>
                    {data.page > 2 && (
                      <PaginationEllipsis>
                        <span>...</span>
                      </PaginationEllipsis>
                    )}
                    {data.page > 1 && (
                      <PaginationItem>
                        <PaginationLink href="#" onClick={() => setPage(data.page - 1)}>
                          {data.page - 1}
                        </PaginationLink>
                      </PaginationItem>
                    )}
                    <PaginationItem>
                      <PaginationLink href="#" onClick={() => setPage(data.page)}>
                        {data.page}
                      </PaginationLink>
                    </PaginationItem>
                    {data.page < data.totalPages && (
                      <PaginationItem>
                        <PaginationLink href="#" onClick={() => setPage(data.page + 1)}>
                          {data.page + 1}
                        </PaginationLink>
                      </PaginationItem>
                    )}
                    {data.page < data.totalPages - 1 && (
                      <PaginationEllipsis>
                        <span>...</span>
                      </PaginationEllipsis>
                    )}
                    {data.page < data.totalPages && (
                      <PaginationItem>
                        <PaginationLink href="#" onClick={() => setPage(data.totalPages)}>
                          {data.totalPages}
                        </PaginationLink>
                      </PaginationItem>
                    )}
                    <PaginationNext>
                      <ChevronRight className="h-4 w-4" />
                    </PaginationNext>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve Content' : 
              actionType === 'reject' ? 'Reject Content' : 'Delete Content'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? `Are you sure you want to approve "${selectedItem?.title}"?`
                : actionType === 'reject'
                  ? `Please provide a reason for rejecting "${selectedItem?.title}".`
                  : `Are you sure you want to delete "${selectedItem?.title}"?`}
            </DialogDescription>
          </DialogHeader>
          
          {actionType === 'reject' && (
            <div className="py-4">
              <Textarea
                placeholder="Reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>Cancel</Button>
            <Button 
              variant={actionType === 'approve' ? 'default' : actionType === 'reject' ? 'destructive' : 'destructive'} 
              onClick={handleAction}
              disabled={actionType === 'reject' && !rejectionReason.trim()}
            >
              {actionType === 'approve' ? 'Approve' : actionType === 'reject' ? 'Reject' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default ResourcesModerationPage;
