import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { format } from 'date-fns';

// Define the form schema
const eventSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title must be less than 100 characters'),
  description: z.string().optional(),
  location: z.string().optional(),
  startDate: z.date(),
  endDate: z.date(),
  isAllDay: z.boolean().default(false),
  isPublic: z.boolean().default(false),
  groupId: z.string().optional(),
  categories: z.array(z.string()).optional(),
  attendees: z.array(z.string()).optional(),
  backgroundColor: z.string().optional(),
}).refine(data => data.endDate >= data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

type EventFormValues = z.infer<typeof eventSchema>;

interface CreateEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: () => void;
  defaultGroupId?: string;
}

const CreateEventDialog: React.FC<CreateEventDialogProps> = ({
  isOpen,
  onClose,
  onEventCreated,
  defaultGroupId,
}) => {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string; color: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string; image?: string }[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
      startDate: new Date(),
      endDate: new Date(new Date().setHours(new Date().getHours() + 1)),
      isAllDay: false,
      isPublic: false,
      groupId: defaultGroupId || undefined,
      categories: [],
      attendees: [],
    },
  });

  const isAllDay = watch('isAllDay');
  const selectedGroupId = watch('groupId');

  // Fetch categories, users and groups data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch event categories
        const categoriesResponse = await axios.get('/api/events/categories');
        setCategories(categoriesResponse.data);

        // Fetch users for attendee selection
        const usersResponse = await axios.get('/api/users');
        setUsers(usersResponse.data);

        // Fetch groups the user is a member of
        const groupsResponse = await axios.get('/api/user/groups');
        setGroups(groupsResponse.data);

        if (defaultGroupId) {
          setValue('groupId', defaultGroupId);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load necessary data. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchData();
    }
  }, [session, defaultGroupId, setValue, toast]);

  const onSubmit = async (data: EventFormValues) => {
    if (!session?.user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create events',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Format dates to ISO strings for API
      const eventData = {
        ...data,
        startDate: data.startDate.toISOString(),
        endDate: data.endDate.toISOString(),
      };

      // Create the event
      await axios.post('/api/events', eventData);

      toast({
        title: 'Success',
        description: 'Event created successfully',
      });

      reset();
      onEventCreated();
      onClose();
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: 'Error',
        description: 'Failed to create event. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid gap-4">
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="title" className="text-right">
                Event Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Enter event title"
                {...register('title')}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Enter event description"
                {...register('description')}
                className="min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="location" className="text-right">
                Location
              </Label>
              <Input
                id="location"
                placeholder="Enter event location"
                {...register('location')}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid grid-cols-1 gap-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="startDate">Start Date</Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="isAllDay"
                      checked={isAllDay}
                      onCheckedChange={(checked) => {
                        setValue('isAllDay', checked === true);
                      }}
                    />
                    <Label htmlFor="isAllDay" className="text-sm cursor-pointer">
                      All Day
                    </Label>
                  </div>
                </div>
                <Controller
                  control={control}
                  name="startDate"
                  render={({ field }) => (
                    <DatePicker
                      selected={field.value}
                      onChange={(date) => field.onChange(date)}
                      showTimeSelect={!isAllDay}
                      dateFormat={isAllDay ? "MMMM d, yyyy" : "MMMM d, yyyy h:mm aa"}
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                      wrapperClassName="w-full"
                    />
                  )}
                />
                {errors.startDate && (
                  <p className="text-sm text-red-500">{errors.startDate.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="endDate">End Date</Label>
                <Controller
                  control={control}
                  name="endDate"
                  render={({ field }) => (
                    <DatePicker
                      selected={field.value}
                      onChange={(date) => field.onChange(date)}
                      showTimeSelect={!isAllDay}
                      dateFormat={isAllDay ? "MMMM d, yyyy" : "MMMM d, yyyy h:mm aa"}
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                      wrapperClassName="w-full"
                    />
                  )}
                />
                {errors.endDate && (
                  <p className="text-sm text-red-500">{errors.endDate.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="group">Group (Optional)</Label>
              <Controller
                control={control}
                name="groupId"
                render={({ field }) => (
                  <Select
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    disabled={loading || groups.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Personal Event</SelectItem>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="categories">Categories</Label>
              <Controller
                control={control}
                name="categories"
                render={({ field }) => (
                  <MultiSelect
                    options={categories.map(cat => ({ 
                      label: cat.name, 
                      value: cat.id,
                      backgroundColor: cat.color,
                    }))}
                    selected={field.value || []}
                    onChange={field.onChange}
                    placeholder="Select categories"
                    className="w-full"
                    disabled={loading || categories.length === 0}
                  />
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="attendees">Invite Attendees</Label>
              <Controller
                control={control}
                name="attendees"
                render={({ field }) => (
                  <MultiSelect
                    options={users
                      .filter(user => user.id !== session?.user.id) // Filter out current user
                      .map(user => ({ label: user.name || user.id, value: user.id }))}
                    selected={field.value || []}
                    onChange={field.onChange}
                    placeholder="Select attendees"
                    className="w-full"
                    disabled={loading || users.length === 0}
                  />
                )}
              />
            </div>

            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isPublic"
                  {...register('isPublic')}
                />
                <Label htmlFor="isPublic" className="cursor-pointer">
                  Make event public
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button variant="outline" type="button" onClick={handleCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || loading}>
              {isSubmitting ? 'Creating...' : 'Create Event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateEventDialog;
