'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Plus, Search, Users, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import useAnalytics from '@/hooks/useAnalytics';

interface Group {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  owner: {
    id: string;
    name: string;
  };
  createdAt: string;
  _count: {
    members: number;
    posts: number;
  };
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function GroupsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const analytics = useAnalytics();
  const [groups, setGroups] = useState<Group[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Track page view on component mount
  useEffect(() => {
    analytics.trackPageView('GROUPS_LIST');
  }, [analytics]);

  // Debounce search query
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Fetch groups when search query changes
  useEffect(() => {
    fetchGroups(1, debouncedSearchQuery);
  }, [debouncedSearchQuery]);

  const fetchGroups = async (page = 1, search = '') => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });
      
      if (search) {
        queryParams.append('search', search);
      }
      
      const response = await fetch(`/api/forum/groups?${queryParams.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch groups');
      
      const data = await response.json();
      setGroups(data.groups);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    fetchGroups(page, debouncedSearchQuery);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // The actual search will be triggered by the useEffect with debouncedSearchQuery
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold">Groups</h1>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <form onSubmit={handleSearch} className="flex-1 sm:w-64">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search groups..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>
          
          {session?.user && (
            <Button onClick={() => router.push('/forum/groups/new')}>
              <Plus className="mr-2 h-4 w-4" /> New Group
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : groups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map(group => (
            <Card key={group.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <Link href={`/forum/groups/${group.id}`} className="hover:underline">
                  <CardTitle>{group.name}</CardTitle>
                </Link>
                <div className="text-sm text-muted-foreground mt-1">
                  Created {formatDistanceToNow(new Date(group.createdAt), { addSuffix: true })} by {group.owner.name}
                </div>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-3 text-muted-foreground">
                  {group.description || 'No description provided.'}
                </p>
              </CardContent>
              <CardFooter className="flex justify-between text-sm text-muted-foreground">
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  {group._count.members} members
                </div>
                <div className="flex items-center">
                  <MessageSquare className="h-4 w-4 mr-1" />
                  {group._count.posts} posts
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground">
            {debouncedSearchQuery
              ? `No groups found matching "${debouncedSearchQuery}"`
              : 'No groups available'}
          </p>
          {session?.user && (
            <Button onClick={() => router.push('/forum/groups/new')} variant="outline" className="mt-4">
              Create the first group
            </Button>
          )}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <Pagination className="mt-6">
          <PaginationContent>
            {pagination.page > 1 && (
              <PaginationItem>
                <PaginationPrevious 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    handlePageChange(pagination.page - 1);
                  }} 
                />
              </PaginationItem>
            )}
            
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter(page => 
                page === 1 || 
                page === pagination.totalPages || 
                Math.abs(page - pagination.page) <= 1
              )
              .map((page, i, arr) => {
                // Add ellipsis between non-consecutive pages
                if (i > 0 && page - arr[i - 1] > 1) {
                  return (
                    <PaginationItem key={`ellipsis-${page}`}>
                      <span className="px-2">...</span>
                    </PaginationItem>
                  );
                }
                
                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handlePageChange(page);
                      }}
                      isActive={page === pagination.page}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
            
            {pagination.page < pagination.totalPages && (
              <PaginationItem>
                <PaginationNext 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    handlePageChange(pagination.page + 1);
                  }} 
                />
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
