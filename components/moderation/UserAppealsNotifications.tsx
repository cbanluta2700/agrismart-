'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { AppealStatusNotification, AppealNotification } from './AppealStatusNotification';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Bell } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface UserAppealsNotificationsProps {
  userId: string;
}

export function UserAppealsNotifications({ userId }: UserAppealsNotificationsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<AppealNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/user/appeals/notifications');
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      const data = await response.json();
      setNotifications(data.notifications);
      setUnreadCount(data.notifications.filter((n: AppealNotification) => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError('Failed to load notifications. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, []);
  
  // Mark notification as read
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/user/appeals/notifications/${notificationId}/read`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }
      
      // Update local state
      setNotifications(notifications.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      ));
      
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      toast({
        title: 'Notification marked as read',
        description: 'The notification has been marked as read.',
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark notification as read. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  };
  
  // View appeal details
  const handleViewAppeal = (appealId: string) => {
    router.push(`/dashboard/appeals/${appealId}`);
  };
  
  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !notification.read;
    return notification.status.toLowerCase() === activeTab;
  });
  
  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  // Empty state
  if (notifications.length === 0) {
    return (
      <div className="text-center py-12">
        <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No Notifications</h3>
        <p className="text-muted-foreground mb-4">
          You don't have any appeal notifications yet.
        </p>
        <Button variant="outline" onClick={fetchNotifications}>Refresh</Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Appeal Notifications</h2>
        <Button variant="outline" size="sm" onClick={fetchNotifications}>
          Refresh
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            All
            <Badge variant="secondary" className="ml-2">{notifications.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">{unreadCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
        </TabsList>
      </Tabs>
      
      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No notifications match your filter.</p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <AppealStatusNotification
              key={notification.id}
              notification={notification}
              onMarkAsRead={handleMarkAsRead}
              onViewAppeal={handleViewAppeal}
            />
          ))
        )}
      </div>
    </div>
  );
}
