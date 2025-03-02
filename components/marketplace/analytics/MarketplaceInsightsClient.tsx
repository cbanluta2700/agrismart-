'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SalesTrendChart from '@/components/marketplace/analytics/SalesTrendChart';
import CategoryPerformanceChart from '@/components/marketplace/analytics/CategoryPerformanceChart';
import TopSellersTable from '@/components/marketplace/analytics/TopSellersTable';
import TopProductsTable from '@/components/marketplace/analytics/TopProductsTable';
import MarketplaceMetricsCards from '@/components/marketplace/analytics/MarketplaceMetricsCards';
import DataExportButton from '@/components/marketplace/analytics/DataExportButton';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Legend, 
  Tooltip as RechartsTooltip 
} from 'recharts';

// Type definitions
interface MarketplaceInsightsData {
  overallMetrics: {
    totalOrders: number;
    totalSalesAmount: number;
    averageOrderValue: number;
    activeSellersCount: number;
    newProductsCount: number;
  };
  categoryPerformance: Array<{
    id: string;
    name: string;
    totalSales: number;
    orderCount: number;
    productCount: number;
  }>;
  topSellers: Array<{
    id: string;
    name: string;
    avatar: string | null;
    totalSales: number;
    orderCount: number;
    productCount: number;
  }>;
  salesTrends: Array<{
    date: string;
    amount: number;
    count: number;
  }>;
  topProducts: Array<{
    id: string;
    name: string;
    image: string | null;
    price: number | any;
    totalSales: number;
    quantitySold: number;
    categoryName: string;
    sellerName: string;
    sellerId: string;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'];

const MarketplaceInsightsClient: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const timeframe = searchParams.get('timeframe') || '30days';
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [insightsData, setInsightsData] = useState<MarketplaceInsightsData | null>(null);
  
  // Fetch insights data when timeframe changes
  useEffect(() => {
    const fetchInsightsData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/marketplace/analytics/marketplace-insights?timeframe=${timeframe}`);
        
        if (!response.ok) {
          throw new Error(`Error fetching data: ${response.status}`);
        }
        
        const data = await response.json();
        setInsightsData(data);
      } catch (error) {
        console.error('Failed to fetch marketplace insights:', error);
        toast({
          title: 'Error',
          description: 'Failed to load marketplace insights data. Please try again later.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInsightsData();
  }, [timeframe]);
  
  // Handle timeframe change
  const handleTimeframeChange = (value: string) => {
    router.push(`/marketplace/admin/insights?timeframe=${value}`);
  };
  
  // Format category data for pie chart
  const formatCategoryDataForPieChart = () => {
    if (!insightsData) return [];
    
    return insightsData.categoryPerformance
      .slice(0, 6) // Take top 6 categories
      .map((category, index) => ({
        name: category.name,
        value: category.totalSales,
        fill: COLORS[index % COLORS.length],
      }));
  };
  
  // Custom tooltip for pie chart
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-md p-3 shadow-sm">
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-primary">
            ${payload[0].value.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marketplace Insights</h1>
          <p className="text-muted-foreground">
            Comprehensive analytics dashboard for monitoring marketplace performance
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select defaultValue={timeframe} onValueChange={handleTimeframeChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          
          <DataExportButton timeframe={timeframe} />
        </div>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array(5).fill(0).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-1" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : insightsData ? (
        <MarketplaceMetricsCards 
          metrics={insightsData.overallMetrics}
          timeframe={timeframe}
        />
      ) : (
        <div className="text-center py-4 text-muted-foreground">
          Failed to load metrics data. Please try again.
        </div>
      )}
      
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="sellers">Sellers</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {isLoading ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
          ) : insightsData ? (
            <SalesTrendChart 
              data={insightsData.salesTrends}
              timeframe={timeframe}
              title="Marketplace Sales Trends"
            />
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              Failed to load sales trend data. Please try again.
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {isLoading ? (
              <>
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-48" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-[300px] w-full" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-48" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-[300px] w-full" />
                  </CardContent>
                </Card>
              </>
            ) : insightsData ? (
              <>
                <CategoryPerformanceChart data={insightsData.categoryPerformance} />
                <Card>
                  <CardHeader>
                    <CardTitle>Sales Distribution by Category</CardTitle>
                    <CardDescription>
                      Percentage of total sales by product category
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={formatCategoryDataForPieChart()}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={(entry) => entry.name}
                          >
                            {formatCategoryDataForPieChart().map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={COLORS[index % COLORS.length]} 
                              />
                            ))}
                          </Pie>
                          <Legend />
                          <RechartsTooltip content={<CustomPieTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center py-4 text-muted-foreground col-span-2">
                Failed to load category data. Please try again.
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="categories" className="space-y-6">
          {isLoading ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-72 mt-1" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[400px] w-full" />
              </CardContent>
            </Card>
          ) : insightsData ? (
            <Card>
              <CardHeader>
                <CardTitle>Category Performance</CardTitle>
                <CardDescription>
                  Detailed breakdown of sales and order metrics by product category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CategoryPerformanceChart 
                  data={insightsData.categoryPerformance} 
                  limit={15} 
                />
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              Failed to load category data. Please try again.
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="sellers" className="space-y-6">
          {isLoading ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[400px] w-full" />
              </CardContent>
            </Card>
          ) : insightsData ? (
            <TopSellersTable data={insightsData.topSellers} />
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              Failed to load seller data. Please try again.
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="products" className="space-y-6">
          {isLoading ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[400px] w-full" />
              </CardContent>
            </Card>
          ) : insightsData ? (
            <TopProductsTable data={insightsData.topProducts} />
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              Failed to load product data. Please try again.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MarketplaceInsightsClient;
