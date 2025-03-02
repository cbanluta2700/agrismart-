"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { AdminLayout } from "@/components/layouts/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from "recharts";
import axios from "axios";
import { format, subDays } from "date-fns";
import { Download, AlertTriangle } from "lucide-react";

// Mock data for now - in production, this would come from the API
const MOCK_RATING_DISTRIBUTION = [
  { name: "5 Stars", value: 43 },
  { name: "4 Stars", value: 31 },
  { name: "3 Stars", value: 16 },
  { name: "2 Stars", value: 6 },
  { name: "1 Star", value: 4 },
];

const MOCK_MODERATION_STATUS = [
  { name: "Approved", value: 78 },
  { name: "Pending", value: 14 },
  { name: "Rejected", value: 5 },
  { name: "Flagged", value: 3 },
];

const MOCK_RECENT_REVIEWS = Array.from({ length: 14 }, (_, i) => {
  const date = subDays(new Date(), i);
  return {
    date: format(date, "MMM dd"),
    count: Math.floor(Math.random() * 10) + 1
  };
}).reverse();

const MOCK_REPORT_REASONS = [
  { name: "Inappropriate", value: 42 },
  { name: "Spam", value: 27 },
  { name: "False Information", value: 18 },
  { name: "Off-topic", value: 13 },
];

// Colors for charts
const COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function ReviewAnalyticsPage() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);
  
  // Simulate loading data
  useEffect(() => {
    if (status === "authenticated") {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [status]);
  
  // Redirect if not authenticated
  if (status === "unauthenticated") {
    redirect("/auth/signin?callbackUrl=/admin/reviews/analytics");
  }
  
  const handleExportData = () => {
    // In a real app, this would trigger a CSV export
    alert("This would export the analytics data as CSV in a real implementation");
  };
  
  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Review Analytics</h1>
            <p className="text-muted-foreground mt-2">
              Metrics and insights about user-generated reviews
            </p>
          </div>
          
          <Button 
            variant="outline" 
            className="mt-4 md:mt-0"
            onClick={handleExportData}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-[60vh]">
            <Spinner size="lg" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="ratings">Ratings</TabsTrigger>
              <TabsTrigger value="moderation">Moderation</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-2xl">243</CardTitle>
                    <CardDescription>Total Reviews</CardDescription>
                  </CardHeader>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-2xl">4.2</CardTitle>
                    <CardDescription>Average Rating</CardDescription>
                  </CardHeader>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-2xl">14</CardTitle>
                    <CardDescription>Pending Moderation</CardDescription>
                  </CardHeader>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-2xl">8</CardTitle>
                    <CardDescription>Flagged Reviews</CardDescription>
                  </CardHeader>
                </Card>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="h-[400px]">
                  <CardHeader>
                    <CardTitle>Recent Reviews</CardTitle>
                    <CardDescription>Daily review count for the last 14 days</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={MOCK_RECENT_REVIEWS}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="count" 
                          name="Reviews" 
                          stroke="#4f46e5" 
                          activeDot={{ r: 8 }} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                
                <Card className="h-[400px]">
                  <CardHeader>
                    <CardTitle>Rating Distribution</CardTitle>
                    <CardDescription>Distribution of review ratings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={MOCK_RATING_DISTRIBUTION}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {MOCK_RATING_DISTRIBUTION.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="ratings" className="space-y-6">
              <Card className="h-[500px]">
                <CardHeader>
                  <CardTitle>Rating Distribution</CardTitle>
                  <CardDescription>Detailed breakdown of review ratings</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={MOCK_RATING_DISTRIBUTION}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" name="Reviews" fill="#4f46e5" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Rated Products</CardTitle>
                    <CardDescription>Products with highest average ratings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-20">
                      <p className="text-muted-foreground">
                        Product-specific data will be available in the full implementation
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Most Reviewed Products</CardTitle>
                    <CardDescription>Products with the most reviews</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-20">
                      <p className="text-muted-foreground">
                        Product-specific data will be available in the full implementation
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="moderation" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="h-[400px]">
                  <CardHeader>
                    <CardTitle>Moderation Status</CardTitle>
                    <CardDescription>Distribution of review moderation statuses</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={MOCK_MODERATION_STATUS}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {MOCK_MODERATION_STATUS.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                
                <Card className="h-[400px]">
                  <CardHeader>
                    <CardTitle>Moderation Timeline</CardTitle>
                    <CardDescription>Average time to moderate reviews</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center h-[300px]">
                      <div className="text-center">
                        <h3 className="text-3xl font-bold">2.4 hours</h3>
                        <p className="text-muted-foreground mt-2">Average moderation time</p>
                        
                        <p className="mt-6 text-sm text-muted-foreground">
                          Detailed timeline data will be available in the full implementation
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Moderation Efficiency</CardTitle>
                  <CardDescription>Moderator performance and issue resolution</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-20">
                    <AlertTriangle className="h-8 w-8 mx-auto text-yellow-500 mb-4" />
                    <p className="text-muted-foreground">
                      This feature requires additional data collection.
                      <br />
                      Moderator performance tracking will be implemented in a future update.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="reports" className="space-y-6">
              <Card className="h-[500px]">
                <CardHeader>
                  <CardTitle>Report Reasons</CardTitle>
                  <CardDescription>Distribution of reasons for reported reviews</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={MOCK_REPORT_REASONS}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" name="Reports" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Report Resolution</CardTitle>
                  <CardDescription>Status of reported reviews and resolution actions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-20">
                    <p className="text-muted-foreground">
                      Detailed report resolution data will be available in the full implementation
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AdminLayout>
  );
}
