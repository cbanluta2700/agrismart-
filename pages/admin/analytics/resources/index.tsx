import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { ResourcesPageViewsChart } from '@/components/analytics/ResourcesPageViewsChart';
import { ContentPerformanceTable } from '@/components/analytics/ContentPerformanceTable';
import { PublishingActivityChart } from '@/components/analytics/PublishingActivityChart';
import { CategoryPerformanceChart } from '@/components/analytics/CategoryPerformanceChart';
import { AuthorPerformanceChart } from '@/components/analytics/AuthorPerformanceChart';
import { ContentStatusChart } from '@/components/analytics/ContentStatusChart';
import { DashboardSummaryCards } from '@/components/analytics/DashboardSummaryCards';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const ResourcesAnalyticsDashboard: NextPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [contentType, setContentType] = useState('all');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    endDate: new Date(),
  });
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewsData, setViewsData] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [publishingData, setPublishingData] = useState(null);
  const [error, setError] = useState('');

  // Check if user is authenticated and has necessary permissions
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin?callbackUrl=/admin/analytics/resources');
    } else {
      const allowedRoles = ['admin', 'moderator', 'contentManager'];
      const userRole = session.user.role as string;
      
      if (!allowedRoles.includes(userRole)) {
        router.push('/dashboard');
      }
    }
  }, [session, status, router]);

  // Fetch analytics data when filters change
  useEffect(() => {
    if (!session) return;
    
    const fetchAnalyticsData = async () => {
      setIsLoading(true);
      setError('');
      
      try {
        // Fetch views data
        const viewsResponse = await fetch(
          `/api/analytics/resources?contentType=${contentType}&startDate=${dateRange.startDate.toISOString()}&endDate=${dateRange.endDate.toISOString()}&metric=views`
        );
        
        if (!viewsResponse.ok) {
          throw new Error('Failed to fetch views data');
        }
        
        const viewsJson = await viewsResponse.json();
        setViewsData(viewsJson);
        
        // Fetch performance data
        const performanceResponse = await fetch(
          `/api/analytics/resources?contentType=${contentType}&metric=performance&limit=10`
        );
        
        if (!performanceResponse.ok) {
          throw new Error('Failed to fetch performance data');
        }
        
        const performanceJson = await performanceResponse.json();
        setPerformanceData(performanceJson);
        
        // Fetch publishing data
        const publishingResponse = await fetch(
          `/api/analytics/resources?contentType=${contentType}&startDate=${dateRange.startDate.toISOString()}&endDate=${dateRange.endDate.toISOString()}&metric=publishing`
        );
        
        if (!publishingResponse.ok) {
          throw new Error('Failed to fetch publishing data');
        }
        
        const publishingJson = await publishingResponse.json();
        setPublishingData(publishingJson);
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError('Failed to load analytics data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAnalyticsData();
  }, [session, contentType, dateRange]);

  if (status === 'loading' || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const formatDateRange = () => {
    return `${format(dateRange.startDate, 'MMM d, yyyy')} - ${format(dateRange.endDate, 'MMM d, yyyy')}`;
  };

  return (
    <AdminLayout>
      <Head>
        <title>Resources Analytics Dashboard | AgriSmart Admin</title>
      </Head>
      
      <div className="container mx-auto py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Resources Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Monitor performance and engagement of your resources content
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Content Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Content Type</SelectLabel>
                  <SelectItem value="all">All Content</SelectItem>
                  <SelectItem value="article">Articles</SelectItem>
                  <SelectItem value="guide">Guides</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                  <SelectItem value="glossary">Glossary</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formatDateRange()}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="flex flex-col sm:flex-row">
                  <div className="border-r">
                    <Calendar
                      mode="single"
                      selected={dateRange.startDate}
                      onSelect={(date) => date && setDateRange({ ...dateRange, startDate: date })}
                      disabled={(date) => date > dateRange.endDate || date > new Date()}
                      initialFocus
                    />
                  </div>
                  <div>
                    <Calendar
                      mode="single"
                      selected={dateRange.endDate}
                      onSelect={(date) => date && setDateRange({ ...dateRange, endDate: date })}
                      disabled={(date) => date < dateRange.startDate || date > new Date()}
                      initialFocus
                    />
                  </div>
                </div>
                <div className="p-3 border-t">
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => setDatePickerOpen(false)}
                  >
                    Apply Range
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        {error ? (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="text-center text-red-500">{error}</div>
            </CardContent>
          </Card>
        ) : (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <>
                <DashboardSummaryCards 
                  viewsData={viewsData} 
                  publishingData={publishingData} 
                  contentType={contentType}
                />
                
                <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="mt-8">
                  <TabsList className="mb-8 w-full md:w-auto">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="content-performance">Content Performance</TabsTrigger>
                    <TabsTrigger value="publishing">Publishing Activity</TabsTrigger>
                    <TabsTrigger value="categories">Categories</TabsTrigger>
                    <TabsTrigger value="authors">Authors</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview">
                    <div className="grid gap-6 md:grid-cols-2">
                      <Card className="col-span-2">
                        <CardHeader>
                          <CardTitle>Views Over Time</CardTitle>
                          <CardDescription>Page views for {contentType === 'all' ? 'all resources' : contentType + 's'} in the selected period</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ResourcesPageViewsChart data={viewsData?.dailyViews || []} />
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle>Content by Status</CardTitle>
                          <CardDescription>Distribution of content by publication status</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ContentStatusChart data={publishingData?.contentByStatus || []} />
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle>Top Performing Content</CardTitle>
                          <CardDescription>Most viewed content items</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ContentPerformanceTable 
                            data={performanceData?.mostViewedContent?.slice(0, 5) || []} 
                            contentType={contentType} 
                          />
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="content-performance">
                    <div className="grid gap-6 md:grid-cols-2">
                      <Card className="col-span-2">
                        <CardHeader>
                          <CardTitle>Top Performing Content</CardTitle>
                          <CardDescription>Most viewed content with engagement metrics</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ContentPerformanceTable 
                            data={performanceData?.mostViewedContent || []} 
                            contentType={contentType}
                            showAll
                          />
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle>Average Time on Page</CardTitle>
                          <CardDescription>Average time users spend on content pages</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px] flex items-center justify-center">
                          <div className="text-4xl font-bold">
                            {viewsData?.avgTimeOnPage ? Math.round(viewsData.avgTimeOnPage) : 0}s
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle>Bounce Rate</CardTitle>
                          <CardDescription>Percentage of visitors who navigate away after viewing only one page</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px] flex items-center justify-center">
                          <div className="text-4xl font-bold">
                            {viewsData?.bounceRate ? Math.round(viewsData.bounceRate) : 0}%
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="publishing">
                    <div className="grid gap-6 md:grid-cols-2">
                      <Card className="col-span-2">
                        <CardHeader>
                          <CardTitle>Publishing Activity</CardTitle>
                          <CardDescription>Content published over time</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <PublishingActivityChart data={publishingData?.publishedByDate || []} />
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle>Average Time to Publish</CardTitle>
                          <CardDescription>Average time from creation to publication</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px] flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-4xl font-bold">
                              {publishingData?.averageTimeToPublish ? Math.round(publishingData.averageTimeToPublish) : 0}
                            </div>
                            <div className="text-muted-foreground mt-2">hours</div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle>Average Revisions</CardTitle>
                          <CardDescription>Average number of revisions before publishing</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px] flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-4xl font-bold">
                              {publishingData?.revisionsPerContent ? publishingData.revisionsPerContent.toFixed(1) : '0.0'}
                            </div>
                            <div className="text-muted-foreground mt-2">revisions per content</div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="categories">
                    <Card>
                      <CardHeader>
                        <CardTitle>Category Performance</CardTitle>
                        <CardDescription>Content and views by category</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <CategoryPerformanceChart data={performanceData?.contentByCategory || []} />
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="authors">
                    <Card>
                      <CardHeader>
                        <CardTitle>Author Performance</CardTitle>
                        <CardDescription>Content and views by author</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <AuthorPerformanceChart data={performanceData?.contentByAuthor || []} />
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default ResourcesAnalyticsDashboard;
