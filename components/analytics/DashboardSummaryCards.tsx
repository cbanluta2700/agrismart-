import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Eye, BookOpen, Clock, Users, TrendingUp, Percent } from 'lucide-react';

interface DashboardSummaryCardsProps {
  viewsData: any;
  publishingData: any;
  contentType: string;
}

export const DashboardSummaryCards: React.FC<DashboardSummaryCardsProps> = ({
  viewsData,
  publishingData,
  contentType,
}) => {
  if (!viewsData || !publishingData) {
    return null;
  }

  // Helper function to format large numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  // Function to calculate growth rate
  const calculateGrowth = (data: any[], isMonthly = false) => {
    if (!data || data.length < 2) return 0;
    
    // Sort data by date
    const sortedData = [...data].sort((a, b) => 
      new Date(a.date || a.month || a.week).getTime() - new Date(b.date || b.month || b.week).getTime()
    );
    
    // For monthly data, compare last month to previous month
    if (isMonthly && sortedData.length >= 2) {
      const currentMonth = sortedData[sortedData.length - 1].count;
      const previousMonth = sortedData[sortedData.length - 2].count;
      
      if (previousMonth === 0) return 100;
      return ((currentMonth - previousMonth) / previousMonth) * 100;
    }
    
    // For daily data, compare last 7 days to previous 7 days
    const lastWeek = sortedData.slice(-7).reduce((sum, item) => sum + item.count, 0);
    const previousWeek = sortedData.slice(-14, -7).reduce((sum, item) => sum + item.count, 0);
    
    if (previousWeek === 0) return lastWeek > 0 ? 100 : 0;
    return ((lastWeek - previousWeek) / previousWeek) * 100;
  };

  const viewsGrowth = calculateGrowth(viewsData.dailyViews);
  const uniqueVisitorsGrowth = 5.2; // Placeholder, would normally be calculated
  const publishingGrowth = calculateGrowth(publishingData.publishedByDate);
  const contentCountGrowth = 3.8; // Placeholder, would normally be calculated

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Views</CardTitle>
          <Eye className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(viewsData.totalViews)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {contentType === 'all' ? 'All resources' : `${contentType.charAt(0).toUpperCase() + contentType.slice(1)}s`}
          </p>
          <div className="flex items-center pt-2">
            <TrendingUp className={`h-4 w-4 ${viewsGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            <span className={`text-xs ml-1 ${viewsGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {viewsGrowth >= 0 ? '+' : ''}{viewsGrowth.toFixed(1)}%
            </span>
            <span className="text-xs text-muted-foreground ml-1">from previous period</span>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(viewsData.uniqueVisitors)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Distinct visitors
          </p>
          <div className="flex items-center pt-2">
            <TrendingUp className={`h-4 w-4 ${uniqueVisitorsGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            <span className={`text-xs ml-1 ${uniqueVisitorsGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {uniqueVisitorsGrowth >= 0 ? '+' : ''}{uniqueVisitorsGrowth.toFixed(1)}%
            </span>
            <span className="text-xs text-muted-foreground ml-1">from previous period</span>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Content Published</CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {publishingData.publishedByDate.reduce((sum: number, item: any) => sum + item.count, 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            In selected period
          </p>
          <div className="flex items-center pt-2">
            <TrendingUp className={`h-4 w-4 ${publishingGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            <span className={`text-xs ml-1 ${publishingGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {publishingGrowth >= 0 ? '+' : ''}{publishingGrowth.toFixed(1)}%
            </span>
            <span className="text-xs text-muted-foreground ml-1">from previous period</span>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg. Time on Page</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {Math.round(viewsData.avgTimeOnPage)}s
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Per page view
          </p>
          <div className="flex items-center pt-2">
            <Percent className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground ml-1">
              Bounce rate: {Math.round(viewsData.bounceRate)}%
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
