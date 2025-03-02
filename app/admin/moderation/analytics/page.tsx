'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ModerationBarChart from '@/components/charts/ModerationBarChart';
import ModerationLineChart from '@/components/charts/ModerationLineChart';
import { Loader2 } from 'lucide-react';

// Mock data - in a real app this would come from your API
const getMockBarData = (timeframe: string) => ({
  labels: ['Hate', 'Harassment', 'Sexual', 'Violence', 'Self-harm'],
  datasets: [
    {
      label: 'Flagged',
      data: [65, 59, 80, 81, 56],
      backgroundColor: 'rgba(255, 99, 132, 0.5)',
    },
    {
      label: 'Approved',
      data: [28, 48, 40, 19, 86],
      backgroundColor: 'rgba(54, 162, 235, 0.5)',
    },
  ],
  timeframe,
});

const getMockLineData = (timeframe: string) => ({
  labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
  datasets: [
    {
      label: 'Content Flagged',
      data: [65, 59, 80, 81, 56, 55, 40],
      borderColor: 'rgb(255, 99, 132)',
      backgroundColor: 'rgba(255, 99, 132, 0.5)',
      tension: 0.3,
    },
    {
      label: 'False Positives',
      data: [28, 48, 40, 19, 86, 27, 90],
      borderColor: 'rgb(54, 162, 235)',
      backgroundColor: 'rgba(54, 162, 235, 0.5)',
      tension: 0.3,
    },
  ],
  timeframe,
});

export default function ModerationAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [contentType, setContentType] = useState('all');
  const [barData, setBarData] = useState(getMockBarData('Last 30 days'));
  const [lineData, setLineData] = useState(getMockLineData('Last 6 months'));
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  const handleDateRangeChange = (range: { from: Date; to: Date }) => {
    setDateRange(range);
    setLoading(true);
    
    // Simulate API call with new date range
    setTimeout(() => {
      const days = Math.round((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24));
      const timeframe = `${days} days (${range.from.toLocaleDateString()} - ${range.to.toLocaleDateString()})`;
      
      setBarData(getMockBarData(timeframe));
      setLineData(getMockLineData(timeframe));
      setLoading(false);
    }, 1000);
  };

  const handleContentTypeChange = (value: string) => {
    setContentType(value);
    setLoading(true);
    
    // Simulate API call with new content type
    setTimeout(() => {
      setBarData(getMockBarData(`Last 30 days (${value})`));
      setLineData(getMockLineData(`Last 6 months (${value})`));
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Moderation Analytics</h1>
        <p className="text-muted-foreground">
          Track and analyze content moderation performance across the platform
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Options</CardTitle>
          <CardDescription>Customize the analytics view</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-1/2">
              <DateRangePicker 
                value={dateRange}
                onChange={handleDateRangeChange}
              />
            </div>
            <div className="w-full md:w-1/2">
              <Select value={contentType} onValueChange={handleContentTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Content Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Content</SelectItem>
                  <SelectItem value="forum">Forum Posts</SelectItem>
                  <SelectItem value="comments">Comments</SelectItem>
                  <SelectItem value="chat">Chat Messages</SelectItem>
                  <SelectItem value="profiles">User Profiles</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading analytics data...</span>
        </div>
      ) : (
        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <div className="grid gap-6 md:grid-cols-2">
              <ModerationBarChart 
                title="Content Moderation by Category" 
                description="Distribution of flagged vs. approved content by moderation category"
                data={barData}
                height={350}
              />
              <ModerationLineChart 
                title="Moderation Trends" 
                description="Monthly trends of content moderation activity"
                data={lineData}
                height={350}
              />
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Moderation Performance</CardTitle>
                  <CardDescription>Key metrics for moderation system performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-4">
                    <div className="bg-muted rounded p-4">
                      <p className="text-muted-foreground text-sm">Average response time</p>
                      <h3 className="text-2xl font-bold">213ms</h3>
                      <p className="text-xs text-green-500">↓ 12% vs. previous period</p>
                    </div>
                    <div className="bg-muted rounded p-4">
                      <p className="text-muted-foreground text-sm">False positive rate</p>
                      <h3 className="text-2xl font-bold">3.4%</h3>
                      <p className="text-xs text-green-500">↓ 0.8% vs. previous period</p>
                    </div>
                    <div className="bg-muted rounded p-4">
                      <p className="text-muted-foreground text-sm">Content reviewed</p>
                      <h3 className="text-2xl font-bold">5,892</h3>
                      <p className="text-xs text-red-500">↑ 15% vs. previous period</p>
                    </div>
                    <div className="bg-muted rounded p-4">
                      <p className="text-muted-foreground text-sm">Auto-moderation rate</p>
                      <h3 className="text-2xl font-bold">78.3%</h3>
                      <p className="text-xs text-green-500">↑ 5.2% vs. previous period</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="categories">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Category Analysis</CardTitle>
                  <CardDescription>In-depth analysis of moderation by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <ModerationBarChart 
                    title="" 
                    data={barData}
                    height={400}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="trends">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Long-term Moderation Trends</CardTitle>
                  <CardDescription>Historical analysis of moderation patterns</CardDescription>
                </CardHeader>
                <CardContent>
                  <ModerationLineChart 
                    title="" 
                    data={lineData}
                    height={400}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
