import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import AdminLayout from '@/components/layouts/AdminLayout';
import ModerationAnalytics from '@/components/admin/moderation-analytics';
import { getModerationAnalyticsSummary } from '@/lib/analytics/moderation-analytics';

export const metadata: Metadata = {
  title: 'Moderation Analytics | AgriSmart Admin',
  description: 'View detailed analytics about content moderation activities',
};

export default async function ModerationAnalyticsPage() {
  // Check user session and permissions
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/admin/analytics/moderation');
  }
  
  // Check if user has admin permissions
  const userRoles = await prisma.userRole.findMany({
    where: {
      userId: session.user.id,
      role: {
        in: ['ADMIN', 'SUPER_ADMIN']
      }
    }
  });
  
  if (userRoles.length === 0) {
    redirect('/dashboard');
  }
  
  // Get initial analytics data for SSR
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const initialData = await getModerationAnalyticsSummary({
    from: thirtyDaysAgo.toISOString(),
    to: new Date().toISOString(),
    contentType: 'ALL'
  });
  
  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-2">Moderation Analytics</h1>
        <p className="text-gray-600 mb-6">
          View detailed statistics about content moderation activities and performance
        </p>
        
        <ModerationAnalytics initialData={initialData} />
      </div>
    </AdminLayout>
  );
}
