import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import Link from 'next/link';
import { BellIcon, CheckCircleIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import AccountLayout from '@/components/layouts/AccountLayout';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  data?: any;
}

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const limit = 20;

  // Load notifications when the component mounts and session is available
  useEffect(() => {
    if (session?.user) {
      fetchNotifications();
    }
  }, [session, offset]);

  // Fetch notifications from the API
  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/notifications?limit=${limit}&offset=${offset}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      const data = await response.json();
      
      if (offset === 0) {
        setNotifications(data.notifications || []);
      } else {
        setNotifications(prev => [...prev, ...(data.notifications || [])]);
      }
      
      setTotalCount(data.totalCount || 0);
      setHasMore((offset + limit) < data.totalCount);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  // Load more notifications
  const loadMore = () => {
    setOffset(prev => prev + limit);
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

  // Loading placeholder
  if (status === 'loading') {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }
  
  // Unauthorized
  if (!session) {
    return <div className="flex justify-center items-center min-h-screen">Access denied. Please sign in.</div>;
  }

  return (
    <AccountLayout>
      <Head>
        <title>Notifications - AgriSmart</title>
      </Head>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="mt-1 text-sm text-gray-500">
              View all your notifications
            </p>
          </div>
          
          <div className="flex space-x-4">
            <Link
              href="/account/notification-preferences"
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Notification Settings
            </Link>
            
            <button
              onClick={markAllAsRead}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Mark All as Read
            </button>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}
        
        {notifications.length === 0 ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-md p-10 text-center">
            <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No notifications</h3>
            <p className="mt-1 text-sm text-gray-500">
              You don't have any notifications at this time.
            </p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {notifications.map((notification) => (
                <li 
                  key={notification.id}
                  className={`hover:bg-gray-50 ${notification.read ? '' : 'bg-blue-50'}`}
                >
                  <Link 
                    href={getNotificationLink(notification)}
                    className="block"
                    onClick={() => !notification.read && markAsRead(notification.id)}
                  >
                    <div className="px-4 py-4 sm:px-6 flex items-center">
                      <div className="flex-shrink-0 mr-4">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-medium ${notification.read ? 'text-gray-700' : 'text-gray-900'}`}>
                            {notification.title}
                          </p>
                          <div className="ml-2 flex-shrink-0 flex">
                            <p className="text-sm text-gray-500">
                              {format(new Date(notification.createdAt), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                          {notification.message}
                        </p>
                      </div>
                      <div className="ml-5 flex-shrink-0">
                        <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            
            {hasMore && (
              <div className="bg-white px-4 py-4 sm:px-6 border-t border-gray-200">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AccountLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  
  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin?callbackUrl=/account/notifications',
        permanent: false,
      },
    };
  }
  
  return {
    props: {},
  };
}
