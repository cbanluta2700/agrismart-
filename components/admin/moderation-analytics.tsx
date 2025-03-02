import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { trackModerationAnalyticsView } from '@/lib/vercel/moderation-analytics';
import { format, subDays, parseISO } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

// Types for the analytics data
type ModerationAnalyticsSummary = {
  totalItems: number;
  pendingItems: number;
  approvedItems: number;
  rejectedItems: number;
  avgResponseTime: number;
  autoApprovedCount: number;
  aiAccuracy: number;
};

type TimeSeriesData = {
  date: string;
  pending: number;
  approved: number;
  rejected: number;
  edited: number;
  autoApproved: number;
}[];

type ContentTypeData = {
  type: string;
  count: number;
}[];

type ActionData = {
  action: string;
  count: number;
}[];

type ReviewerData = {
  name: string;
  approved: number;
  rejected: number;
  edited: number;
}[];

type ModerationAnalyticsData = {
  summary: ModerationAnalyticsSummary;
  timeSeries: TimeSeriesData;
  contentTypes: ContentTypeData;
  actions: ActionData;
  reviewers: ReviewerData;
};

// Props for the component
type ModerationAnalyticsProps = {
  initialData?: ModerationAnalyticsData;
  userId?: string;
};

// Colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// Content types for filtering
const CONTENT_TYPES = [
  { value: 'ALL', label: 'All Content Types' },
  { value: 'COMMENT', label: 'Comments' },
  { value: 'FORUM_POST', label: 'Forum Posts' },
  { value: 'REVIEW', label: 'Reviews' },
  { value: 'USER_PROFILE', label: 'User Profiles' },
  { value: 'MARKETPLACE_LISTING', label: 'Marketplace Listings' },
];

export default function ModerationAnalytics({ initialData, userId }: ModerationAnalyticsProps) {
  // State for filter options
  const [fromDate, setFromDate] = useState<Date>(subDays(new Date(), 30));
  const [toDate, setToDate] = useState<Date>(new Date());
  const [contentType, setContentType] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<ModerationAnalyticsData | null>(initialData || null);
  const [activeTab, setActiveTab] = useState('overview');

  // Function to fetch analytics data
  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        from: format(fromDate, 'yyyy-MM-dd'),
        to: format(toDate, 'yyyy-MM-dd'),
        contentType: contentType,
      });

      const response = await fetch(`/api/admin/analytics/moderation?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch moderation analytics data');
      }

      const data = await response.json();
      setAnalyticsData(data);
    } catch (err) {
      console.error('Error fetching moderation analytics:', err);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on initial load if no initialData is provided
  useEffect(() => {
    if (!initialData) {
      fetchAnalyticsData();
    }
    
    // Track analytics view
    trackModerationAnalyticsView(userId);
  }, [initialData, userId]);

  // Summary cards section
  const renderSummaryCards = () => {
    if (!analyticsData) return null;
    
    const { summary } = analyticsData;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-white shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-medium">Total Content</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary.totalItems}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-white shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-medium">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary.pendingItems}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-white shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-medium">Avg. Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary.avgResponseTime.toFixed(1)} hrs</p>
          </CardContent>
        </Card>
        
        <Card className="bg-white shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-medium">AI Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{(summary.aiAccuracy * 100).toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Time series chart
  const renderTimeSeriesChart = () => {
    if (!analyticsData?.timeSeries || analyticsData.timeSeries.length === 0) {
      return (
        <Alert>
          <AlertTitle>No time series data available</AlertTitle>
          <AlertDescription>
            Try adjusting your date range to see more data.
          </AlertDescription>
        </Alert>
      );
    }
    
    return (
      <Card className="p-4 bg-white shadow-md">
        <CardHeader>
          <CardTitle>Moderation Activity Over Time</CardTitle>
          <CardDescription>Number of items by moderation status per day</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={analyticsData.timeSeries}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="pending" stroke="#8884d8" activeDot={{ r: 8 }} />
              <Line type="monotone" dataKey="approved" stroke="#82ca9d" />
              <Line type="monotone" dataKey="rejected" stroke="#ff7300" />
              <Line type="monotone" dataKey="edited" stroke="#0088FE" />
              <Line type="monotone" dataKey="autoApproved" stroke="#FFBB28" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  // Content type distribution chart
  const renderContentTypeChart = () => {
    if (!analyticsData?.contentTypes || analyticsData.contentTypes.length === 0) {
      return (
        <Alert>
          <AlertTitle>No content type data available</AlertTitle>
          <AlertDescription>
            Try adjusting your filters to see data for content types.
          </AlertDescription>
        </Alert>
      );
    }
    
    return (
      <Card className="p-4 bg-white shadow-md">
        <CardHeader>
          <CardTitle>Content Distribution by Type</CardTitle>
          <CardDescription>Breakdown of moderated content by type</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={analyticsData.contentTypes}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  // Action distribution chart
  const renderActionChart = () => {
    if (!analyticsData?.actions || analyticsData.actions.length === 0) {
      return (
        <Alert>
          <AlertTitle>No action data available</AlertTitle>
          <AlertDescription>
            Try adjusting your filters to see data for moderation actions.
          </AlertDescription>
        </Alert>
      );
    }
    
    return (
      <Card className="p-4 bg-white shadow-md">
        <CardHeader>
          <CardTitle>Moderation Actions Distribution</CardTitle>
          <CardDescription>Breakdown of moderation decisions</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={analyticsData.actions}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
                nameKey="action"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {analyticsData.actions.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  // Reviewer performance chart
  const renderReviewerChart = () => {
    if (!analyticsData?.reviewers || analyticsData.reviewers.length === 0) {
      return (
        <Alert>
          <AlertTitle>No reviewer data available</AlertTitle>
          <AlertDescription>
            Try adjusting your filters to see reviewer performance data.
          </AlertDescription>
        </Alert>
      );
    }
    
    return (
      <Card className="p-4 bg-white shadow-md">
        <CardHeader>
          <CardTitle>Moderator Performance</CardTitle>
          <CardDescription>Actions taken by each moderator</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={analyticsData.reviewers}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" />
              <Tooltip />
              <Legend />
              <Bar dataKey="approved" stackId="a" fill="#82ca9d" />
              <Bar dataKey="rejected" stackId="a" fill="#ff7300" />
              <Bar dataKey="edited" stackId="a" fill="#0088FE" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border shadow-sm p-4">
        <h1 className="text-2xl font-bold">Moderation Analytics Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Analyze moderation activity, performance metrics, and trends
        </p>
      </div>
      
      {/* Filters section */}
      <Card className="bg-white shadow-md">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="mb-2 text-sm font-medium">From Date</p>
              <DatePicker 
                date={fromDate} 
                setDate={setFromDate} 
                className="w-full"
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">To Date</p>
              <DatePicker 
                date={toDate} 
                setDate={setToDate} 
                className="w-full"
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Content Type</p>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select content type" />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={fetchAnalyticsData} disabled={loading}>
            {loading ? 'Loading...' : 'Apply Filters'}
          </Button>
        </CardFooter>
      </Card>
      
      {/* Error message */}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Summary cards */}
      {analyticsData && renderSummaryCards()}
      
      {/* Tabs for different visualizations */}
      {analyticsData && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 md:grid-cols-5 mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="timetrends">Time Trends</TabsTrigger>
            <TabsTrigger value="contenttypes">Content Types</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
            <TabsTrigger value="reviewers">Moderators</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            {renderTimeSeriesChart()}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderContentTypeChart()}
              {renderActionChart()}
            </div>
          </TabsContent>
          
          <TabsContent value="timetrends">
            {renderTimeSeriesChart()}
          </TabsContent>
          
          <TabsContent value="contenttypes">
            {renderContentTypeChart()}
          </TabsContent>
          
          <TabsContent value="actions">
            {renderActionChart()}
          </TabsContent>
          
          <TabsContent value="reviewers">
            {renderReviewerChart()}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
