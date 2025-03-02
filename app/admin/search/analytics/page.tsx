"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/layouts/admin-layout";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, AlertTriangle } from "lucide-react";

interface SearchAnalytics {
  popularSearches: {
    query: string;
    count: number;
    uniqueUsers: number;
  }[];
  zeroResultSearches: {
    query: string;
    count: number;
  }[];
  popularProducts: {
    id: string;
    title: string;
    count: number;
  }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'];

export default function SearchAnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<SearchAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState("7");
  
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);
  
  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`/api/marketplace/search/analytics?days=${timeframe}`);
      setAnalytics(response.data);
    } catch (error: any) {
      console.error("Failed to fetch search analytics:", error);
      setError(error.response?.data?.error || "Failed to fetch search analytics");
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    if (session) {
      fetchAnalytics();
    }
  }, [session, timeframe]);
  
  // Transform popular searches for chart
  const getPopularSearchesChart = () => {
    if (!analytics?.popularSearches) return [];
    
    // Take top 10 for chart
    return analytics.popularSearches
      .slice(0, 10)
      .map((item) => ({
        name: item.query.length > 15 ? item.query.substring(0, 15) + "..." : item.query,
        searches: item.count,
        users: item.uniqueUsers,
      }));
  };
  
  // Transform zero result searches for pie chart
  const getZeroResultPieChart = () => {
    if (!analytics?.zeroResultSearches) return [];
    
    // Take top 5 for pie chart and combine the rest
    const topFive = analytics.zeroResultSearches.slice(0, 5);
    const restCount = analytics.zeroResultSearches
      .slice(5)
      .reduce((sum, item) => sum + item.count, 0);
    
    const result = topFive.map((item) => ({
      name: item.query,
      value: item.count,
    }));
    
    if (restCount > 0) {
      result.push({
        name: "Others",
        value: restCount,
      });
    }
    
    return result;
  };
  
  if (status === "loading" || isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }
  
  if (error) {
    return (
      <AdminLayout>
        <div className="rounded-md bg-red-50 p-4 my-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }
  
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Search Analytics</h1>
          
          <Select 
            value={timeframe} 
            onValueChange={setTimeframe}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24 Hours</SelectItem>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {!analytics ? (
          <div className="rounded-md bg-blue-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  No search analytics data is available yet.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="popular">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="popular">Popular Searches</TabsTrigger>
              <TabsTrigger value="zero-results">Zero Results</TabsTrigger>
              <TabsTrigger value="product-clicks">Product Clicks</TabsTrigger>
            </TabsList>
            
            {/* Popular Searches */}
            <TabsContent value="popular" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Search Queries</CardTitle>
                  <CardDescription>
                    The most popular search terms used by your marketplace users.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={getPopularSearchesChart()}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 20,
                          bottom: 60,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45} 
                          textAnchor="end"
                          height={70}
                        />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="searches" name="Total Searches" fill="#8884d8" />
                        <Bar dataKey="users" name="Unique Users" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Popular Search Queries</CardTitle>
                  <CardDescription>
                    Detailed breakdown of the most searched terms
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Search Query</TableHead>
                        <TableHead className="text-right">Searches</TableHead>
                        <TableHead className="text-right">Unique Users</TableHead>
                        <TableHead className="text-right">Engagement</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.popularSearches.map((item, index) => (
                        <TableRow key={`popular-${index}`}>
                          <TableCell className="font-medium">{item.query}</TableCell>
                          <TableCell className="text-right">{item.count}</TableCell>
                          <TableCell className="text-right">{item.uniqueUsers}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={
                              item.count / item.uniqueUsers > 2 
                                ? "success" 
                                : item.count / item.uniqueUsers > 1.2 
                                ? "default" 
                                : "secondary"
                            }>
                              {(item.count / item.uniqueUsers).toFixed(1)}x
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Zero Results */}
            <TabsContent value="zero-results" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Zero Results Distribution</CardTitle>
                    <CardDescription>
                      Searches that returned no results
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={getZeroResultPieChart()}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => 
                              `${name}: ${(percent * 100).toFixed(0)}%`
                            }
                          >
                            {getZeroResultPieChart().map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Improvement Opportunities</CardTitle>
                    <CardDescription>
                      Address these searches to improve user experience
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-8">
                      {analytics.zeroResultSearches.slice(0, 3).map((item, index) => (
                        <div key={`opportunity-${index}`} className="flex items-start">
                          <div className="mr-4 flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
                            <Search className="h-4 w-4 text-red-600" />
                          </div>
                          <div>
                            <p className="font-medium">"{item.query}"</p>
                            <p className="text-sm text-gray-500">
                              {item.count} users searched for this with no results
                            </p>
                            <p className="mt-1 text-sm">
                              <span className="font-medium">Recommendation:</span> Consider adding products or content related to this search term.
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>All Zero Result Searches</CardTitle>
                  <CardDescription>
                    Searches that did not return any results
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Search Query</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                        <TableHead>Suggested Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.zeroResultSearches.map((item, index) => (
                        <TableRow key={`zero-${index}`}>
                          <TableCell className="font-medium">{item.query}</TableCell>
                          <TableCell className="text-right">{item.count}</TableCell>
                          <TableCell>
                            {item.count > 10 ? (
                              <Badge variant="destructive">High Priority</Badge>
                            ) : item.count > 5 ? (
                              <Badge variant="default">Medium Priority</Badge>
                            ) : (
                              <Badge variant="secondary">Low Priority</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Product Clicks */}
            <TabsContent value="product-clicks" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Most Clicked Products</CardTitle>
                  <CardDescription>
                    Products that receive the most clicks from search results
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analytics.popularProducts.slice(0, 10).map(item => ({
                          name: item.title.length > 20 ? item.title.substring(0, 20) + "..." : item.title,
                          clicks: item.count
                        }))}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 20,
                          bottom: 60,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45} 
                          textAnchor="end"
                          height={70}
                        />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="clicks" fill="#82ca9d" name="Clicks" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Product Click Details</CardTitle>
                  <CardDescription>
                    Detailed breakdown of search-to-product engagement
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Clicks</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.popularProducts.map((product, index) => (
                        <TableRow key={`product-${index}`}>
                          <TableCell className="font-medium">
                            {product.title}
                          </TableCell>
                          <TableCell className="text-right">{product.count}</TableCell>
                          <TableCell>
                            <a 
                              href={`/marketplace/product/${product.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm"
                            >
                              View Product
                            </a>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AdminLayout>
  );
}
