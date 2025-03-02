import { GetServerSideProps } from 'next';
import { useState, useEffect } from 'react';
import { getServerSession } from 'next-auth';
import Head from 'next/head';
import { 
  ChartBarIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ArchiveBoxIcon, 
  StarIcon, 
  ClockIcon,
  DocumentTextIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

import AdminLayout from '@/components/layouts/AdminLayout';
import StatCard from '@/components/analytics/StatCard';
import VercelChart from '@/components/analytics/VercelChart';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { ModerationTimePeriod, ModerationTrendDataPoint } from '@/lib/analytics/moderation-analytics';

interface ModerationAnalyticsDashboardProps {
  initialData?: {
    activitySummary: {
      total: number;
      approved: number;
      rejected: number;
      archived: number;
      featured: number;
      pending: number;
    };
  };
}

export default function ModerationAnalyticsDashboard({ initialData }: ModerationAnalyticsDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('last7Days');
  const [activitySummary, setActivitySummary] = useState(initialData?.activitySummary || {
    total: 0,
    approved: 0,
    rejected: 0,
    archived: 0,
    featured: 0,
    pending: 0
  });
  const [trendData, setTrendData] = useState<ModerationTrendDataPoint[]>([]);
  const [resourceDistribution, setResourceDistribution] = useState<any[]>([]);
  const [moderatorPerformance, setModeratorPerformance] = useState<any[]>([]);
  const [periodOptions, setPeriodOptions] = useState<{value: string; label: string}[]>([
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last7Days', label: 'Last 7 Days' },
    { value: 'last30Days', label: 'Last 30 Days' },
    { value: 'last90Days', label: 'Last 90 Days' },
  ]);

  // Fetch data based on the selected period
  useEffect(() => {
    fetchAnalyticsData(selectedPeriod);
  }, [selectedPeriod]);

  // Fetch analytics data from the API
  const fetchAnalyticsData = async (period: string) => {
    setLoading(true);
    
    try {
      // Fetch activity summary
      const summaryResponse = await fetch(`/api/admin/analytics/moderation/summary?period=${period}`);
      const summaryData = await summaryResponse.json();
      setActivitySummary(summaryData);
      
      // Fetch trend data
      const trendResponse = await fetch(`/api/admin/analytics/moderation/trends?period=${period}`);
      const trendData = await trendResponse.json();
      setTrendData(trendData.trends);
      
      // Fetch resource distribution
      const distributionResponse = await fetch('/api/admin/analytics/moderation/distribution');
      const distributionData = await distributionResponse.json();
      
      // Convert to chart format
      const statusDistribution = Object.entries(distributionData.statusDistribution).map(([status, count]) => ({
        name: status,
        value: count
      }));
      
      setResourceDistribution(statusDistribution);
      
      // Fetch moderator performance
      const performanceResponse = await fetch(`/api/admin/analytics/moderation/performance?period=${period}`);
      const performanceData = await performanceResponse.json();
      setModeratorPerformance(performanceData.moderators);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <Head>
        <title>Moderation Analytics - AgriSmart Admin</title>
      </Head>
      
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
        {/* Page header */}
        <div className="sm:flex sm:justify-between sm:items-center mb-8">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Moderation Analytics</h1>
            <p className="mt-1 text-sm text-gray-500">
              Comprehensive dashboard for monitoring moderation activity and performance.
            </p>
          </div>
          
          {/* Period selection */}
          <div className="flex items-center space-x-2">
            <label htmlFor="time-period" className="text-sm font-medium text-gray-700">
              Time Period:
            </label>
            <select
              id="time-period"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              {periodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Stats overview */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-8">
          <StatCard
            title="Total Moderation Actions"
            value={activitySummary.total}
            icon={<ChartBarIcon className="h-6 w-6 text-blue-600" />}
            loading={loading}
          />
          
          <StatCard
            title="Approved Resources"
            value={activitySummary.approved}
            icon={<CheckCircleIcon className="h-6 w-6 text-green-600" />}
            loading={loading}
          />
          
          <StatCard
            title="Rejected Resources"
            value={activitySummary.rejected}
            icon={<XCircleIcon className="h-6 w-6 text-red-600" />}
            loading={loading}
          />
          
          <StatCard
            title="Archived Resources"
            value={activitySummary.archived}
            icon={<ArchiveBoxIcon className="h-6 w-6 text-gray-600" />}
            loading={loading}
          />
          
          <StatCard
            title="Featured Resources"
            value={activitySummary.featured}
            icon={<StarIcon className="h-6 w-6 text-yellow-500" />}
            loading={loading}
          />
          
          <StatCard
            title="Pending Moderation"
            value={activitySummary.pending}
            icon={<ClockIcon className="h-6 w-6 text-orange-500" />}
            loading={loading}
          />
        </div>
        
        {/* Charts */}
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-2 mb-8">
          {/* Moderation Trends */}
          <div>
            <VercelChart
              title="Moderation Activity Trends"
              data={trendData}
              type="line"
              xAxisKey="date"
              yAxisKeys={['approved', 'rejected', 'archived', 'featured']}
              colors={['#16a34a', '#dc2626', '#6b7280', '#eab308']}
              height={350}
              loading={loading}
            />
          </div>
          
          {/* Resource Status Distribution */}
          <div>
            <VercelChart
              title="Resource Status Distribution"
              data={resourceDistribution}
              type="pie"
              xAxisKey="name"
              yAxisKeys={['value']}
              height={350}
              loading={loading}
            />
          </div>
        </div>
        
        {/* Moderator Performance */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Moderator Performance</h2>
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {loading ? (
                // Loading state
                Array.from({ length: 5 }).map((_, index) => (
                  <li key={index} className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="animate-pulse h-8 w-8 bg-gray-200 rounded-full mr-4"></div>
                      <div className="flex-1">
                        <div className="animate-pulse h-4 w-40 bg-gray-200 rounded mb-2"></div>
                        <div className="animate-pulse h-3 w-24 bg-gray-100 rounded"></div>
                      </div>
                      <div className="animate-pulse h-6 w-16 bg-gray-200 rounded"></div>
                    </div>
                  </li>
                ))
              ) : moderatorPerformance.length > 0 ? (
                moderatorPerformance.map((moderator, index) => (
                  <li key={index} className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="bg-blue-100 rounded-full p-2 mr-4">
                        <UserGroupIcon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{moderator.moderatorName}</p>
                        <p className="text-sm text-gray-500">{moderator.actionsPerDay} actions/day</p>
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {moderator.totalActions} actions
                      </div>
                    </div>
                  </li>
                ))
              ) : (
                <li className="px-6 py-4 text-center text-gray-500">
                  No moderator data available for the selected period
                </li>
              )}
            </ul>
          </div>
        </div>
        
        {/* Vercel Analytics Integration Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <DocumentTextIcon className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Powered by Vercel Analytics</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  This dashboard combines AgriSmart moderation data with Vercel's web analytics and performance metrics.
                  View detailed performance insights in your Vercel dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  
  // Check authentication and permissions
  if (!session || !session.user) {
    return {
      redirect: {
        destination: '/auth/signin?callbackUrl=/admin/analytics/moderation',
        permanent: false,
      },
    };
  }
  
  // Check if user has admin or moderator role
  const userRole = session.user.role;
  if (userRole !== 'ADMIN' && userRole !== 'MODERATOR') {
    return {
      redirect: {
        destination: '/dashboard',
        permanent: false,
      },
    };
  }
  
  return {
    props: {
      // No need to fetch initial data here since we'll fetch it client-side
    },
  };
}
