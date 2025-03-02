"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb";
import { SelectValue, SelectTrigger, SelectContent, SelectItem, Select } from "@/components/ui/select";
import { format, subDays, startOfDay, endOfDay, subMonths } from "date-fns";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";
import SellerSalesChart from "@/components/marketplace/dashboard/SellerSalesChart";
import SellerOrdersTable from "@/components/marketplace/dashboard/SellerOrdersTable";
import TopProductsChart from "@/components/marketplace/dashboard/TopProductsChart";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/marketplace-utils";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface DashboardData {
  totalSales: number;
  salesCount: number;
  averageOrderValue: number;
  pendingOrdersCount: number;
  salesByDate: {
    date: string;
    amount: number;
    count: number;
  }[];
  topProducts: {
    id: string;
    name: string;
    totalSales: number;
    quantitySold: number;
    image: string | null;
  }[];
  recentOrders: any[];
}

export default function SellerDashboardPage() {
  const { data: session, status } = useSession();
  const [timeframe, setTimeframe] = useState("30days");
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login?callbackUrl=/marketplace/seller/dashboard");
    }

    if (status === "authenticated") {
      fetchDashboardData();
    }
  }, [status, timeframe]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/marketplace/analytics/seller-dashboard?timeframe=${timeframe}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }
      
      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeframeLabel = () => {
    switch (timeframe) {
      case "7days":
        return "Last 7 Days";
      case "30days":
        return "Last 30 Days";
      case "90days":
        return "Last 90 Days";
      case "year":
        return "Last Year";
      default:
        return "Last 30 Days";
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Breadcrumb className="mb-6">
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink href="/marketplace">Marketplace</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          <BreadcrumbLink>Seller Dashboard</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Seller Dashboard</h1>
        <div className="flex items-center">
          <Select
            value={timeframe}
            onValueChange={setTimeframe}
          >
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
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : dashboardData ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Sales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(dashboardData.totalSales)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {getTimeframeLabel()}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardData.salesCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {getTimeframeLabel()}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Average Order Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(dashboardData.averageOrderValue)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {getTimeframeLabel()}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardData.pendingOrdersCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Require action
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sales Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <SellerSalesChart 
                    salesData={dashboardData.salesByDate} 
                    timeframe={timeframe} 
                  />
                </CardContent>
              </Card>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Products</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TopProductsChart products={dashboardData.topProducts} />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Orders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SellerOrdersTable 
                      orders={dashboardData.recentOrders.slice(0, 5)} 
                      isRecent={true} 
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="orders" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>All Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <SellerOrdersTable 
                    orders={dashboardData.recentOrders} 
                    isRecent={false} 
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="products" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Product Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <TopProductsChart 
                    products={dashboardData.topProducts} 
                    showTable={true} 
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <div className="text-center py-12">
          <p>Failed to load dashboard data. Please try again later.</p>
        </div>
      )}
    </div>
  );
}
