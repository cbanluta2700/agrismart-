'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Group {
  id: string;
  name: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  groupId: string | null;
}

const formSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(255, 'Title cannot exceed 255 characters'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  groupId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditPostPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { data: session, status } = useSession();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      content: '',
      groupId: undefined,
    },
  });

  // Redirect if not logged in
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login?callbackUrl=/forum/posts/${id}/edit');
    }
  }, [status, router, id]);

  // Fetch post data
  useEffect(() => {
    const fetchPost = async () => {
      if (status !== 'authenticated') return;
      
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
        
        // Check if user is the author
        if (data.authorId !== session?.user?.id && !session?.user?.roles?.includes('ADMIN')) {
          toast.error('You do not have permission to edit this post');
          router.push(`/forum/posts/${id}`);
          return;
        }
        
        setPost(data);
        
        // Set form values
        form.setValue('title', data.title);
        form.setValue('content', data.content);
        if (data.groupId) {
          form.setValue('groupId', data.groupId);
        }
      } catch (error) {
        console.error('Error fetching post:', error);
        toast.error('Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id, router, session, status, form]);

  // Fetch groups
  useEffect(() => {
    const fetchGroups = async () => {
      if (status !== 'authenticated') return;
      
      try {
        const response = await fetch('/api/forum/groups');
        if (!response.ok) throw new Error('Failed to fetch groups');
        
        const data = await response.json();
        setGroups(data.groups);
      } catch (error) {
        console.error('Error fetching groups:', error);
        toast.error('Failed to load groups');
      } finally {
        setLoadingGroups(false);
      }
    };

    fetchGroups();
  }, [status]);

  const onSubmit = async (values: FormValues) => {
    if (!post || status !== 'authenticated') return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/forum/posts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update post');
      }

      toast.success('Post updated successfully');
      router.push(`/forum/posts/${id}`);
    } catch (error) {
      console.error('Error updating post:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update post');
    } finally {
      setIsSubmitting(false);
    }
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

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Edit Post</CardTitle>
          <CardDescription>Update your post information</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      A clear title helps others find your post
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea 
                        className="min-h-[200px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="groupId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group (Optional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a group (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Public Post (No Group)</SelectItem>
                        {loadingGroups ? (
                          <SelectItem value="" disabled>
                            Loading groups...
                          </SelectItem>
                        ) : groups.length > 0 ? (
                          groups.map((group) => (
                            <SelectItem key={group.id} value={group.id}>
                              {group.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="" disabled>
                            No groups available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Posting to a group will make it visible only to group members
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating Post...
                  </>
                ) : (
                  'Update Post'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.push(`/forum/posts/${id}`)}>
            Cancel
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
