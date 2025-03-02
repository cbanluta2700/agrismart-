'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NotificationItem from '@/components/notifications/NotificationItem';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface Notification {
  id: string;
  title: string;
  content: string;
  type: string;
  read: boolean;
  linkUrl?: string;
  createdAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function NotificationsView() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  
  const router = useRouter();

  // Fetch notifications
  const fetchNotifications = async (page = 1, unreadOnly = false) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(
        `/api/notifications?page=${page}&limit=${pagination.limit}&unreadOnly=${unreadOnly}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      const data = await response.json();
      setNotifications(data.notifications);
      setPagination(data.pagination);
      
      // Count unread notifications
      if (!unreadOnly) {
        const unreadNotifications = data.notifications.filter(
          (notification: Notification) => !notification.read
        );
        setUnreadCount(unreadNotifications.length);
      } else {
        setUnreadCount(data.pagination.totalItems);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError('Failed to load notifications. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark notifications as read');
      }
      
      // Update UI
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
      setUnreadCount(0);
      
      // Refresh the list if we're on the unread tab
      if (activeTab === 'unread') {
        fetchNotifications(1, true);
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      setError('Failed to mark notifications as read. Please try again later.');
    }
  };

  // Mark a single notification as read
  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to mark notification ${id} as read`);
      }
      
      // Update UI
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id 
            ? { ...notification, read: true } 
            : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Refresh the list if we're on the unread tab
      if (activeTab === 'unread') {
        fetchNotifications(pagination.page, true);
      }
    } catch (error) {
      console.error(`Error marking notification ${id} as read:`, error);
      setError('Failed to mark notification as read. Please try again later.');
    }
  };

  // Delete a notification
  const deleteNotification = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete notification ${id}`);
      }
      
      // Update UI
      setNotifications(prev => 
        prev.filter(notification => notification.id !== id)
      );
      
      // Update unread count if needed
      const deletedNotification = notifications.find(n => n.id === id);
      if (deletedNotification && !deletedNotification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      // Refresh if we deleted the last item on the page
      if (notifications.length === 1) {
        const newPage = pagination.page > 1 ? pagination.page - 1 : 1;
        fetchNotifications(newPage, activeTab === 'unread');
      }
    } catch (error) {
      console.error(`Error deleting notification ${id}:`, error);
      setError('Failed to delete notification. Please try again later.');
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    
    if (notification.linkUrl) {
      router.push(notification.linkUrl);
    }
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    fetchNotifications(1, value === 'unread');
  };

  // Handle page change
  const changePage = (newPage: number) => {
    fetchNotifications(newPage, activeTab === 'unread');
  };

  // Handle limit change
  const handleLimitChange = (value: string) => {
    const newLimit = parseInt(value, 10);
    setPagination(prev => ({ ...prev, limit: newLimit }));
    fetchNotifications(1, activeTab === 'unread');
  };

  // Initial fetch
  useEffect(() => {
    fetchNotifications(1, false);
  }, []);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="all" onValueChange={handleTabChange}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="all">
              All
            </TabsTrigger>
            <TabsTrigger value="unread">
              Unread
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          {unreadCount > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={markAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </div>
        
        <TabsContent value="all" className="mt-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>All Notifications</CardTitle>
              <CardDescription>
                View all your notifications in one place
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderNotificationsList()}
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-4">
              {renderPagination()}
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="unread" className="mt-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Unread Notifications</CardTitle>
              <CardDescription>
                View your unread notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderNotificationsList()}
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-4">
              {renderPagination()}
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  // Helper function to render notifications list
  function renderNotificationsList() {
    if (isLoading) {
      return Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="py-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-4 w-4 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
          {i < 4 && <Separator className="my-4" />}
        </div>
      ));
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    if (notifications.length === 0) {
      return (
        <div className="py-8 text-center text-muted-foreground">
          {activeTab === 'unread' 
            ? "You don't have any unread notifications" 
            : "You don't have any notifications"}
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {notifications.map((notification, index) => (
          <div key={notification.id}>
            <div 
              className="flex justify-between items-start py-3 hover:bg-muted/50 rounded-md px-2 -mx-2 cursor-pointer"
              onClick={() => handleNotificationClick(notification)}
            >
              <NotificationItem 
                notification={notification} 
                showActions={true} 
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNotification(notification.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete</span>
              </Button>
            </div>
            {index < notifications.length - 1 && <Separator />}
          </div>
        ))}
      </div>
    );
  }

  // Helper function to render pagination
  function renderPagination() {
    return (
      <>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Show
          </span>
          <Select
            value={pagination.limit.toString()}
            onValueChange={handleLimitChange}
          >
            <SelectTrigger className="h-8 w-16">
              <SelectValue placeholder="10" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            per page
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!pagination.hasPrevPage}
            onClick={() => changePage(pagination.page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!pagination.hasNextPage}
            onClick={() => changePage(pagination.page + 1)}
          >
            Next
          </Button>
        </div>
      </>
    );
  }
}
