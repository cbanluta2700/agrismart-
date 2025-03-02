'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, ThumbsUp, Users, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import useAnalytics from '@/hooks/useAnalytics';

interface SearchResultsProps {
  results: any;
  type: 'all' | 'posts' | 'groups';
  query: string;
}

export default function SearchResults({ results, type, query }: SearchResultsProps) {
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const analytics = useAnalytics();

  useEffect(() => {
    analytics.trackEvent({
      type: 'SEARCH',
      entityType: 'SEARCH_QUERY',
      entityId: query,
      metadata: { 
        searchType: type,
        resultsCount: results?.postsCount + results?.groupsCount || 0
      }
    });
  }, [analytics, query, type, results]);

  const handlePageChange = async (newPage: number) => {
    if (newPage === page || newPage < 1 || (results?.pagination && newPage > results.pagination.totalPages)) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&type=${type}&page=${newPage}&limit=10`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch search results');
      }
      
      const data = await response.json();
      setPage(newPage);
      // In a real implementation, you would update the results state here

      analytics.trackEvent({
        type: 'PAGE_CHANGE',
        entityType: 'SEARCH_RESULTS',
        entityId: query,
        metadata: { 
          searchType: type,
          fromPage: page,
          toPage: newPage
        }
      });
    } catch (error) {
      console.error('Error fetching page:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!results) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No results to display</p>
      </div>
    );
  }

  const { posts = [], groups = [], postsCount = 0, groupsCount = 0, pagination } = results;
  const noResults = postsCount === 0 && groupsCount === 0;

  if (noResults) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-semibold">No results found for "{query}"</h3>
        <p className="text-muted-foreground mt-2">
          Try different keywords or check your spelling
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {type === 'all' && (
        <>
          {postsCount > 0 && (
            <section>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Posts ({postsCount})</h3>
                {postsCount > 5 && (
                  <Button variant="link" asChild>
                    <Link href={`/search?q=${encodeURIComponent(query)}&type=posts`}>
                      See all posts
                    </Link>
                  </Button>
                )}
              </div>
              <div className="space-y-4">
                {posts.map((post: any) => (
                  <PostResult key={post.id} post={post} />
                ))}
              </div>
            </section>
          )}

          {groupsCount > 0 && (
            <section>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Groups ({groupsCount})</h3>
                {groupsCount > 5 && (
                  <Button variant="link" asChild>
                    <Link href={`/search?q=${encodeURIComponent(query)}&type=groups`}>
                      See all groups
                    </Link>
                  </Button>
                )}
              </div>
              <div className="space-y-4">
                {groups.map((group: any) => (
                  <GroupResult key={group.id} group={group} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {type === 'posts' && (
        <section>
          <h3 className="text-lg font-semibold mb-4">Posts ({postsCount})</h3>
          {posts.length > 0 ? (
            <div className="space-y-4">
              {posts.map((post: any) => (
                <PostResult key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No posts match your search criteria</p>
          )}
        </section>
      )}

      {type === 'groups' && (
        <section>
          <h3 className="text-lg font-semibold mb-4">Groups ({groupsCount})</h3>
          {groups.length > 0 ? (
            <div className="space-y-4">
              {groups.map((group: any) => (
                <GroupResult key={group.id} group={group} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No groups match your search criteria</p>
          )}
        </section>
      )}

      {pagination && pagination.totalPages > 1 && (
        <Pagination className="mt-6">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1 || isLoading}
              />
            </PaginationItem>
            <PaginationItem>
              <span className="text-sm">
                Page {page} of {pagination.totalPages}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext 
                onClick={() => handlePageChange(page + 1)}
                disabled={page === pagination.totalPages || isLoading}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}

function PostResult({ post }: { post: any }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={post.author.avatar || ''} alt={post.author.name} />
            <AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Link 
              href={`/forum/groups/${post.group.id}/posts/${post.id}`}
              className="hover:underline"
            >
              <h4 className="font-semibold text-lg">{post.title}</h4>
            </Link>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <span>{post.author.name}</span>
              <span>•</span>
              <Link 
                href={`/forum/groups/${post.group.id}`}
                className="hover:underline"
              >
                {post.group.name}
              </Link>
              <span>•</span>
              <span>{format(new Date(post.createdAt), 'MMM d, yyyy')}</span>
            </div>
            <p className="mt-2 line-clamp-2 text-muted-foreground">
              {post.content}
            </p>
            <div className="flex gap-4 mt-4">
              <div className="flex items-center gap-1 text-sm">
                <ThumbsUp className="h-4 w-4" />
                <span>{post._count.likes}</span>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <MessageSquare className="h-4 w-4" />
                <span>{post._count.comments}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function GroupResult({ group }: { group: any }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {group.imageUrl ? (
            <div className="relative h-16 w-16 rounded-md overflow-hidden">
              <Image 
                src={group.imageUrl} 
                alt={group.name}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-16 w-16 bg-muted rounded-md">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1">
            <Link 
              href={`/forum/groups/${group.id}`}
              className="hover:underline"
            >
              <h4 className="font-semibold text-lg">{group.name}</h4>
            </Link>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <span>Created by {group.owner.name}</span>
              <span>•</span>
              <span>{format(new Date(group.createdAt), 'MMM d, yyyy')}</span>
            </div>
            <p className="mt-2 line-clamp-2 text-muted-foreground">
              {group.description}
            </p>
            <div className="flex gap-4 mt-4">
              <div className="flex items-center gap-1 text-sm">
                <Users className="h-4 w-4" />
                <span>{group._count.members} members</span>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <FileText className="h-4 w-4" />
                <span>{group._count.posts} posts</span>
              </div>
              {group.isPrivate && (
                <Badge variant="outline" className="ml-auto">Private</Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
