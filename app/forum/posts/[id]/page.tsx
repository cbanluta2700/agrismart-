'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Edit, 
  Loader2, 
  MessageSquare, 
  MoreVertical, 
  Trash, 
  Users 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface Author {
  id: string;
  name: string;
  avatar: string | null;
}

interface Comment {
  id: string;
  content: string;
  authorId: string;
  author: Author;
  createdAt: string;
  updatedAt: string;
}

interface Group {
  id: string;
  name: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  author: Author;
  groupId: string | null;
  group: Group | null;
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
}

const commentSchema = z.object({
  content: z.string().min(2, 'Comment must be at least 2 characters'),
});

type CommentFormValues = z.infer<typeof commentSchema>;

export default function PostPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { data: session, status } = useSession();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);

  const commentForm = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      content: '',
    },
  });

  const editCommentForm = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      content: '',
    },
  });

  // Fetch post data
  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/forum/posts/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            toast.error('Post not found');
            router.push('/forum');
            return;
          }
          throw new Error('Failed to fetch post');
        }
        
        const data = await response.json();
        setPost(data);
      } catch (error) {
        console.error('Error fetching post:', error);
        toast.error('Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id, router]);

  const onSubmitComment = async (values: CommentFormValues) => {
    if (status !== 'authenticated') {
      toast.error('You must be logged in to comment');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/forum/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: values.content,
          postId: id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add comment');
      }

      const newComment = await response.json();
      
      // Update post with new comment
      if (post) {
        setPost({
          ...post,
          comments: [...post.comments, newComment],
        });
      }
      
      commentForm.reset();
      toast.success('Comment added successfully');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditingComment = (comment: Comment) => {
    editCommentForm.setValue('content', comment.content);
    setEditingCommentId(comment.id);
  };

  const cancelEditingComment = () => {
    setEditingCommentId(null);
    editCommentForm.reset();
  };

  const updateComment = async (commentId: string, values: CommentFormValues) => {
    try {
      const response = await fetch(`/api/forum/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: values.content,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update comment');
      }

      const updatedComment = await response.json();
      
      // Update post with edited comment
      if (post) {
        setPost({
          ...post,
          comments: post.comments.map(c => 
            c.id === commentId ? updatedComment : c
          ),
        });
      }
      
      setEditingCommentId(null);
      toast.success('Comment updated successfully');
    } catch (error) {
      console.error('Error updating comment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update comment');
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      const response = await fetch(`/api/forum/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete comment');
      }
      
      // Update post without deleted comment
      if (post) {
        setPost({
          ...post,
          comments: post.comments.filter(c => c.id !== commentId),
        });
      }
      
      toast.success('Comment deleted successfully');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete comment');
    }
  };

  const deletePost = async () => {
    try {
      const response = await fetch(`/api/forum/posts/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete post');
      }
      
      toast.success('Post deleted successfully');
      router.push('/forum');
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete post');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Post not found</h1>
        <Button asChild>
          <Link href="/forum">Return to Forum</Link>
        </Button>
      </div>
    );
  }

  const isAuthor = session?.user?.id === post.authorId;
  const isAdmin = session?.user?.roles?.includes('ADMIN');
  const canModify = isAuthor || isAdmin;

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link 
            href="/forum" 
            className="text-muted-foreground hover:text-primary transition-colors mb-4 inline-block"
          >
            ← Back to Forum
          </Link>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">{post.title}</h1>
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
            </div>
            
            {canModify && (
              <AlertDialog>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isAuthor && (
                      <DropdownMenuItem onClick={() => router.push(`/forum/posts/${id}/edit`)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Post
                      </DropdownMenuItem>
                    )}
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem className="text-destructive">
                        <Trash className="h-4 w-4 mr-2" />
                        Delete Post
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the post
                      and all associated comments.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={deletePost}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
        
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="prose dark:prose-invert max-w-none">
              {post.content}
            </div>
          </CardContent>
        </Card>
        
        <div className="mb-6">
          <h2 className="text-xl font-bold flex items-center mb-4">
            <MessageSquare className="h-5 w-5 mr-2" />
            Comments ({post.comments.length})
          </h2>
          
          {status === 'authenticated' ? (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <Form {...commentForm}>
                  <form onSubmit={commentForm.handleSubmit(onSubmitComment)} className="space-y-4">
                    <FormField
                      control={commentForm.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea 
                              placeholder="Add a comment..."
                              className="min-h-[100px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Posting...
                        </>
                      ) : (
                        'Post Comment'
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          ) : (
            <Card className="mb-6 bg-muted/50">
              <CardContent className="pt-6 text-center py-8">
                <p className="mb-4 text-muted-foreground">You need to be logged in to comment</p>
                <Button asChild>
                  <Link href={`/auth/login?callbackUrl=/forum/posts/${id}`}>
                    Log In to Comment
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
          
          {post.comments.length > 0 ? (
            <div className="space-y-4">
              {post.comments.map((comment) => (
                <div key={comment.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center">
                      <Avatar className="h-6 w-6 mr-2">
                        <AvatarImage src={comment.author.avatar || undefined} alt={comment.author.name} />
                        <AvatarFallback>{getInitials(comment.author.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="font-medium">{comment.author.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    
                    {(session?.user?.id === comment.authorId || isAdmin) && (
                      <AlertDialog>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {session?.user?.id === comment.authorId && (
                              <DropdownMenuItem onClick={() => startEditingComment(comment)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem className="text-destructive">
                                <Trash className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete your comment.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteComment(comment.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                  
                  {editingCommentId === comment.id ? (
                    <Form {...editCommentForm}>
                      <form 
                        onSubmit={editCommentForm.handleSubmit((values) => 
                          updateComment(comment.id, values)
                        )} 
                        className="space-y-4"
                      >
                        <FormField
                          control={editCommentForm.control}
                          name="content"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Textarea 
                                  className="min-h-[100px]"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex gap-2">
                          <Button type="submit" size="sm">Save</Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={cancelEditingComment}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </Form>
                  ) : (
                    <div className="prose dark:prose-invert max-w-none text-sm">
                      {comment.content}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 border rounded-lg">
              <p className="text-muted-foreground">No comments yet</p>
              <p className="text-sm mt-1">Be the first to share your thoughts!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
