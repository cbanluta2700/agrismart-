import { Fragment, useState, useEffect } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { BellIcon, CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  data?: any;
}

export default function NotificationsMenu() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notifications when the component mounts and session is available
  useEffect(() => {
    if (session?.user) {
      fetchNotifications();
    }
  }, [session]);

  // Fetch notifications from the API
  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/notifications');
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.notifications.filter((n: Notification) => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  // Mark a notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true } 
            : notification
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({ ...notification, read: true }))
      );
      
      // Reset unread count
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'MODERATION':
      case 'ADMIN_MODERATION':
      case 'MODERATION_BATCH':
      case 'ADMIN_MODERATION_BATCH':
        return <CheckCircleIcon className="h-6 w-6 text-blue-500" />;
      default:
        return <BellIcon className="h-6 w-6 text-gray-500" />;
    }
  };

  // Get notification link based on type and data
  const getNotificationLink = (notification: Notification) => {
    try {
      const data = typeof notification.data === 'string' 
        ? JSON.parse(notification.data) 
        : notification.data;
      
      if (!data) return '#';
      
      switch (notification.type) {
        case 'MODERATION':
          return `/resources/${data.resourceId}`;
        case 'ADMIN_MODERATION':
          return `/admin/resources/${data.resourceId}`;
        case 'MODERATION_BATCH':
          return `/account/resources`;
        case 'ADMIN_MODERATION_BATCH':
          return `/admin/resources/moderation-logs`;
        default:
          return '#';
      }
    } catch (error) {
      console.error('Error parsing notification data:', error);
      return '#';
    }
  };

  return (
    <Popover className="relative">
      {({ open }) => (
        <>
          <Popover.Button
            className="relative rounded-full p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Notifications"
          >
            <BellIcon className="h-6 w-6" aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
                {unreadCount}
              </span>
            )}
          </Popover.Button>
          
          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel 
              className="absolute right-0 z-50 mt-2 w-80 sm:w-96 max-h-96 overflow-hidden rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
            >
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              
              <div className="max-h-72 overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center text-gray-500">
                    Loading notifications...
                  </div>
                ) : error ? (
                  <div className="p-4 text-center text-red-500">
                    {error}
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No notifications to display
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {notifications.map((notification) => (
                      <div 
                        key={notification.id} 
                        className={`p-4 hover:bg-gray-50 ${notification.read ? 'opacity-75' : 'bg-blue-50'}`}
                      >
                        <Link 
                          href={getNotificationLink(notification)}
                          onClick={() => !notification.read && markAsRead(notification.id)}
                          className="flex gap-3"
                        >
                          <div className="flex-shrink-0">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600 truncate">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="ml-auto">
                              <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                            </div>
                          )}
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="border-t border-gray-200 p-2 flex justify-center">
                <Link 
                  href="/account/notifications" 
                  className="text-sm text-blue-600 hover:text-blue-800 w-full text-center py-2 hover:bg-gray-50 rounded-md"
                >
                  View all notifications
                </Link>
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
}
