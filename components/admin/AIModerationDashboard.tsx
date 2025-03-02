import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDateRangePicker } from '@/components/ui/date-range-picker';
import { Button } from '@/components/ui/button';
import { ReloadIcon, ShieldAlert, ShieldCheck, Clock, User, FileBarChart } from 'lucide-react';
import { LineChart, BarChart } from '@/components/charts';
import { getModerationAnalyticsSummary } from '@/lib/vercel/moderation-analytics';
import { Badge } from '@/components/ui/badge';

interface AIModerationDashboardProps {
  /**
   * Initial analytics data if available
   */
  initialData?: any;
}

/**
 * Dashboard component for AI moderation analytics
 */
export function AIModerationDashboard({ initialData }: AIModerationDashboardProps) {
  const { data: session } = useSession();
  const [analyticsData, setAnalyticsData] = useState(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date(),
  });
  const [contentType, setContentType] = useState<string>('all');

  // Fetch analytics data
  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = {
        startDate: dateRange.from.toISOString().split('T')[0],
        endDate: dateRange.to.toISOString().split('T')[0],
        contentType: contentType === 'all' ? undefined : contentType,
      };
      
      const response = await fetch(
        `/api/admin/analytics/moderation?${new URLSearchParams(params as any).toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch moderation analytics');
      }
      
      const data = await response.json();
      setAnalyticsData(data);
    } catch (err) {
      setError((err as Error).message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  // Load data on initial render and when filters change
  useEffect(() => {
    if (session?.user) {
      fetchAnalyticsData();
    }
  }, [session, dateRange, contentType]);
  
  // Check if user has permission
  if (!session?.user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Moderation Dashboard</CardTitle>
          <CardDescription>You must be logged in to view moderation analytics</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  // Check if user has admin or moderator role
  const userRole = session?.user?.role || 'USER';
  if (!['ADMIN', 'MODERATOR'].includes(userRole)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Moderation Dashboard</CardTitle>
          <CardDescription>You do not have permission to view moderation analytics</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Moderation Dashboard</CardTitle>
          <CardDescription>Error loading moderation analytics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">{error}</div>
          <Button onClick={fetchAnalyticsData} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  // Calculate summary metrics
  const summaryMetrics = analyticsData
    ? {
        totalModerated: analyticsData.totalModerated || 0,
        flaggedContent: analyticsData.flaggedContent || 0,
        approvedContent: analyticsData.approvedContent || 0,
        flagRate: analyticsData.flagRate 
          ? `${(analyticsData.flagRate * 100).toFixed(1)}%` 
          : 'N/A',
        averageProcessingTime: analyticsData.averageProcessingTime
          ? `${analyticsData.averageProcessingTime.toFixed(2)}ms`
          : 'N/A',
        aiModeratedPercentage: analyticsData.aiModeratedPercentage
          ? `${(analyticsData.aiModeratedPercentage * 100).toFixed(1)}%`
          : 'N/A',
      }
    : {
        totalModerated: 0,
        flaggedContent: 0,
        approvedContent: 0,
        flagRate: 'N/A',
        averageProcessingTime: 'N/A',
        aiModeratedPercentage: 'N/A',
      };
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>AI Moderation Dashboard</CardTitle>
              <CardDescription>
                Analytics for AI-powered content moderation
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAnalyticsData}
              disabled={loading}
            >
              {loading ? (
                <>
                  <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <ReloadIcon className="mr-2 h-4 w-4" />
                  Refresh
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
            <div className="grid md:flex-1">
              <CalendarDateRangePicker
                date={dateRange}
                onUpdateDate={setDateRange}
              />
            </div>
            <div className="grid md:w-[260px]">
              <Select
                value={contentType}
                onValueChange={setContentType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select content type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Content</SelectItem>
                  <SelectItem value="comment">Comments</SelectItem>
                  <SelectItem value="post">Posts</SelectItem>
                  <SelectItem value="message">Messages</SelectItem>
                  <SelectItem value="profile">Profiles</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Moderated
            </CardTitle>
            <FileBarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryMetrics.totalModerated}</div>
            <p className="text-xs text-muted-foreground">
              Total content items processed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Flagged Content
            </CardTitle>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryMetrics.flaggedContent}</div>
            <p className="text-xs text-muted-foreground">
              Content items flagged ({summaryMetrics.flagRate})
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              AI Moderation Rate
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryMetrics.aiModeratedPercentage}</div>
            <p className="text-xs text-muted-foreground">
              Content moderated by AI
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Detailed Analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Moderation Activity</CardTitle>
              <CardDescription>
                Moderation actions over time
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {analyticsData?.timeSeriesData ? (
                <LineChart 
                  data={analyticsData.timeSeriesData}
                  categories={['flagged', 'approved']}
                  index="date"
                  colors={['red', 'green']}
                  valueFormatter={(value) => `${value} items`}
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  {loading ? 'Loading chart data...' : 'No data available'}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Flagged Categories</CardTitle>
              <CardDescription>
                Distribution of flagged content by category
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {analyticsData?.categoriesData ? (
                <BarChart 
                  data={analyticsData.categoriesData}
                  categories={['count']}
                  index="category"
                  colors={['orange']}
                  valueFormatter={(value) => `${value} items`}
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  {loading ? 'Loading chart data...' : 'No data available'}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Moderation Performance</CardTitle>
              <CardDescription>
                Processing times and accuracy metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="text-sm font-medium">Average Processing Time</h3>
                  <p className="text-2xl font-bold">{summaryMetrics.averageProcessingTime}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium">Accuracy Rate</h3>
                  <p className="text-2xl font-bold">
                    {analyticsData?.accuracyRate
                      ? `${(analyticsData.accuracyRate * 100).toFixed(1)}%`
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Sources Tab */}
        <TabsContent value="sources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Moderation Sources</CardTitle>
              <CardDescription>
                Distribution of moderation by source
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {analyticsData?.sourcesData ? (
                <BarChart 
                  data={analyticsData.sourcesData}
                  categories={['count']}
                  index="source"
                  colors={['blue']}
                  valueFormatter={(value) => `${value} items`}
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  {loading ? 'Loading chart data...' : 'No data available'}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Recent Moderation Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Moderation Actions</CardTitle>
          <CardDescription>
            Latest AI moderation decisions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analyticsData?.recentActions && analyticsData.recentActions.length > 0 ? (
              <div className="rounded-md border">
                <div className="grid grid-cols-5 border-b bg-muted/50 p-2 font-medium">
                  <div>Content ID</div>
                  <div>Action</div>
                  <div>Source</div>
                  <div>Reason</div>
                  <div>Timestamp</div>
                </div>
                <div className="divide-y">
                  {analyticsData.recentActions.map((action: any, i: number) => (
                    <div key={i} className="grid grid-cols-5 p-2">
                      <div className="truncate">{action.contentId}</div>
                      <div>
                        <Badge
                          variant={
                            action.action === 'approved'
                              ? 'success'
                              : action.action === 'flagged'
                              ? 'destructive'
                              : 'outline'
                          }
                        >
                          {action.action}
                        </Badge>
                      </div>
                      <div>{action.source || 'Unknown'}</div>
                      <div className="truncate">{action.reason || 'N/A'}</div>
                      <div>
                        {new Date(action.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-muted-foreground">
                {loading ? 'Loading recent actions...' : 'No recent moderation actions found'}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button variant="outline" size="sm">
            View All
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
