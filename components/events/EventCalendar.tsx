import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CreateEventDialog from './CreateEventDialog';
import EventDetailsDialog from './EventDetailsDialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { trackEventAnalytics, fetchOptimizedEvents } from '@/lib/vercel/event-analytics';
import { useSpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from '@vercel/analytics/react';

// Setup localizer for calendar
const localizer = momentLocalizer(moment);

interface Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: any;
  backgroundColor?: string;
  borderColor?: string;
  description?: string;
  location?: string;
  groupId?: string;
  groupName?: string;
  creator?: {
    id: string;
    name: string;
    image?: string;
  };
  editable?: boolean;
}

interface CalendarToolbarProps {
  date: Date;
  onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void;
  onView: (view: string) => void;
  view: string;
  views: string[];
  openCreateModal: () => void;
  setViewFilter: (filter: string) => void;
  viewFilter: string;
  setShowPublicEvents: (show: boolean) => void;
  showPublicEvents: boolean;
}

const CalendarToolbar: React.FC<CalendarToolbarProps> = ({ 
  date, 
  onNavigate, 
  onView, 
  view, 
  views,
  openCreateModal,
  setViewFilter,
  viewFilter,
  setShowPublicEvents,
  showPublicEvents
}) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
      <div className="flex items-center">
        <h2 className="text-xl font-semibold">
          {moment(date).format(view === 'month' ? 'MMMM YYYY' : 'MMMM D, YYYY')}
        </h2>
      </div>
      
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('TODAY')}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('PREV')}
          >
            Back
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('NEXT')}
          >
            Next
          </Button>
        </div>
        
        <div className="flex items-center gap-1">
          {views.map((v) => (
            <Button
              key={v}
              variant={view === v ? "default" : "outline"}
              size="sm"
              onClick={() => onView(v)}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </Button>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 ml-1">
            <Select value={viewFilter} onValueChange={setViewFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="personal">My Events</SelectItem>
                <SelectItem value="group">Group Events</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Checkbox 
              id="public-events" 
              checked={showPublicEvents} 
              onCheckedChange={(checked) => setShowPublicEvents(checked as boolean)}
            />
            <Label htmlFor="public-events">Public Events</Label>
          </div>
          
          <Button onClick={openCreateModal} className="gap-1">
            <Plus className="h-4 w-4" /> 
            <span className="hidden sm:inline">Add Event</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

interface EventCalendarProps {
  groupId?: string;
}

const EventCalendar: React.FC<EventCalendarProps> = ({ groupId }) => {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [viewFilter, setViewFilter] = useState('all'); // 'all', 'personal', 'group'
  const [showPublicEvents, setShowPublicEvents] = useState(true);
  
  // Initialize Vercel Speed Insights
  useSpeedInsights();
  
  // Define the calendar views
  const calendarViews = useMemo(() => ['month', 'week', 'day', 'agenda'], []);
  
  const fetchEvents = async () => {
    if (!session?.user) return;
    
    setLoading(true);
    try {
      // Calculate date range based on current view
      let start: Date, end: Date;
      
      if (view === 'month') {
        start = moment(date).startOf('month').toDate();
        end = moment(date).endOf('month').toDate();
      } else if (view === 'week') {
        start = moment(date).startOf('week').toDate();
        end = moment(date).endOf('week').toDate();
      } else if (view === 'day') {
        start = moment(date).startOf('day').toDate();
        end = moment(date).endOf('day').toDate();
      } else { // agenda
        start = moment(date).subtract(30, 'days').toDate();
        end = moment(date).add(60, 'days').toDate();
      }
      
      // Use optimized events fetching from Vercel SDK
      const data = await fetchOptimizedEvents({
        start,
        end,
        groupId,
        includePublic: showPublicEvents
      });
      
      // Process events and convert string dates to Date objects
      const formattedEvents = data.map((event: any) => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
        editable: event.creator?.id === session.user.id,
      }));
      
      setEvents(formattedEvents);
      
      // Track calendar view analytics
      trackEventAnalytics('calendar_view', {
        userId: session.user.id,
        viewType: view as 'month' | 'week' | 'day' | 'agenda',
        groupId,
        startDate: start.toISOString(),
        endDate: end.toISOString()
      });
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: 'Error',
        description: 'Failed to load events. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchEvents();
    }
  }, [session, date, view, groupId, viewFilter, showPublicEvents]);
  
  // Filter events based on viewFilter
  const filteredEvents = useMemo(() => {
    if (viewFilter === 'all') return events;
    if (viewFilter === 'personal') {
      return events.filter(event => 
        event.creator?.id === session?.user.id || !event.groupId
      );
    }
    if (viewFilter === 'group') {
      return events.filter(event => !!event.groupId);
    }
    return events;
  }, [events, viewFilter, session]);

  const handleNavigate = (newDate: Date) => {
    setDate(newDate);
  };

  const handleSelectEvent = (event: Event) => {
    setSelectedEvent(event);
    
    // Track event view analytics
    trackEventAnalytics('event_view', {
      eventId: event.id,
      eventTitle: event.title,
      userId: session?.user?.id,
      groupId: event.groupId
    });
  };

  const handleEventCreated = () => {
    fetchEvents();
  };

  const handleEventUpdated = () => {
    fetchEvents();
  };

  const handleEventDeleted = () => {
    setSelectedEvent(null);
    fetchEvents();
  };

  const eventPropGetter = (event: Event) => {
    return {
      style: {
        backgroundColor: event.backgroundColor || '#3b82f6',
        borderColor: event.borderColor || '#3b82f6',
        color: '#ffffff',
      },
    };
  };

  if (!session) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center">Please sign in to view and manage events.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="p-4 sm:p-6">
        <CalendarToolbar
          date={date}
          onNavigate={(action) => {
            if (action === 'TODAY') {
              setDate(new Date());
            } else if (action === 'PREV') {
              setDate(
                view === 'month'
                  ? moment(date).subtract(1, 'month').toDate()
                  : view === 'week'
                  ? moment(date).subtract(1, 'week').toDate()
                  : view === 'day'
                  ? moment(date).subtract(1, 'day').toDate()
                  : moment(date).subtract(30, 'days').toDate()
              );
            } else if (action === 'NEXT') {
              setDate(
                view === 'month'
                  ? moment(date).add(1, 'month').toDate()
                  : view === 'week'
                  ? moment(date).add(1, 'week').toDate()
                  : view === 'day'
                  ? moment(date).add(1, 'day').toDate()
                  : moment(date).add(30, 'days').toDate()
              );
            }
          }}
          onView={setView}
          view={view}
          views={calendarViews}
          openCreateModal={() => setShowCreateModal(true)}
          setViewFilter={setViewFilter}
          viewFilter={viewFilter}
          setShowPublicEvents={setShowPublicEvents}
          showPublicEvents={showPublicEvents}
        />

        {loading ? (
          <div className="w-full h-[600px] flex items-center justify-center">
            <Skeleton className="w-full h-full" />
          </div>
        ) : (
          <div className="calendar-container">
            <Calendar
              localizer={localizer}
              events={filteredEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 600 }}
              view={view as any}
              onView={(newView) => {
                setView(newView);
                
                // Track view change analytics
                trackEventAnalytics('calendar_view', {
                  userId: session?.user?.id,
                  viewType: newView as 'month' | 'week' | 'day' | 'agenda',
                  groupId
                });
              }}
              date={date}
              onNavigate={(newDate) => {
                setDate(newDate);
              }}
              eventPropGetter={(event) => {
                let backgroundColor = event.backgroundColor || '#3B82F6';
                
                if (event.groupId && !event.backgroundColor) {
                  backgroundColor = '#8B5CF6'; // Purple for group events
                }
                
                return {
                  style: {
                    backgroundColor,
                    borderColor: event.borderColor || backgroundColor,
                    color: '#fff',
                  },
                };
              }}
              onSelectEvent={handleSelectEvent}
              components={{
                event: ({ event }) => (
                  <div title={event.title} className="truncate px-1">
                    {event.title}
                  </div>
                ),
              }}
            />
          </div>
        )}

        <CreateEventDialog
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onEventCreated={handleEventCreated}
          defaultGroupId={groupId}
        />

        {selectedEvent && (
          <EventDetailsDialog
            isOpen={!!selectedEvent}
            onClose={() => setSelectedEvent(null)}
            event={selectedEvent}
            onEventUpdated={handleEventUpdated}
            onEventDeleted={handleEventDeleted}
          />
        )}
        
        {/* Add Vercel Analytics component */}
        <Analytics />
      </CardContent>
    </Card>
  );
};

export default EventCalendar;
