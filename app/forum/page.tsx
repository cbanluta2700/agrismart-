'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Loader2, MessageSquare, Plus, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Post {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatar: string | null;
  };
  _count: {
    comments: number;
  };
  group?: {
    id: string;
    name: string;
  } | null;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function ForumPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchPosts = async (page = 1) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/forum/posts?page=${page}&limit=10`);
      if (!response.ok) throw new Error('Failed to fetch posts');
      
      const data = await response.json();
      setPosts(data.posts);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handlePageChange = (page: number) => {
    fetchPosts(page);
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Forum</h1>
        {session?.user && (
          <Button onClick={() => router.push('/forum/new')}>
            <Plus className="mr-2 h-4 w-4" /> New Post
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : posts.length > 0 ? (
            posts.map(post => (
              <Card key={post.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <Link href={`/forum/posts/${post.id}`} className="hover:underline">
                    <CardTitle>{post.title}</CardTitle>
                  </Link>
                  <div className="flex items-center text-sm text-muted-foreground mt-2">
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarImage src={post.author.avatar || undefined} alt={post.author.name} />
                      <AvatarFallback>{getInitials(post.author.name)}</AvatarFallback>
                    </Avatar>
                    <span>{post.author.name}</span>
                    <span className="mx-2">•</span>
                    <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                    {post.group && (
                      <>
                        <span className="mx-2">•</span>
                        <Link href={`/forum/groups/${post.group.id}`} className="text-primary hover:underline flex items-center">
                          <Users className="h-3 w-3 mr-1" />
                          {post.group.name}
                        </Link>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-2 text-muted-foreground">
                    {post.content.replace(/<[^>]*>/g, '')}
                  </p>
                </CardContent>
                <CardFooter className="text-sm text-muted-foreground">
                  <Link href={`/forum/posts/${post.id}`} className="flex items-center hover:text-primary">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    {post._count.comments || 0} comments
                  </Link>
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="text-center py-12 border rounded-lg">
              <p className="text-muted-foreground">No posts found</p>
              {session?.user && (
                <Button onClick={() => router.push('/forum/new')} variant="outline" className="mt-4">
                  Create the first post
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

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Groups</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/forum/groups">
                    <Users className="mr-2 h-4 w-4" />
                    Browse All Groups
                  </Link>
                </Button>
                {session?.user && (
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/forum/groups/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Create New Group
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Forum Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 list-disc list-inside text-sm">
                <li>Be respectful to other community members</li>
                <li>Stay on topic and use appropriate categories</li>
                <li>Do not post spam or advertisements</li>
                <li>Share agricultural knowledge and experiences</li>
                <li>Follow the community guidelines at all times</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
