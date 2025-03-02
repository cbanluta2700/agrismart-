import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Users, User, Edit, Trash, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import Link from 'next/link';
import EventAttendeeManager from './EventAttendeeManager';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

interface Event {
  id: string;
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  url?: string;
  categories?: { id: string; name: string; color: string }[];
  groupId?: string;
  groupName?: string;
  creator?: {
    id: string;
    name: string;
    image?: string;
  };
  editable?: boolean;
  userStatus?: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'MAYBE' | null;
  reminders?: any[];
}

interface EventDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
  onEventUpdated: () => void;
  onEventDeleted: () => void;
}

const EventDetailsDialog: React.FC<EventDetailsDialogProps> = ({
  isOpen,
  onClose,
  event,
  onEventUpdated,
  onEventDeleted,
}) => {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState<string | null>(event.userStatus || null);
  const [fullEventDetails, setFullEventDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);

  useEffect(() => {
    const fetchEventDetails = async () => {
      setLoadingDetails(true);
      try {
        const response = await axios.get(`/api/events/${event.id}`);
        setFullEventDetails(response.data);
        setAttendanceStatus(response.data.userStatus);
      } catch (error) {
        console.error('Error fetching event details:', error);
        toast({
          title: 'Error',
          description: 'Failed to load event details',
          variant: 'destructive',
        });
      } finally {
        setLoadingDetails(false);
      }
    };

    if (isOpen && event.id) {
      fetchEventDetails();
    }
  }, [isOpen, event.id, toast]);

  const updateAttendanceStatus = async (status: string) => {
    if (!session?.user) return;
    
    setLoading(true);
    try {
      await axios.put(`/api/events/${event.id}/attendance`, { status });
      
      setAttendanceStatus(status);
      onEventUpdated();
      
      toast({
        title: 'Success',
        description: `You are now ${status.toLowerCase()} for this event`,
      });
    } catch (error) {
      console.error('Error updating attendance status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update your attendance status',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!session?.user || !event.editable) return;
    
    setDeleting(true);
    try {
      await axios.delete(`/api/events/${event.id}`);
      
      toast({
        title: 'Success',
        description: 'Event deleted successfully',
      });
      
      onEventDeleted();
      onClose();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete the event',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (start: Date, end: Date, allDay: boolean | undefined) => {
    if (allDay) {
      // Same day
      if (format(new Date(start), 'yyyy-MM-dd') === format(new Date(end), 'yyyy-MM-dd')) {
        return format(new Date(start), 'MMMM d, yyyy');
      }
      // Different days
      return `${format(new Date(start), 'MMMM d, yyyy')} - ${format(new Date(end), 'MMMM d, yyyy')}`;
    }
    
    // Same day
    if (format(new Date(start), 'yyyy-MM-dd') === format(new Date(end), 'yyyy-MM-dd')) {
      return `${format(new Date(start), 'MMMM d, yyyy, h:mm a')} - ${format(new Date(end), 'h:mm a')}`;
    }
    
    // Different days
    return `${format(new Date(start), 'MMMM d, yyyy, h:mm a')} - ${format(new Date(end), 'MMMM d, yyyy, h:mm a')}`;
  };

  // Render loading skeleton if still loading details
  if (loadingDetails) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle><Skeleton className="h-8 w-3/4" /></DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-6 w-1/2" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const eventData = fullEventDetails || event;
  const { title, description, location, start, end, allDay, url, groupId, groupName, categories } = eventData;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{title}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="details">Event Details</TabsTrigger>
            <TabsTrigger value="attendees">Attendees</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Calendar className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p>{formatDate(new Date(start), new Date(end), allDay)}</p>
                  {allDay && <span className="text-sm text-muted-foreground">All day</span>}
                </div>
              </div>
              
              {location && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <p>{location}</p>
                </div>
              )}
              
              {groupId && (
                <div className="flex items-start gap-2">
                  <Users className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p>Group: <Link href={`/forum/groups/${groupId}`} className="text-primary hover:underline">{groupName}</Link></p>
                  </div>
                </div>
              )}
              
              {eventData.creator && (
                <div className="flex items-start gap-2">
                  <User className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={eventData.creator.image || ''} alt={eventData.creator.name} />
                      <AvatarFallback>{eventData.creator.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span>Created by {eventData.creator.name}</span>
                  </div>
                </div>
              )}
            </div>
            
            {description && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-medium mb-2">Description</h3>
                  <p className="text-sm whitespace-pre-line">{description}</p>
                </div>
              </>
            )}
            
            {categories && categories.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-medium mb-2">Categories</h3>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <Badge 
                        key={category.id} 
                        style={{ 
                          backgroundColor: category.color,
                          color: '#fff' 
                        }}
                      >
                        {category.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
            
            {url && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-medium mb-2">Event Link</h3>
                  <a 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    {url} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </>
            )}
            
            {!eventData.editable && session?.user && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-medium mb-2">Your Response</h3>
                  <div className="flex gap-2 mt-2">
                    <Button 
                      variant={attendanceStatus === 'ACCEPTED' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => updateAttendanceStatus('ACCEPTED')}
                      disabled={loading}
                    >
                      Attending
                    </Button>
                    <Button 
                      variant={attendanceStatus === 'MAYBE' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => updateAttendanceStatus('MAYBE')}
                      disabled={loading}
                    >
                      Maybe
                    </Button>
                    <Button 
                      variant={attendanceStatus === 'DECLINED' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => updateAttendanceStatus('DECLINED')}
                      disabled={loading}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
          
          <TabsContent value="attendees" className="mt-4">
            <EventAttendeeManager eventId={event.id} isOwner={eventData.editable || false} />
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0">
          {eventData.editable && (
            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  // Redirect to edit page
                  window.location.href = `/events/${event.id}/edit`;
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Event</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this event? This action cannot be undone, and all attendees will be notified.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteEvent} 
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={deleting}
                    >
                      {deleting ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EventDetailsDialog;
