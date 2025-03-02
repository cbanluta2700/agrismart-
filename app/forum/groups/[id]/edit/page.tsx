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
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Group {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
}

const formSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100, 'Name cannot exceed 100 characters'),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditGroupPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { data: session, status } = useSession();
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  // Redirect if not logged in
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/auth/login?callbackUrl=/forum/groups/${id}/edit`);
    }
  }, [status, router, id]);

  // Fetch group data
  useEffect(() => {
    const fetchGroup = async () => {
      if (status !== 'authenticated') return;
      
      setLoading(true);
      try {
        const response = await fetch(`/api/forum/groups/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            toast.error('Group not found');
            router.push('/forum/groups');
            return;
          }
          throw new Error('Failed to fetch group');
        }
        
        const data = await response.json();
        
        // Check if user has permission to edit
        const isOwner = data.ownerId === session?.user?.id;
        const isAdmin = session?.user?.roles?.includes('ADMIN');
        
        if (!isOwner && !isAdmin) {
          toast.error('You do not have permission to edit this group');
          router.push(`/forum/groups/${id}`);
          return;
        }
        
        setGroup(data);
        
        // Set form values
        form.setValue('name', data.name);
        form.setValue('description', data.description || '');
      } catch (error) {
        console.error('Error fetching group:', error);
        toast.error('Failed to load group');
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
  }, [id, router, session, status, form]);

  const onSubmit = async (values: FormValues) => {
    if (!group || status !== 'authenticated') return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/forum/groups/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update group');
      }

      toast.success('Group updated successfully');
      router.push(`/forum/groups/${id}`);
    } catch (error) {
      console.error('Error updating group:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update group');
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

  if (!group) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Group not found</h1>
        <Button asChild>
          <Link href="/forum/groups">Return to Groups</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Edit Group</CardTitle>
          <CardDescription>Update your group information</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      Choose a descriptive name that clearly conveys the purpose of your group
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        className="min-h-[150px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Provide details about the purpose, goals, and topics for discussion in your group
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating Group...
                  </>
                ) : (
                  'Update Group'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.push(`/forum/groups/${id}`)}>
            Cancel
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
