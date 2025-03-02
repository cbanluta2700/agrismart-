'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, BarChart3, BarChart4, Clock, Download, Eye, FileText, MessageSquare, ThumbsUp, TrendingUp, Users } from 'lucide-react';
import { DataExport } from '@/components/analytics/DataExport';
import { ActivityChart } from '@/components/analytics/ActivityChart';
import { MetricsCard } from '@/components/analytics/MetricsCard';
import { format } from 'date-fns';

type Period = 'day' | 'week' | 'month' | 'year';

interface AnalyticsData {
  engagement: {
    totalEvents: number;
    activeUsers: number;
    postViews: number;
    postCreates: number;
    commentCreates: number;
    likes: number;
    groupJoins: number;
  };
  activity: {
    timeSeries: {
      timeSegment: string;
      count: number;
    }[];
    period: string;
    startDate: string;
    endDate: string;
  };
  topContent: {
    topPosts: {
      id: string;
      title: string;
      content: string;
      views: number;
      _count: {
        comments: number;
        likes: number;
      };
      author: {
        id: string;
        name: string;
      };
      group: {
        id: string;
        name: string;
      };
    }[];
    topGroups: {
      id: string;
      name: string;
      description: string;
      _count: {
        members: number;
        posts: number;
      };
    }[];
  };
}

const AnalyticsPage = () => {
  const { data: session, status } = useSession();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('week');
  const [groupId, setGroupId] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Check if user is admin
    if (status === 'authenticated') {
      if (session?.user?.role !== 'ADMIN') {
        redirect('/'); // Redirect non-admins
      }
      fetchAnalyticsData();
    } else if (status === 'unauthenticated') {
      redirect('/login'); // Redirect unauthenticated users
    }
  }, [session, status, period, groupId]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        period,
        ...(groupId ? { groupId } : {}),
      });

      const response = await fetch(`/api/analytics?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const data = await response.json();
      setAnalyticsData(data);
    } catch (err) {
      setError('Failed to load analytics data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
          <button 
            onClick={fetchAnalyticsData} 
            className="bg-red-500 text-white px-4 py-2 rounded mt-2 hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return null;
  }

  // Format dates for use in components
  const startDate = analyticsData.activity.startDate;
  const endDate = analyticsData.activity.endDate;

  // Prepare metrics for the MetricsCard component
  const overviewMetrics = [
    {
      label: 'Active Users',
      value: analyticsData.engagement.activeUsers,
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      label: 'Post Views',
      value: analyticsData.engagement.postViews,
      icon: Eye,
      color: 'bg-green-500'
    },
    {
      label: 'New Posts',
      value: analyticsData.engagement.postCreates,
      icon: FileText,
      color: 'bg-purple-500'
    },
    {
      label: 'Comments',
      value: analyticsData.engagement.commentCreates,
      icon: MessageSquare,
      color: 'bg-orange-500'
    },
    {
      label: 'Likes',
      value: analyticsData.engagement.likes,
      icon: ThumbsUp,
      color: 'bg-red-500'
    },
    {
      label: 'Group Joins',
      value: analyticsData.engagement.groupJoins,
      icon: Users,
      color: 'bg-indigo-500'
    }
  ];

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        
        <div className="flex items-center gap-4">
          <Select value={period} onValueChange={(value) => setPeriod(value as Period)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Last 24 Hours</SelectItem>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          
          <DataExport 
            endpoint="/api/analytics/export"
            queryParams={{ period, dataType: 'events' }}
            filename={`analytics-${period}`}
            label="Export Data"
          />
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="content">Top Content</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          {/* Overview Metrics */}
          <MetricsCard 
            title="Key Metrics"
            description={`Analytics for ${format(new Date(startDate), 'MMM d, yyyy')} to ${format(new Date(endDate), 'MMM d, yyyy')}`}
            metrics={overviewMetrics}
          />
          
          {/* Activity Chart */}
          <div className="mt-6">
            <ActivityChart
              data={analyticsData.activity.timeSeries}
              period={period}
              startDate={startDate}
              endDate={endDate}
              title="Activity Over Time"
              description="User interaction frequency"
              height={350}
            />
          </div>
          
          {/* Top Content Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Top Posts */}
            <Card>
              <CardHeader>
                <CardTitle>Top Posts</CardTitle>
                <CardDescription>Most viewed posts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.topContent.topPosts.slice(0, 5).map((post) => (
                    <div key={post.id} className="border-b pb-3 last:border-0">
                      <h3 className="font-medium truncate">{post.title}</h3>
                      <div className="flex justify-between text-sm text-gray-500 mt-1">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center">
                            <Eye className="h-3 w-3 mr-1" /> {post.views}
                          </span>
                          <span className="flex items-center">
                            <ThumbsUp className="h-3 w-3 mr-1" /> {post._count.likes}
                          </span>
                          <span className="flex items-center">
                            <MessageSquare className="h-3 w-3 mr-1" /> {post._count.comments}
                          </span>
                        </div>
                        <span>{post.group.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Top Groups */}
            <Card>
              <CardHeader>
                <CardTitle>Top Groups</CardTitle>
                <CardDescription>Most active groups</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analyticsData.topContent.topGroups.slice(0, 5).map(group => ({
                        name: group.name,
                        members: group._count.members,
                        posts: group._count.posts
                      }))}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        tick={{ fontSize: 12 }}
                        width={100}
                      />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="members" name="Members" fill="#3b82f6" />
                      <Bar dataKey="posts" name="Posts" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="engagement">
          <div className="grid grid-cols-1 gap-6">
            {/* Engagement metrics with better visualization */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>Engagement Breakdown</CardTitle>
                  <CardDescription>Activity by type</CardDescription>
                </div>
                <DataExport 
                  endpoint="/api/analytics/export"
                  queryParams={{ period, dataType: 'events' }}
                  filename={`engagement-${period}`}
                  label="Export"
                />
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Post Views', value: analyticsData.engagement.postViews },
                        { name: 'Post Creates', value: analyticsData.engagement.postCreates },
                        { name: 'Comments', value: analyticsData.engagement.commentCreates },
                        { name: 'Likes', value: analyticsData.engagement.likes },
                        { name: 'Group Joins', value: analyticsData.engagement.groupJoins },
                      ]}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" name="Count" fill="#6366f1" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* User engagement section */}
            <Card className="mt-6">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>User Activity Trends</CardTitle>
                  <CardDescription>Activity per user over time</CardDescription>
                </div>
                <DataExport 
                  endpoint="/api/analytics/export"
                  queryParams={{ period, dataType: 'users' }}
                  filename={`user-activity-${period}`}
                  label="Export Users"
                />
              </CardHeader>
              <CardContent>
                <ActivityChart
                  data={analyticsData.activity.timeSeries}
                  period={period}
                  startDate={startDate}
                  endDate={endDate}
                  height={300}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="content">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>Top Posts</CardTitle>
                  <CardDescription>Most viewed and engaged content</CardDescription>
                </div>
                <DataExport 
                  endpoint="/api/analytics/export"
                  queryParams={{ period, dataType: 'content' }}
                  filename={`content-performance-${period}`}
                  label="Export Content"
                />
              </CardHeader>
              <CardContent>
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="pb-2">Title</th>
                      <th className="pb-2">Group</th>
                      <th className="pb-2">Views</th>
                      <th className="pb-2">Likes</th>
                      <th className="pb-2">Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.topContent.topPosts.map((post) => (
                      <tr key={post.id} className="border-b last:border-0">
                        <td className="py-3 truncate max-w-xs">{post.title}</td>
                        <td className="py-3">{post.group.name}</td>
                        <td className="py-3">{post.views}</td>
                        <td className="py-3">{post._count.likes}</td>
                        <td className="py-3">{post._count.comments}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="export">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Events Export</CardTitle>
                <CardDescription>Raw analytics events</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-4">
                  Export all user events and interactions tracked during the selected time period.
                </p>
                <DataExport 
                  endpoint="/api/analytics/export"
                  queryParams={{ period, dataType: 'events' }}
                  filename={`analytics-events-${period}`}
                  label="Export Events"
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>User Activity</CardTitle>
                <CardDescription>User engagement metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-4">
                  Export user activity data including event counts and activity timestamps.
                </p>
                <DataExport 
                  endpoint="/api/analytics/export"
                  queryParams={{ period, dataType: 'users' }}
                  filename={`user-activity-${period}`}
                  label="Export User Data"
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Content Performance</CardTitle>
                <CardDescription>Posts and group metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-4">
                  Export content performance data including views, likes, and comments.
                </p>
                <DataExport 
                  endpoint="/api/analytics/export"
                  queryParams={{ period, dataType: 'content' }}
                  filename={`content-performance-${period}`}
                  label="Export Content Data"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsPage;
