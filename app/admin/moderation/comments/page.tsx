import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

import { CommentModerationDashboard } from '@/components/admin/comment-moderation/dashboard';
import { DashboardHeader } from '@/components/admin/dashboard-header';
import { DashboardShell } from '@/components/admin/dashboard-shell';

export const metadata: Metadata = {
  title: 'Comment Moderation Dashboard | AgriSmart Admin',
  description: 'Manage and moderate user comments across the AgriSmart platform',
};

export default async function CommentModerationPage() {
  const session = await getServerSession(authOptions);

  // Check if user is authenticated and has admin/moderator role
  if (!session?.user || !session.user.roles?.some(role => 
    ['ADMIN', 'MODERATOR'].includes(role)
  )) {
    redirect('/auth/signin');
  }

  // Fetch initial dashboard stats
  const [
    pendingReportsCount,
    recentReportsCount,
    totalCommentsCount,
    highPriorityCount
  ] = await Promise.all([
    // Count of pending reports
    prisma.report.count({
      where: { status: 'PENDING' }
    }),

    // Count of reports in the last 24 hours
    prisma.report.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    }),

    // Total comments count
    prisma.comment.count(),

    // High priority reports (high severity or multiple reports)
    prisma.comment.count({
      where: {
        OR: [
          { 
            reports: { 
              some: { 
                category: { 
                  severity: { gte: 4 } 
                } 
              } 
            } 
          },
          { reportCount: { gte: 3 } }
        ]
      }
    })
  ]);

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Comment Moderation"
        subheading="Review and moderate user comments across the platform"
      />
      
      <div className="grid gap-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-muted bg-card p-6">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-muted-foreground">Pending Reports</h3>
            </div>
            <div className="mt-3 text-2xl font-bold">{pendingReportsCount}</div>
          </div>
          
          <div className="rounded-lg border border-muted bg-card p-6">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-muted-foreground">Reports Today</h3>
            </div>
            <div className="mt-3 text-2xl font-bold">{recentReportsCount}</div>
          </div>
          
          <div className="rounded-lg border border-muted bg-card p-6">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-muted-foreground">Total Comments</h3>
            </div>
            <div className="mt-3 text-2xl font-bold">{totalCommentsCount}</div>
          </div>
          
          <div className="rounded-lg border border-muted bg-card p-6">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-muted-foreground">High Priority</h3>
            </div>
            <div className="mt-3 text-2xl font-bold">{highPriorityCount}</div>
          </div>
        </div>
        
        <CommentModerationDashboard userId={session.user.id} />
      </div>
    </DashboardShell>
  );
}
