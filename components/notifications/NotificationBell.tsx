import { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import NotificationItem from './NotificationItem';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Skeleton } from '@/components/ui/skeleton';

interface Notification {
  id: string;
  title: string;
  content: string;
  type: string;
  read: boolean;
  linkUrl?: string;
  createdAt: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { data: session } = useSession();

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!session?.user) return;
    
    try {
      setIsLoading(true);
      const response = await fetch('/api/notifications?limit=5&unreadOnly=true');
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
        setUnreadCount(data.pagination.totalItems);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!session?.user) return;
    
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
      });
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(notification => ({ ...notification, read: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  };

  // Mark a single notification as read
  const markAsRead = async (id: string) => {
    if (!session?.user) return;
    
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
      });
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === id 
              ? { ...notification, read: true } 
              : notification
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error(`Failed to mark notification ${id} as read:`, error);
    }
  };

  // Navigate to notification link and mark as read
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    
    if (notification.linkUrl) {
      router.push(notification.linkUrl);
    }
  };

  // View all notifications
  const viewAllNotifications = () => {
    router.push('/notifications');
  };

  // Fetch notifications on mount and when session changes
  useEffect(() => {
    if (session?.user) {
      fetchNotifications();
      
      // Set up polling for new notifications (every 30 seconds)
      const interval = setInterval(fetchNotifications, 30000);
      
      return () => clearInterval(interval);
    }
  }, [session]);

  // If not logged in, don't show the bell
  if (!session?.user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {unreadCount > 0 ? (
            <>
              <Bell className="h-5 w-5" />
              <Badge 
                className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs" 
                variant="destructive"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            </>
          ) : (
            <BellOff className="h-5 w-5" />
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="text-xs h-7"
            >
              Mark all as read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup className="max-h-[300px] overflow-y-auto">
          {isLoading ? (
            // Loading skeleton
            Array.from({ length: 3 }).map((_, i) => (
              <DropdownMenuItem key={i} className="cursor-default flex flex-col items-start gap-1 py-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </DropdownMenuItem>
            ))
          ) : notifications.length > 0 ? (
            // Notification items
            notifications.map(notification => (
              <DropdownMenuItem 
                key={notification.id} 
                className="cursor-pointer"
                onClick={() => handleNotificationClick(notification)}
              >
                <NotificationItem notification={notification} />
              </DropdownMenuItem>
            ))
          ) : (
            // No notifications
            <DropdownMenuItem className="cursor-default flex justify-center py-4 text-muted-foreground">
              No new notifications
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="cursor-pointer justify-center font-medium"
          onClick={viewAllNotifications}
        >
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
