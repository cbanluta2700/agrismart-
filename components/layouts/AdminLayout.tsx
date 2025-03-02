import React, { ReactNode } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import {
  BarChart3,
  FileText,
  Folders,
  Home,
  LayoutDashboard,
  Layers,
  MessageSquare,
  Package,
  Settings,
  ShieldAlert,
  Users,
} from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN';
  
  // If not authenticated or not admin, redirect to login
  React.useEffect(() => {
    if (status !== 'loading' && (!session || !isAdmin)) {
      router.push('/api/auth/signin');
    }
  }, [status, session, isAdmin, router]);
  
  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!session || !isAdmin) {
    return null;
  }

  // Navigation items
  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: LayoutDashboard,
      active: router.pathname === '/admin'
    },
    {
      name: 'Resources',
      icon: Folders,
      active: router.pathname.startsWith('/admin/resources'),
      children: [
        {
          name: 'Overview',
          href: '/admin/resources',
          active: router.pathname === '/admin/resources'
        },
        {
          name: 'Analytics',
          href: '/admin/analytics/resources',
          active: router.pathname === '/admin/analytics/resources'
        },
        {
          name: 'Moderation',
          href: '/admin/resources/moderation',
          active: router.pathname === '/admin/resources/moderation'
        },
        {
          name: 'Categories',
          href: '/admin/resources/categories',
          active: router.pathname === '/admin/resources/categories'
        }
      ]
    },
    {
      name: 'Moderation',
      icon: ShieldAlert,
      active: router.pathname.startsWith('/admin/moderation'),
      children: [
        {
          name: 'Overview',
          href: '/admin/moderation',
          active: router.pathname === '/admin/moderation'
        },
        {
          name: 'Flagged Content',
          href: '/admin/moderation/flagged-content',
          active: router.pathname === '/admin/moderation/flagged-content'
        },
        {
          name: 'Comment Moderation',
          href: '/admin/comment-moderation',
          active: router.pathname === '/admin/comment-moderation'
        },
        {
          name: 'Analytics',
          href: '/admin/analytics/moderation',
          active: router.pathname === '/admin/analytics/moderation'
        }
      ]
    },
    {
      name: 'Forum',
      icon: MessageSquare,
      active: router.pathname.startsWith('/admin/forum'),
      children: [
        {
          name: 'Overview',
          href: '/admin/forum',
          active: router.pathname === '/admin/forum'
        },
        {
          name: 'Moderation',
          href: '/admin/forum/moderation',
          active: router.pathname === '/admin/forum/moderation'
        }
      ]
    },
    {
      name: 'Marketplace',
      icon: Package,
      active: router.pathname.startsWith('/admin/marketplace'),
      children: [
        {
          name: 'Overview',
          href: '/admin/marketplace',
          active: router.pathname === '/admin/marketplace'
        },
        {
          name: 'Products',
          href: '/admin/marketplace/products',
          active: router.pathname === '/admin/marketplace/products'
        },
        {
          name: 'Orders',
          href: '/admin/marketplace/orders',
          active: router.pathname === '/admin/marketplace/orders'
        }
      ]
    },
    {
      name: 'Users',
      href: '/admin/users',
      icon: Users,
      active: router.pathname.startsWith('/admin/users')
    },
    {
      name: 'Analytics',
      href: '/admin/analytics',
      icon: BarChart3,
      active: router.pathname === '/admin/analytics'
    },
    {
      name: 'Settings',
      href: '/admin/settings',
      icon: Settings,
      active: router.pathname.startsWith('/admin/settings')
    }
  ];

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Head>
        <title>AgriSmart Admin</title>
      </Head>
      
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col flex-grow border-r border-gray-200 bg-white overflow-y-auto">
          <div className="flex items-center h-16 flex-shrink-0 px-4 border-b border-gray-200">
            <Link href="/" className="flex items-center space-x-2">
              <Layers className="h-8 w-8 text-green-600" />
              <span className="text-xl font-bold">AgriSmart</span>
            </Link>
          </div>
          <div className="flex-grow flex flex-col pt-5 pb-4 overflow-y-auto">
            <nav className="flex-1 px-2 space-y-1 bg-white">
              {navigationItems.map((item) => (
                <div key={item.name}>
                  {item.children ? (
                    <div className="space-y-1">
                      <div className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${item.active ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                        <item.icon className="mr-3 flex-shrink-0 h-5 w-5 text-gray-500" />
                        <span>{item.name}</span>
                      </div>
                      <div className="ml-7 space-y-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.name}
                            href={child.href}
                            className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${child.active ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Link
                      href={item.href}
                      className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${item.active ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                    >
                      <item.icon className="mr-3 flex-shrink-0 h-5 w-5 text-gray-500" />
                      {item.name}
                    </Link>
                  )}
                </div>
              ))}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">{session.user?.name}</p>
                <p className="text-xs text-gray-500">{session.user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile header */}
      <div className="md:hidden bg-white border-b border-gray-200 fixed top-0 inset-x-0 z-10">
        <div className="flex items-center justify-between h-16 px-4">
          <Link href="/" className="flex items-center">
            <Layers className="h-8 w-8 text-green-600" />
            <span className="ml-2 text-lg font-bold">AgriSmart</span>
          </Link>
          <Link href="/admin" className="p-1 text-gray-600 hover:bg-gray-100 rounded-full">
            <Home className="h-6 w-6" />
          </Link>
        </div>
      </div>
      
      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1 pt-16 md:pt-0">
          {children}
        </main>
      </div>
    </div>
  );
};
