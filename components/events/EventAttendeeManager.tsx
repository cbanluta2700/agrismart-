import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import axios from 'axios';

interface Attendee {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'MAYBE';
  user: {
    id: string;
    name: string;
    image: string | null;
  };
}

interface Counts {
  ACCEPTED: number;
  DECLINED: number;
  MAYBE: number;
  PENDING: number;
}

interface EventAttendeeManagerProps {
  eventId: string;
  isOwner: boolean;
}

const EventAttendeeManager: React.FC<EventAttendeeManagerProps> = ({ eventId, isOwner }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [counts, setCounts] = useState<Counts>({
    ACCEPTED: 0,
    DECLINED: 0,
    MAYBE: 0,
    PENDING: 0,
  });

  useEffect(() => {
    const fetchAttendees = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`/api/events/${eventId}/attendance`);
        setAttendees(response.data.attendees);
        setCounts(response.data.counts);
      } catch (error) {
        console.error('Error fetching attendees:', error);
        toast({
          title: 'Error',
          description: 'Failed to load attendees',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAttendees();
  }, [eventId, toast]);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return { label: 'Attending', variant: 'success' };
      case 'DECLINED':
        return { label: 'Declined', variant: 'destructive' };
      case 'MAYBE':
        return { label: 'Maybe', variant: 'warning' };
      case 'PENDING':
        return { label: 'Pending', variant: 'outline' };
      default:
        return { label: status, variant: 'outline' };
    }
  };

  const getStatusBadge = (status: string) => {
    const { label, variant } = getStatusLabel(status);
    
    let className = '';
    switch (variant) {
      case 'success':
        className = 'bg-green-100 text-green-800 border-green-200';
        break;
      case 'destructive':
        className = 'bg-red-100 text-red-800 border-red-200';
        break;
      case 'warning':
        className = 'bg-amber-100 text-amber-800 border-amber-200';
        break;
      default:
        className = 'bg-gray-100 text-gray-800 border-gray-200';
    }
    
    return (
      <Badge variant="outline" className={className}>
        {label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-16" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2 py-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-16 ml-auto" />
          </div>
        ))}
      </div>
    );
  }

  const filterAttendeesByStatus = (status: 'ACCEPTED' | 'DECLINED' | 'MAYBE' | 'PENDING' | 'ALL') => {
    if (status === 'ALL') return attendees;
    return attendees.filter(attendee => attendee.status === status);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 mt-2">
        <div className="text-sm">
          <span className="text-muted-foreground">Attending:</span>{' '}
          <span className="font-medium">{counts.ACCEPTED}</span>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Maybe:</span>{' '}
          <span className="font-medium">{counts.MAYBE}</span>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Declined:</span>{' '}
          <span className="font-medium">{counts.DECLINED}</span>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Pending:</span>{' '}
          <span className="font-medium">{counts.PENDING}</span>
        </div>
      </div>

      <Tabs defaultValue="ALL" className="w-full">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="ALL">All</TabsTrigger>
          <TabsTrigger value="ACCEPTED">Attending</TabsTrigger>
          <TabsTrigger value="MAYBE">Maybe</TabsTrigger>
          <TabsTrigger value="DECLINED">Declined</TabsTrigger>
          <TabsTrigger value="PENDING">Pending</TabsTrigger>
        </TabsList>
        
        {['ALL', 'ACCEPTED', 'MAYBE', 'DECLINED', 'PENDING'].map((status) => (
          <TabsContent key={status} value={status} className="mt-4">
            <Card className="border rounded-md">
              <CardContent className="p-4">
                {filterAttendeesByStatus(status as any).length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No attendees {status !== 'ALL' ? `with status "${getStatusLabel(status).label}"` : ''}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {filterAttendeesByStatus(status as any).map((attendee) => (
                      <li key={attendee.id} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={attendee.user.image || ''} alt={attendee.user.name} />
                            <AvatarFallback>{attendee.user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{attendee.user.name}</span>
                        </div>
                        
                        {status === 'ALL' && getStatusBadge(attendee.status)}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default EventAttendeeManager;
