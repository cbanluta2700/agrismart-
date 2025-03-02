import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { AIModerationDashboard } from '@/components/admin/AIModerationDashboard';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { getAuthOptions } from '@/lib/auth';
import { getModerationAnalyticsSummary } from '@/lib/vercel/moderation-analytics';

export const metadata: Metadata = {
  title: 'AI Moderation Dashboard | AgriSmart Admin',
  description: 'View AI-powered content moderation analytics and performance.',
};

export default async function AIModerationDashboardPage() {
  // Check if user is authenticated and has proper permissions
  const session = await getServerSession(getAuthOptions() as any);
  
  if (!session?.user) {
    return redirect('/auth/signin');
  }
  
  // Check if user has admin or moderator role
  const userRole = session?.user?.role || 'USER';
  if (!['ADMIN', 'MODERATOR'].includes(userRole)) {
    return redirect('/dashboard');
  }
  
  // Pre-fetch initial data for the dashboard
  let initialData = null;
  
  try {
    // Get data for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const params = {
      startDate: thirtyDaysAgo.toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    };
    
    initialData = await getModerationAnalyticsSummary(params);
  } catch (error) {
    // Log error but proceed with rendering (the component will handle data fetching)
    console.error('Error pre-fetching moderation analytics:', error);
  }
  
  return (
    <DashboardShell>
      <DashboardHeader
        heading="AI Moderation Dashboard"
        text="Monitor and analyze AI-powered content moderation performance."
      />
      <div className="grid gap-10">
        <AIModerationDashboard initialData={initialData} />
      </div>
    </DashboardShell>
  );
}
