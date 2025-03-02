'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Flag, Check, X, AlertTriangle, Eye } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Report {
  id: string;
  reason: string;
  details?: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  itemType: 'POST' | 'COMMENT' | 'USER';
  itemId: string;
  reporter: {
    id: string;
    name: string;
    avatar?: string;
  };
  group: {
    id: string;
    name: string;
  };
  resolvedBy?: {
    id: string;
    name: string;
  };
  resolution?: string;
  createdAt: string;
  updatedAt: string;
  reportedContent?: any;
}

interface ReportsTabProps {
  groupId: string;
}

export default function ReportsTab({ groupId }: ReportsTabProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportDetailOpen, setReportDetailOpen] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolution, setResolution] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [submitting, setSubmitting] = useState(false);
  
  // Check if a specific report is requested via URL
  useEffect(() => {
    const reportId = searchParams.get('reportId');
    if (reportId) {
      fetchReportDetails(reportId);
    }
  }, [searchParams]);

  // Fetch reports
  useEffect(() => {
    fetchReports();
  }, [currentPage, statusFilter]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/reports?groupId=${groupId}&status=${statusFilter}&page=${currentPage}&limit=10`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }
      
      const data = await response.json();
      setReports(data.reports);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast({
        title: 'Error',
        description: 'Failed to load reports. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchReportDetails = async (reportId: string) => {
    try {
      const response = await fetch(`/api/reports/${reportId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch report details');
      }
      
      const data = await response.json();
      setSelectedReport(data);
      setReportDetailOpen(true);
    } catch (error) {
      console.error('Error fetching report details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load report details.',
        variant: 'destructive',
      });
    }
  };

  const handleResolveReport = async (status: 'RESOLVED' | 'DISMISSED') => {
    if (!selectedReport) return;
    
    setSubmitting(true);
    
    try {
      const response = await fetch(`/api/reports/${selectedReport.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          resolution: resolution || undefined,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update report');
      }
      
      toast({
        title: 'Report updated',
        description: `The report has been marked as ${status.toLowerCase()}.`,
      });
      
      // Refresh the reports list
      fetchReports();
      
      // Close dialogs
      setResolveDialogOpen(false);
      setReportDetailOpen(false);
      setResolution('');
    } catch (error) {
      console.error('Error updating report:', error);
      toast({
        title: 'Error',
        description: 'Failed to update report. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openResolveDialog = () => {
    setResolveDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-yellow-100 border-yellow-400 text-yellow-800">Pending</Badge>;
      case 'RESOLVED':
        return <Badge variant="outline" className="bg-green-100 border-green-400 text-green-800">Resolved</Badge>;
      case 'DISMISSED':
        return <Badge variant="outline" className="bg-gray-100 border-gray-400 text-gray-800">Dismissed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderReportedContentPreview = () => {
    if (!selectedReport || !selectedReport.reportedContent) return null;
    
    const { reportedContent, itemType } = selectedReport;
    
    switch (itemType) {
      case 'POST':
        return (
          <div className="border rounded-md p-4 bg-muted/50 mt-4">
            <h3 className="font-semibold">{reportedContent.title}</h3>
            <div className="text-sm text-muted-foreground mt-1">
              By {reportedContent.author.name} • {format(new Date(reportedContent.createdAt), 'MMM dd, yyyy')}
            </div>
            <p className="mt-2 text-sm">{reportedContent.content}</p>
            <Link 
              href={`/forum/groups/${selectedReport.group.id}/posts/${reportedContent.id}`}
              className="text-sm text-primary mt-2 block hover:underline"
            >
              View post
            </Link>
          </div>
        );
      
      case 'COMMENT':
        return (
          <div className="border rounded-md p-4 bg-muted/50 mt-4">
            <div className="text-sm text-muted-foreground">
              Comment by {reportedContent.author.name} on post "{reportedContent.post.title}"
            </div>
            <p className="mt-2 text-sm">{reportedContent.content}</p>
            <Link 
              href={`/forum/groups/${selectedReport.group.id}/posts/${reportedContent.post.id}`}
              className="text-sm text-primary mt-2 block hover:underline"
            >
              View in context
            </Link>
          </div>
        );
      
      case 'USER':
        return (
          <div className="border rounded-md p-4 bg-muted/50 mt-4">
            <div className="flex items-center">
              <Avatar className="h-10 w-10 mr-2">
                <AvatarImage src={reportedContent.avatar || ''} alt={reportedContent.name} />
                <AvatarFallback>{reportedContent.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{reportedContent.name}</h3>
                {reportedContent.bio && (
                  <p className="text-sm text-muted-foreground">{reportedContent.bio}</p>
                )}
              </div>
            </div>
            <Link 
              href={`/profile/${reportedContent.id}`}
              className="text-sm text-primary mt-2 block hover:underline"
            >
              View profile
            </Link>
          </div>
        );
      
      default:
        return <p className="text-muted-foreground">Content details not available</p>;
    }
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Reports</h2>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="RESOLVED">Resolved</SelectItem>
              <SelectItem value="DISMISSED">Dismissed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border rounded-md p-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
              <Skeleton className="h-16 w-full mt-4" />
            </div>
          ))}
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Flag className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold">No reports found</h3>
            <p className="text-muted-foreground text-center mt-1">
              {statusFilter === 'PENDING'
                ? 'There are no pending reports to review.'
                : `No ${statusFilter.toLowerCase()} reports found.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reason</TableHead>
                <TableHead>Reported By</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{report.reason}</TableCell>
                  <TableCell>{report.reporter.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {report.itemType === 'POST' ? 'Post' : 
                       report.itemType === 'COMMENT' ? 'Comment' : 'User'}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(report.status)}</TableCell>
                  <TableCell>{format(new Date(report.createdAt), 'MMM dd, yyyy')}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fetchReportDetails(report.id)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <Pagination className="mt-4">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}

      {/* Report Details Dialog */}
      <Dialog open={reportDetailOpen} onOpenChange={setReportDetailOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Report Details</DialogTitle>
            <DialogDescription>
              Submitted on {selectedReport ? format(new Date(selectedReport.createdAt), 'MMMM dd, yyyy') : ''}
            </DialogDescription>
          </DialogHeader>
          
          {selectedReport && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold mb-1">Status</h4>
                  {getStatusBadge(selectedReport.status)}
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-1">Report Type</h4>
                  <Badge variant="outline">
                    {selectedReport.itemType === 'POST' ? 'Post' : 
                     selectedReport.itemType === 'COMMENT' ? 'Comment' : 'User'}
                  </Badge>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold mb-1">Reason</h4>
                <p>{selectedReport.reason}</p>
              </div>
              
              {selectedReport.details && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">Additional Details</h4>
                  <p className="text-muted-foreground">{selectedReport.details}</p>
                </div>
              )}
              
              <div>
                <h4 className="text-sm font-semibold mb-1">Reported By</h4>
                <div className="flex items-center">
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarImage src={selectedReport.reporter.avatar || ''} alt={selectedReport.reporter.name} />
                    <AvatarFallback>{selectedReport.reporter.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span>{selectedReport.reporter.name}</span>
                </div>
              </div>
              
              {selectedReport.resolvedBy && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">Resolved By</h4>
                  <p>{selectedReport.resolvedBy.name}</p>
                  
                  {selectedReport.resolution && (
                    <div className="mt-2">
                      <h5 className="text-sm font-semibold mb-1">Resolution Note</h5>
                      <p className="text-muted-foreground">{selectedReport.resolution}</p>
                    </div>
                  )}
                </div>
              )}
              
              <div>
                <h4 className="text-sm font-semibold mb-1">Reported Content</h4>
                {renderReportedContentPreview()}
              </div>
            </div>
          )}
          
          <DialogFooter>
            {selectedReport && selectedReport.status === 'PENDING' && (
              <div className="flex gap-2 w-full justify-end">
                <Button 
                  variant="outline" 
                  onClick={openResolveDialog}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Resolve
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => handleResolveReport('DISMISSED')}
                  disabled={submitting}
                >
                  <X className="h-4 w-4 mr-2" />
                  Dismiss
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Resolution Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Resolve Report</DialogTitle>
            <DialogDescription>
              Add a note explaining how this report was resolved. This will be visible to moderators only.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="resolution">Resolution note (optional)</Label>
              <Textarea
                id="resolution"
                placeholder="Explain actions taken..."
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResolveDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={() => handleResolveReport('RESOLVED')}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Confirm Resolution'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
