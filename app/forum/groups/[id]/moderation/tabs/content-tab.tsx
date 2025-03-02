'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CardContent, CardFooter } from '@/components/ui/card';
import { 
  Search, 
  MoreVertical, 
  EyeOff, 
  Lock, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  MessageSquare,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

interface ContentItem {
  id: string;
  type: 'post' | 'comment';
  title?: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar: string | null;
  };
  createdAt: string;
  hidden: boolean;
  locked?: boolean;
  pinned?: boolean;
}

interface ContentTabProps {
  groupId: string;
  postCount: number;
}

export default function ContentTab({ groupId, postCount }: ContentTabProps) {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalItems, setTotalItems] = useState(postCount);
  const [totalPages, setTotalPages] = useState(Math.ceil(postCount / limit));
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<'hide' | 'lock' | 'delete'>('hide');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  const router = useRouter();

  // Fetch content
  const fetchContent = async () => {
    try {
      setLoading(true);
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(searchQuery && { search: searchQuery }),
      });
      
      const response = await fetch(`/api/forum/groups/${groupId}/moderation/content?${queryParams}`);
      
      if (!response.ok) throw new Error('Failed to fetch content');
      
      const data = await response.json();
      setContent(data.content);
      setTotalItems(data.pagination.totalItems);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching content:', error);
      toast.error('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  // Handle content action
  const handleContentAction = async (action: 'hide' | 'unhide' | 'lock' | 'unlock' | 'delete') => {
    if (!selectedContent) return;

    try {
      const response = await fetch(`/api/forum/groups/${groupId}/moderation/content/${selectedContent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) throw new Error(`Failed to ${action} content`);

      // Update UI
      setContent(prev => 
        prev.map(item => {
          if (item.id === selectedContent.id) {
            return {
              ...item,
              hidden: action === 'hide' ? true : action === 'unhide' ? false : item.hidden,
              locked: action === 'lock' ? true : action === 'unlock' ? false : item.locked,
            };
          }
          return item;
        })
      );

      toast.success(`Content ${action === 'delete' ? 'deleted' : action + 'd'} successfully`);
    } catch (error) {
      console.error(`Error ${action}ing content:`, error);
      toast.error(`Failed to ${action} content`);
    } finally {
      setDialogOpen(false);
    }
  };

  // Handle bulk actions
  const handleBulkAction = async (action: 'hide' | 'delete') => {
    try {
      const response = await fetch(`/api/forum/groups/${groupId}/moderation/content/bulk`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ids: selectedItems,
          action
        }),
      });

      if (!response.ok) throw new Error(`Failed to perform bulk ${action}`);

      // Update UI
      if (action === 'delete') {
        setContent(prev => prev.filter(item => !selectedItems.includes(item.id)));
      } else {
        setContent(prev => 
          prev.map(item => 
            selectedItems.includes(item.id) 
              ? { ...item, hidden: action === 'hide' } 
              : item
          )
        );
      }

      setSelectedItems([]);
      toast.success(`Bulk ${action} completed successfully`);
    } catch (error) {
      console.error(`Bulk ${action} error:`, error);
      toast.error(`Failed to perform bulk ${action}`);
    }
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchContent();
  };

  // Initial fetch
  useEffect(() => {
    fetchContent();
  }, [groupId, page, limit]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <Input
            type="search"
            placeholder="Search content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button type="submit" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </form>
        
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={selectedItems.length === 0}>
                Bulk Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem 
                onClick={() => handleBulkAction('hide')}
                className="text-destructive"
              >
                <EyeOff className="h-4 w-4 mr-2" />
                Hide Selected
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleBulkAction('delete')}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <input
                  type="checkbox"
                  checked={selectedItems.length === content.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedItems(content.map(item => item.id));
                    } else {
                      setSelectedItems([]);
                    }
                  }}
                />
              </TableHead>
              <TableHead>Content</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Posted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-64 mt-1" />
                  </TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-8 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : content.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                  No content found
                </TableCell>
              </TableRow>
            ) : (
              content.map((item) => (
                <TableRow key={item.id} className={item.hidden ? 'opacity-50 bg-muted/50' : ''}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems([...selectedItems, item.id]);
                        } else {
                          setSelectedItems(selectedItems.filter(id => id !== item.id));
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {item.type === 'post' ? (
                        <FileText className="h-4 w-4 text-blue-500" />
                      ) : (
                        <MessageSquare className="h-4 w-4 text-green-500" />
                      )}
                      <div className="line-clamp-2">
                        {item.title && <span className="font-medium">{item.title}</span>}
                        <span className="text-muted-foreground"> {item.content}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{item.author.name}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {item.hidden && <Badge variant="destructive">Hidden</Badge>}
                      {item.locked && <Badge variant="default">Locked</Badge>}
                      {item.pinned && <Badge variant="secondary">Pinned</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedContent(item);
                            setDialogAction(item.hidden ? 'hide' : 'hide');
                            setDialogOpen(true);
                          }}
                        >
                          <EyeOff className="h-4 w-4 mr-2" />
                          {item.hidden ? 'Unhide' : 'Hide'}
                        </DropdownMenuItem>
                        {item.type === 'post' && (
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedContent(item);
                              setDialogAction('lock');
                              setDialogOpen(true);
                            }}
                          >
                            <Lock className="h-4 w-4 mr-2" />
                            {item.locked ? 'Unlock' : 'Lock'}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setSelectedContent(item);
                            setDialogAction('delete');
                            setDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CardFooter className="flex justify-between border-t p-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Show
          </span>
          <Select
            value={limit.toString()}
            onValueChange={(value) => setLimit(Number(value))}
          >
            <SelectTrigger className="h-8 w-16">
              <SelectValue placeholder="10" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            per page
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
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages || 1}
          </span>
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

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialogAction === 'delete' ? 'Delete Content' : 
               dialogAction === 'hide' ? (selectedContent?.hidden ? 'Unhide Content' : 'Hide Content') : 
               selectedContent?.locked ? 'Unlock Post' : 'Lock Post'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialogAction === 'delete' ? (
                'Are you sure you want to permanently delete this content? This action cannot be undone.'
              ) : dialogAction === 'hide' ? (
                `Are you sure you want to ${selectedContent?.hidden ? 'unhide' : 'hide'} this content?`
              ) : (
                `Are you sure you want to ${selectedContent?.locked ? 'unlock' : 'lock'} this post?`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (dialogAction === 'delete') {
                  handleContentAction('delete');
                } else if (dialogAction === 'hide') {
                  handleContentAction(selectedContent?.hidden ? 'unhide' : 'hide');
                } else {
                  handleContentAction(selectedContent?.locked ? 'unlock' : 'lock');
                }
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
