'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ModerationLog {
  id: string;
  action: string;
  itemType: string;
  itemId: string;
  moderator: {
    name: string;
    avatar: string | null;
  };
  reason: string | null;
  createdAt: string;
}

interface LogsTabProps {
  groupId: string;
}

export default function LogsTab({ groupId }: LogsTabProps) {
  const [logs, setLogs] = useState<ModerationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/forum/groups/${groupId}/moderation/logs?page=${page}&limit=${limit}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch logs');
      
      const data = await response.json();
      setLogs(data.logs);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching moderation logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [groupId, page, limit]);

  const getActionBadge = (action: string) => {
    const actionMap: { [key: string]: string } = {
      HIDE: 'destructive',
      UNHIDE: 'default',
      LOCK: 'warning',
      UNLOCK: 'default',
      DELETE: 'destructive',
      ROLE_CHANGE: 'success',
    };

    return (
      <Badge variant={actionMap[action] as any} className="capitalize">
        {action.replace('_', ' ').toLowerCase()}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Moderator</TableHead>
              <TableHead>Item Type</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                </TableRow>
              ))
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                  No moderation actions recorded
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{getActionBadge(log.action)}</TableCell>
                  <TableCell>{log.moderator.name}</TableCell>
                  <TableCell className="capitalize">{log.itemType.toLowerCase()}</TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    {log.reason || 'No reason provided'}
                  </TableCell>
                  <TableCell>
                    {new Date(log.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      <CardFooter className="flex justify-between border-t p-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={page === totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </div>
  );
}
