import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import Link from 'next/link';
import { BarChart3, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function MarketplaceAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if user is authenticated and has admin rights
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/marketplace/admin');
  }
  
  // Check if user has admin role
  const user = await db.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      roles: true,
    },
  });
  
  if (!user || !user.roles.includes('ADMIN')) {
    redirect('/marketplace');
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link href="/marketplace" className="mr-6 flex items-center space-x-2">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back to Marketplace</span>
              </Button>
              <span className="font-bold">Marketplace Admin</span>
            </Link>
          </div>
          <nav className="flex items-center space-x-4 lg:space-x-6">
            <Link
              href="/marketplace/admin/insights"
              className="flex items-center text-sm font-medium transition-colors hover:text-primary"
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Insights
            </Link>
            {/* Add more admin navigation links here as needed */}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
