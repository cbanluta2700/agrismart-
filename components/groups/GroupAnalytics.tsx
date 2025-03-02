import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VercelChart } from '@/components/analytics/VercelChart';
import { StatCard } from '@/components/analytics/StatCard';
import { useAnalytics } from '@vercel/analytics/react';
import { Users, MessageSquare, BarChart, Activity, UserPlus } from 'lucide-react';

interface GroupAnalyticsProps {
  groupId: string;
  isOwner: boolean;
  isModerator: boolean;
}

export default function GroupAnalytics({ groupId, isOwner, isModerator }: GroupAnalyticsProps) {
  const [period, setPeriod] = useState('7d');
  const [summaryData, setSummaryData] = useState<any>(null);
  const [activityData, setActivityData] = useState<any>(null);
  const [memberData, setMemberData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const analytics = useAnalytics();
  
  // Only owners and moderators can access analytics
  if (!isOwner && !isModerator) {
    return null;
  }
  
  // Fetch analytics data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch summary stats
        const summaryResponse = await axios.get(`/api/forum/groups/${groupId}/analytics/summary`, {
          params: { period }
        });
        setSummaryData(summaryResponse.data);
        
        // Fetch activity data
        const activityResponse = await axios.get(`/api/forum/groups/${groupId}/analytics/activity`, {
          params: { period }
        });
        setActivityData(activityResponse.data);
        
        // Fetch member data
        const memberResponse = await axios.get(`/api/forum/groups/${groupId}/analytics/members`, {
          params: { period }
        });
        setMemberData(memberResponse.data);
        
        // Track analytics view event
        analytics.track('Group Analytics Viewed', {
          groupId,
          period,
          role: isOwner ? 'owner' : 'moderator'
        });
      } catch (error) {
        console.error('Error fetching group analytics data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [groupId, period, isOwner, isModerator, analytics]);
  
  // Handle period change
  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    analytics.track('Group Analytics Period Changed', {
      groupId,
      newPeriod: value
    });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Group Analytics</h2>
        
        <Select value={period} onValueChange={handlePeriodChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Members"
          value={summaryData?.activeMembers || 0}
          change={summaryData?.activeMembersChange || 0}
          icon={<Users className="h-5 w-5" />}
          loading={loading}
        />
        <StatCard
          title="New Members"
          value={summaryData?.newMembers || 0}
          change={summaryData?.newMembersChange || 0}
          icon={<UserPlus className="h-5 w-5" />}
          loading={loading}
        />
        <StatCard
          title="Posts"
          value={summaryData?.posts || 0}
          change={summaryData?.postsChange || 0}
          icon={<MessageSquare className="h-5 w-5" />}
          loading={loading}
        />
        <StatCard
          title="Engagement Rate"
          value={`${summaryData?.engagementRate || 0}%`}
          change={summaryData?.engagementRateChange || 0}
          icon={<Activity className="h-5 w-5" />}
          loading={loading}
          format="percent"
        />
      </div>
      
      {/* Tabbed Data Views */}
      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="activity">Activity Trends</TabsTrigger>
          <TabsTrigger value="members">Member Analytics</TabsTrigger>
        </TabsList>
        
        {/* Activity Trends Tab */}
        <TabsContent value="activity" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Posts Over Time</CardTitle>
                <CardDescription>
                  Number of posts created in the group
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <VercelChart
                    type="line"
                    data={activityData?.postsOverTime || []}
                    dataKey="date"
                    series={[
                      { name: 'Posts', key: 'count' }
                    ]}
                    loading={loading}
                    colors={['#3182ce']}
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Comments Over Time</CardTitle>
                <CardDescription>
                  Number of comments on posts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <VercelChart
                    type="line"
                    data={activityData?.commentsOverTime || []}
                    dataKey="date"
                    series={[
                      { name: 'Comments', key: 'count' }
                    ]}
                    loading={loading}
                    colors={['#4299e1']}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Content Engagement</CardTitle>
              <CardDescription>
                Reactions to group content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <VercelChart
                  type="bar"
                  data={activityData?.engagementByType || []}
                  dataKey="type"
                  series={[
                    { name: 'Count', key: 'count' }
                  ]}
                  loading={loading}
                  colors={['#4299e1']}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Member Analytics Tab */}
        <TabsContent value="members" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Member Growth</CardTitle>
                <CardDescription>
                  New members over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <VercelChart
                    type="line"
                    data={memberData?.memberGrowth || []}
                    dataKey="date"
                    series={[
                      { name: 'New Members', key: 'count' }
                    ]}
                    loading={loading}
                    colors={['#3182ce']}
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Member Activity</CardTitle>
                <CardDescription>
                  Distribution of member activity levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <VercelChart
                    type="pie"
                    data={memberData?.activityDistribution || []}
                    dataKey="value"
                    nameKey="name"
                    loading={loading}
                    colors={['#3182ce', '#4299e1', '#63b3ed', '#a0aec0', '#e2e8f0']}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Top Contributors</CardTitle>
              <CardDescription>
                Members with most activity in the group
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <VercelChart
                  type="bar"
                  data={memberData?.topContributors || []}
                  dataKey="name"
                  series={[
                    { name: 'Contributions', key: 'count' }
                  ]}
                  layout="vertical"
                  loading={loading}
                  colors={['#4299e1']}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
