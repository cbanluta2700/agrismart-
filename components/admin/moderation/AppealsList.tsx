'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  Search,
  RefreshCw
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { AppealStatus, AppealWithDetails } from '@/lib/moderation/appeals';
import { AppealReviewCard } from './AppealReviewCard';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface AppealsListProps {
  initialAppeals: AppealWithDetails[];
  totalAppeals: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onApprove: (appealId: string, moderatorNotes: string) => Promise<void>;
  onReject: (appealId: string, moderatorNotes: string) => Promise<void>;
  onRefresh: () => void;
}

export function AppealsList({ 
  initialAppeals, 
  totalAppeals, 
  currentPage, 
  totalPages,
  onPageChange, 
  onApprove, 
  onReject,
  onRefresh
}: AppealsListProps) {
  const { toast } = useToast();
  const [appeals, setAppeals] = useState<AppealWithDetails[]>(initialAppeals);
  const [selectedAppeal, setSelectedAppeal] = useState<AppealWithDetails | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Status badge component
  const StatusBadge = ({ status }: { status: AppealStatus }) => {
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
  
  // Handle appeal approval
  const handleApproveAppeal = async (appealId: string, moderatorNotes: string) => {
    try {
      await onApprove(appealId, moderatorNotes);
      
      // Update local state
      setAppeals(appeals.map(appeal => 
        appeal.id === appealId 
          ? { ...appeal, status: 'APPROVED' as AppealStatus, moderatorNotes }
          : appeal
      ));
      
      setSelectedAppeal(null);
      
      toast({
        title: 'Appeal Approved',
        description: 'The comment has been restored and the user notified.',
      });
    } catch (error) {
      console.error('Error approving appeal:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve appeal. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  // Handle appeal rejection
  const handleRejectAppeal = async (appealId: string, moderatorNotes: string) => {
    try {
      await onReject(appealId, moderatorNotes);
      
      // Update local state
      setAppeals(appeals.map(appeal => 
        appeal.id === appealId 
          ? { ...appeal, status: 'REJECTED' as AppealStatus, moderatorNotes }
          : appeal
      ));
      
      setSelectedAppeal(null);
      
      toast({
        title: 'Appeal Rejected',
        description: 'The appeal has been rejected and the user notified.',
      });
    } catch (error) {
      console.error('Error rejecting appeal:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject appeal. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
      toast({
        title: 'Refreshed',
        description: 'Appeals list has been refreshed.',
      });
    } catch (error) {
      console.error('Error refreshing appeals:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh appeals. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Filtered appeals based on search and status filter
  const filteredAppeals = appeals.filter(appeal => {
    const matchesSearch = 
      searchQuery === '' || 
      appeal.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appeal.comment.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (appeal.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (appeal.user.email?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
    
    const matchesStatus = 
      statusFilter === 'all' || 
      appeal.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4 items-end">
        <div className="grid md:grid-cols-2 gap-4 w-full md:w-2/3">
          <div className="space-y-2">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search appeals..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="status-filter">Status</Label>
            <Select 
              value={statusFilter} 
              onValueChange={setStatusFilter}
            >
              <SelectTrigger id="status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          className="flex-shrink-0"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>
      
      <div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Comment Preview</TableHead>
                <TableHead>Appeal Reason</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAppeals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    No appeals found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAppeals.map((appeal) => (
                  <TableRow key={appeal.id}>
                    <TableCell className="font-medium">
                      {appeal.user.name || 'Unknown'}
                      <div className="text-xs text-muted-foreground">
                        {appeal.user.email}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {appeal.comment.content}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {appeal.reason}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDistanceToNow(new Date(appeal.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={appeal.status as AppealStatus} />
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedAppeal(appeal)}
                      >
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {Math.min((currentPage - 1) * 10 + 1, totalAppeals)} to {Math.min(currentPage * 10, totalAppeals)} of {totalAppeals} appeals
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Appeal Review Dialog */}
      <AlertDialog open={!!selectedAppeal} onOpenChange={(open) => !open && setSelectedAppeal(null)}>
        <AlertDialogContent className="p-0 overflow-hidden max-w-2xl">
          {selectedAppeal && (
            <AppealReviewCard
              appeal={selectedAppeal}
              onApprove={handleApproveAppeal}
              onReject={handleRejectAppeal}
              onClose={() => setSelectedAppeal(null)}
            />
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
