'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

interface Comment {
  id: string;
  content: string;
  authorId: string;
  author: {
    id: string;
    name: string;
    image?: string;
  };
  createdAt: string;
  reportCount: number;
  moderationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  toxicityScore?: number;
  parentId?: string;
  parent?: {
    id: string;
    content: string;
  };
}

interface CommentModerationTableProps {
  comments: Comment[];
  onSelectComment: (id: string) => void;
}

export function CommentModerationTable({
  comments,
  onSelectComment,
}: CommentModerationTableProps) {
  const [selectedComments, setSelectedComments] = useState<string[]>([]);

  // Handle checkbox selection
  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedComments([...selectedComments, id]);
    } else {
      setSelectedComments(selectedComments.filter((commentId) => commentId !== id));
    }
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedComments(comments.map((comment) => comment.id));
    } else {
      setSelectedComments([]);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-500">Rejected</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  // Get toxicity badge
  const getToxicityBadge = (score?: number) => {
    if (score === undefined) return null;
    
    if (score >= 0.8) {
      return <Badge className="bg-red-500">High</Badge>;
    } else if (score >= 0.5) {
      return <Badge className="bg-yellow-500">Medium</Badge>;
    } else {
      return <Badge className="bg-green-500">Low</Badge>;
    }
  };

  return (
    <div>
      {selectedComments.length > 0 && (
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-background p-4 border-b">
          <div className="text-sm">
            {selectedComments.length} selected
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedComments([])}
            >
              Clear Selection
            </Button>
            <Button
              variant="default"
              size="sm"
            >
              Bulk Actions
            </Button>
          </div>
        </div>
      )}
      
      <div className="relative overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={comments.length > 0 && selectedComments.length === comments.length}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all comments"
                />
              </TableHead>
              <TableHead>Comment</TableHead>
              <TableHead>Author</TableHead>
              <TableHead className="w-24">Date</TableHead>
              <TableHead className="w-24">Reports</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-24">Toxicity</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comments.map((comment) => (
              <TableRow key={comment.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedComments.includes(comment.id)}
                    onCheckedChange={(checked) => handleSelect(comment.id, !!checked)}
                    aria-label={`Select comment ${comment.id}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="line-clamp-2 text-sm">
                      {comment.content}
                    </div>
                    {comment.parentId && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Reply to:</span>{" "}
                        <span className="line-clamp-1">
                          {comment.parent?.content}
                        </span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {comment.author.image ? (
                      <img
                        src={comment.author.image}
                        alt={comment.author.name}
                        className="h-6 w-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                        <Icons.user className="h-4 w-4" />
                      </div>
                    )}
                    <Link
                      href={`/admin/users/${comment.authorId}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {comment.author.name}
                    </Link>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(comment.createdAt), 'MMM d, yyyy')}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-center">
                    {comment.reportCount > 0 ? (
                      <Badge variant={comment.reportCount >= 3 ? "destructive" : "secondary"}>
                        {comment.reportCount}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">0</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(comment.moderationStatus)}
                </TableCell>
                <TableCell>
                  {getToxicityBadge(comment.toxicityScore)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelectComment(comment.id)}
                  >
                    Review
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
