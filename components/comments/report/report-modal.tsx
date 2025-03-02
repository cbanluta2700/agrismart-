'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import { toast } from 'react-hot-toast';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Icons } from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Report form schema
const reportFormSchema = z.object({
  categoryId: z.string({
    required_error: 'Please select a report category',
  }),
  description: z
    .string()
    .max(500, {
      message: 'Description must be 500 characters or less',
    })
    .optional(),
});

type ReportFormValues = z.infer<typeof reportFormSchema>;

interface ReportCategory {
  id: string;
  name: string;
  description: string;
  severity: number;
}

interface ReportModalProps {
  commentId: string;
  commentContent: string;
  authorName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ReportModal({
  commentId,
  commentContent,
  authorName,
  isOpen,
  onClose,
  onSuccess
}: ReportModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<ReportCategory[]>([]);

  // Initialize form
  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      description: '',
    },
  });

  // Fetch report categories
  useEffect(() => {
    if (isOpen) {
      const fetchCategories = async () => {
        try {
          const response = await axios.get('/api/comments/report');
          if (response.data.status === 'success') {
            setCategories(response.data.data);
          }
        } catch (error) {
          console.error('Failed to fetch report categories:', error);
          toast.error('Failed to load report categories');
        }
      };

      fetchCategories();
    }
  }, [isOpen]);

  // Handle form submission
  const onSubmit = async (data: ReportFormValues) => {
    setIsLoading(true);

    try {
      const response = await axios.post('/api/comments/report', {
        commentId,
        ...data,
      });

      if (response.data.status === 'success') {
        toast.success('Report submitted successfully');
        form.reset();
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (error: any) {
      console.error('Error submitting report:', error);
      const errorMessage = error.response?.data?.message || 'Failed to submit report';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Get severity badge color
  const getSeverityColor = (severity: number) => {
    switch (severity) {
      case 5:
        return 'bg-red-500';
      case 4:
        return 'bg-orange-500';
      case 3:
        return 'bg-yellow-500';
      case 2:
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Report Comment</DialogTitle>
          <DialogDescription>
            Report inappropriate or rule-violating content for moderation.
          </DialogDescription>
        </DialogHeader>

        {/* Comment preview */}
        <div className="bg-muted p-3 rounded-md my-2 text-sm">
          <div className="font-semibold text-xs text-muted-foreground mb-1">
            Comment by {authorName}:
          </div>
          <div className="line-clamp-3">{commentContent}</div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for reporting</FormLabel>
                  <div className="space-y-3">
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      {categories.map((category) => (
                        <div key={category.id} className="flex items-center space-x-2 rounded-md border p-2">
                          <RadioGroupItem value={category.id} id={category.id} />
                          <div className="flex-1">
                            <label
                              htmlFor={category.id}
                              className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2"
                            >
                              {category.name}
                              <Badge className={cn("ml-1", getSeverityColor(category.severity))}>
                                Severity {category.severity}
                              </Badge>
                            </label>
                            <p className="text-sm text-muted-foreground mt-1">
                              {category.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional details (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide any additional context about why this comment is being reported..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Max 500 characters. This information helps our moderators review the report.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Report'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
