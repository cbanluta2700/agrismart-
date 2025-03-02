import React from 'react';
import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import dynamic from 'next/dynamic';

// Import the client component with dynamic import to prevent hydration errors
const MarketplaceInsightsClient = dynamic(
  () => import('@/components/marketplace/analytics/MarketplaceInsightsClient'),
  { ssr: false }
);

export const metadata: Metadata = {
  title: 'Marketplace Insights | AgriSmart',
  description: 'Comprehensive marketplace analytics and performance metrics',
};

export default async function MarketplaceInsightsPage() {
  // Check if user is authenticated and has admin rights
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/marketplace/admin/insights');
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
    <div className="container py-8">
      <MarketplaceInsightsClient />
    </div>
  );
}
