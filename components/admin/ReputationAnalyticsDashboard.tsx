import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VercelChart } from '@/components/analytics/VercelChart';
import { StatCard } from '@/components/analytics/StatCard';
import { useAnalytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Award, Users, ArrowUp, TrendingUp, Activity } from 'lucide-react';

export default function ReputationAnalyticsDashboard() {
  const [period, setPeriod] = useState('7d');
  const [summaryData, setSummaryData] = useState<any>(null);
  const [trendsData, setTrendsData] = useState<any>(null);
  const [distributionData, setDistributionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const analytics = useAnalytics();
  
  // Fetch analytics data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch summary stats
        const summaryResponse = await axios.get('/api/admin/analytics/reputation/summary', {
          params: { period }
        });
        setSummaryData(summaryResponse.data);
        
        // Fetch trend data
        const trendsResponse = await axios.get('/api/admin/analytics/reputation/trends', {
          params: { period }
        });
        setTrendsData(trendsResponse.data);
        
        // Fetch distribution data
        const distributionResponse = await axios.get('/api/admin/analytics/reputation/distribution', {
          params: { period }
        });
        setDistributionData(distributionResponse.data);
        
        // Track dashboard load event
        analytics.track('Reputation Analytics Dashboard Viewed', {
          period
        });
      } catch (error) {
        console.error('Error fetching reputation analytics data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [period, analytics]);
  
  // Handle period change
  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    analytics.track('Reputation Analytics Period Changed', {
      newPeriod: value
    });
  };
  
  return (
    <div className="space-y-6">
      <SpeedInsights />
      
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Reputation System Analytics</h1>
        
        <Select value={period} onValueChange={handlePeriodChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24 Hours</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Points Awarded"
          value={summaryData?.totalPointsAwarded || 0}
          change={summaryData?.pointsChange || 0}
          icon={<TrendingUp className="h-5 w-5" />}
          loading={loading}
        />
        <StatCard
          title="Active Users"
          value={summaryData?.activeUsers || 0}
          change={summaryData?.activeUsersChange || 0}
          icon={<Users className="h-5 w-5" />}
          loading={loading}
        />
        <StatCard
          title="Badges Awarded"
          value={summaryData?.badgesAwarded || 0}
          change={summaryData?.badgesChange || 0}
          icon={<Award className="h-5 w-5" />}
          loading={loading}
        />
        <StatCard
          title="Endorsements"
          value={summaryData?.endorsements || 0}
          change={summaryData?.endorsementsChange || 0}
          icon={<ArrowUp className="h-5 w-5" />}
          loading={loading}
        />
      </div>
      
      {/* Tabbed Data Views */}
      <Tabs defaultValue="activities" className="w-full">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="activities">Activity Trends</TabsTrigger>
          <TabsTrigger value="badges">Badge Analytics</TabsTrigger>
          <TabsTrigger value="users">User Distribution</TabsTrigger>
        </TabsList>
        
        {/* Activity Trends Tab */}
        <TabsContent value="activities" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Points Distribution by Activity</CardTitle>
                <CardDescription>
                  Points awarded for different types of activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <VercelChart
                    type="pie"
                    data={trendsData?.pointsByActivityType || []}
                    dataKey="value"
                    nameKey="name"
                    loading={loading}
                    colors={['#3182ce', '#2c5282', '#2b6cb0', '#4299e1', '#63b3ed']}
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Activity Trends</CardTitle>
                <CardDescription>
                  Number of activities over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <VercelChart
                    type="line"
                    data={trendsData?.activityTrends || []}
                    dataKey="date"
                    series={[
                      { name: 'Activities', key: 'count' }
                    ]}
                    loading={loading}
                    colors={['#3182ce']}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Points Awarded Over Time</CardTitle>
              <CardDescription>
                Total reputation points awarded daily
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <VercelChart
                  type="bar"
                  data={trendsData?.pointsTrends || []}
                  dataKey="date"
                  series={[
                    { name: 'Points', key: 'points' }
                  ]}
                  loading={loading}
                  colors={['#4299e1']}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Badge Analytics Tab */}
        <TabsContent value="badges" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Badges by Category</CardTitle>
                <CardDescription>
                  Distribution of badges across categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <VercelChart
                    type="pie"
                    data={distributionData?.badgesByCategory || []}
                    dataKey="value"
                    nameKey="name"
                    loading={loading}
                    colors={['#3182ce', '#48bb78', '#9f7aea']}
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Top Badges Earned</CardTitle>
                <CardDescription>
                  Most frequently earned badges
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <VercelChart
                    type="bar"
                    data={distributionData?.topBadges || []}
                    dataKey="name"
                    series={[
                      { name: 'Count', key: 'count' }
                    ]}
                    layout="vertical"
                    loading={loading}
                    colors={['#4299e1']}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Badge Earning Trends</CardTitle>
              <CardDescription>
                Badges earned over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <VercelChart
                  type="line"
                  data={trendsData?.badgeTrends || []}
                  dataKey="date"
                  series={[
                    { name: 'Contributor', key: 'contributor' },
                    { name: 'Knowledge', key: 'knowledge' },
                    { name: 'Community', key: 'community' }
                  ]}
                  loading={loading}
                  colors={['#3182ce', '#48bb78', '#9f7aea']}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* User Distribution Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Users by Trust Level</CardTitle>
                <CardDescription>
                  Distribution of users across trust levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <VercelChart
                    type="pie"
                    data={distributionData?.usersByTrustLevel || []}
                    dataKey="value"
                    nameKey="name"
                    loading={loading}
                    colors={['#e2e8f0', '#a0aec0', '#4a5568', '#2d3748', '#1a202c', '#000000']}
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Top Users by Reputation</CardTitle>
                <CardDescription>
                  Users with highest reputation points
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <VercelChart
                    type="bar"
                    data={distributionData?.topUsers || []}
                    dataKey="name"
                    series={[
                      { name: 'Points', key: 'points' }
                    ]}
                    layout="vertical"
                    loading={loading}
                    colors={['#4299e1']}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>User Activity Level</CardTitle>
              <CardDescription>
                Distribution of users by activity frequency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <VercelChart
                  type="bar"
                  data={distributionData?.userActivityDistribution || []}
                  dataKey="category"
                  series={[
                    { name: 'Users', key: 'count' }
                  ]}
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
