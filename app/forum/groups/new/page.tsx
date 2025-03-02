'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
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
import useAnalytics from '@/hooks/useAnalytics';

const formSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100, 'Name cannot exceed 100 characters'),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewGroupPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const analytics = useAnalytics();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  // Track page view
  useEffect(() => {
    analytics.trackPageView('GROUP_CREATE_PAGE');
  }, [analytics]);

  // Redirect if not logged in
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login?callbackUrl=/forum/groups/new');
    }
  }, [status, router]);

  const onSubmit = async (values: FormValues) => {
    if (status !== 'authenticated') {
      toast.error('You must be logged in to create a group');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/forum/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create group');
      }

      const group = await response.json();
      
      // Track group creation
      analytics.trackEvent({
        type: 'GROUP_CREATE',
        entityType: 'GROUP',
        entityId: group.id,
        userId: session?.user?.id,
        metadata: {
          groupName: values.name
        }
      });
      
      toast.success('Group created successfully');
      router.push(`/forum/groups/${group.id}`);
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create group');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Create New Group</CardTitle>
          <CardDescription>Start a new community group for discussing shared interests</CardDescription>
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
                      <Input placeholder="Enter a name for your group" {...field} />
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
                        placeholder="Describe what your group is about..."
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
                    Creating Group...
                  </>
                ) : (
                  'Create Group'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.push('/forum/groups')}>
            Cancel
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
