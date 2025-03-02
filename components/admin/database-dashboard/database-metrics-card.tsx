'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { AlertCircle, CheckCircle, Clock, Database } from 'lucide-react';

interface MetricsCardProps {
  refreshInterval?: number; // in milliseconds, default 30s
}

type OperationMetrics = {
  operation: string;
  collection: string;
  count: number;
  totalTime: number;
  avgTime: number;
  slowCount: number;
};

type DatabaseMetrics = {
  mongodb: {
    operations: OperationMetrics[];
    totalOperations: number;
    averageResponseTime: number;
    slowOperations: number;
  };
  postgresql: {
    operations: OperationMetrics[];
    totalOperations: number;
    averageResponseTime: number;
    slowOperations: number;
  };
  timeSeriesData: {
    timestamp: string;
    mongodbAvgTime: number;
    postgresqlAvgTime: number;
    mongodbOpCount: number;
    postgresqlOpCount: number;
  }[];
};

const DEFAULT_REFRESH_INTERVAL = 30000; // 30 seconds

export function DatabaseMetricsCard({ refreshInterval = DEFAULT_REFRESH_INTERVAL }: MetricsCardProps) {
  const [metrics, setMetrics] = useState<DatabaseMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/database-metrics');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setMetrics(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Error fetching database metrics:', err);
      setError(err instanceof Error ? err.message : 'Unknown error fetching metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchMetrics();
    
    // Set up interval for refreshing data
    const intervalId = setInterval(fetchMetrics, refreshInterval);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [refreshInterval]);

  // Format time for display
  const formatTime = (ms: number) => {
    if (ms < 1) return '<1ms';
    if (ms < 1000) return `${ms.toFixed(1)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Format date for display
  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Never';
    return lastUpdated.toLocaleTimeString();
  };

  // Prepare chart data for operations by type
  const getOperationTypeData = (database: 'mongodb' | 'postgresql') => {
    if (!metrics) return [];
    
    const operations = metrics[database].operations;
    const operationTypes: Record<string, { count: number; avgTime: number }> = {};
    
    operations.forEach(op => {
      if (!operationTypes[op.operation]) {
        operationTypes[op.operation] = { count: 0, avgTime: 0 };
      }
      operationTypes[op.operation].count += op.count;
      // Weighted average calculation
      const totalTimeContribution = op.count * op.avgTime;
      const newTotalTime = (operationTypes[op.operation].avgTime * operationTypes[op.operation].count) + totalTimeContribution;
      const newCount = operationTypes[op.operation].count + op.count;
      operationTypes[op.operation].avgTime = newTotalTime / newCount;
    });
    
    return Object.entries(operationTypes).map(([operation, stats]) => ({
      operation,
      count: stats.count,
      avgTime: stats.avgTime
    }));
  };

  // Prepare chart data for collections/tables
  const getCollectionData = (database: 'mongodb' | 'postgresql') => {
    if (!metrics) return [];
    
    const operations = metrics[database].operations;
    const collections: Record<string, { count: number; avgTime: number; slowCount: number }> = {};
    
    operations.forEach(op => {
      if (!collections[op.collection]) {
        collections[op.collection] = { count: 0, avgTime: 0, slowCount: 0 };
      }
      collections[op.collection].count += op.count;
      collections[op.collection].slowCount += op.slowCount;
      
      // Weighted average calculation
      const totalTimeContribution = op.count * op.avgTime;
      const newTotalTime = (collections[op.collection].avgTime * collections[op.collection].count) + totalTimeContribution;
      const newCount = collections[op.collection].count + op.count;
      collections[op.collection].avgTime = newTotalTime / newCount;
    });
    
    return Object.entries(collections).map(([collection, stats]) => ({
      collection,
      count: stats.count,
      avgTime: stats.avgTime,
      slowCount: stats.slowCount
    }));
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Performance Metrics
            </CardTitle>
            <CardDescription>
              Monitoring performance of MongoDB and PostgreSQL operations
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Last updated: {formatLastUpdated()}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && !metrics && (
          <div className="py-6 flex flex-col items-center gap-4">
            <Progress value={80} className="w-full" />
            <p className="text-sm text-muted-foreground">Loading database metrics...</p>
          </div>
        )}
        
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {metrics && (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="mongodb">MongoDB</TabsTrigger>
              <TabsTrigger value="postgresql">PostgreSQL</TabsTrigger>
              <TabsTrigger value="timeseries">Time Series</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-lg">MongoDB Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Operations:</span>
                        <span className="font-medium">{metrics.mongodb.totalOperations}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Average Response Time:</span>
                        <span className="font-medium">{formatTime(metrics.mongodb.averageResponseTime)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Slow Operations:</span>
                        <span className="font-medium">
                          {metrics.mongodb.slowOperations} 
                          <span className="text-muted-foreground ml-1">
                            ({Math.round((metrics.mongodb.slowOperations / metrics.mongodb.totalOperations) * 100)}%)
                          </span>
                        </span>
                      </div>
                      <div className="pt-2">
                        <p className="text-sm text-muted-foreground mb-1">Operation Types:</p>
                        <div className="flex flex-wrap gap-2">
                          {getOperationTypeData('mongodb').map((op) => (
                            <Badge key={op.operation} variant="outline">
                              {op.operation}: {op.count}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-lg">PostgreSQL Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Operations:</span>
                        <span className="font-medium">{metrics.postgresql.totalOperations}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Average Response Time:</span>
                        <span className="font-medium">{formatTime(metrics.postgresql.averageResponseTime)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Slow Operations:</span>
                        <span className="font-medium">
                          {metrics.postgresql.slowOperations}
                          <span className="text-muted-foreground ml-1">
                            ({Math.round((metrics.postgresql.slowOperations / metrics.postgresql.totalOperations) * 100)}%)
                          </span>
                        </span>
                      </div>
                      <div className="pt-2">
                        <p className="text-sm text-muted-foreground mb-1">Operation Types:</p>
                        <div className="flex flex-wrap gap-2">
                          {getOperationTypeData('postgresql').map((op) => (
                            <Badge key={op.operation} variant="outline">
                              {op.operation}: {op.count}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-lg">Response Time Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { 
                            name: 'Average Response Time', 
                            MongoDB: metrics.mongodb.averageResponseTime,
                            PostgreSQL: metrics.postgresql.averageResponseTime 
                          }
                        ]}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip formatter={(value) => [`${value.toFixed(2)}ms`, '']} />
                        <Legend />
                        <Bar dataKey="MongoDB" fill="#4f46e5" />
                        <Bar dataKey="PostgreSQL" fill="#0ea5e9" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="mongodb" className="space-y-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-lg">MongoDB Operation Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={getOperationTypeData('mongodb')}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="operation" />
                        <YAxis yAxisId="left" orientation="left" label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                        <YAxis yAxisId="right" orientation="right" label={{ value: 'Avg Time (ms)', angle: 90, position: 'insideRight' }} />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="count" fill="#4f46e5" name="Operation Count" />
                        <Bar yAxisId="right" dataKey="avgTime" fill="#a855f7" name="Avg Response Time (ms)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-lg">MongoDB Collections</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={getCollectionData('mongodb')}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="collection" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#4f46e5" name="Operation Count" />
                        <Bar dataKey="slowCount" fill="#ef4444" name="Slow Operations" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="postgresql" className="space-y-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-lg">PostgreSQL Operation Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={getOperationTypeData('postgresql')}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="operation" />
                        <YAxis yAxisId="left" orientation="left" label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                        <YAxis yAxisId="right" orientation="right" label={{ value: 'Avg Time (ms)', angle: 90, position: 'insideRight' }} />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="count" fill="#0ea5e9" name="Operation Count" />
                        <Bar yAxisId="right" dataKey="avgTime" fill="#ec4899" name="Avg Response Time (ms)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-lg">PostgreSQL Tables</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={getCollectionData('postgresql')}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="collection" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#0ea5e9" name="Operation Count" />
                        <Bar dataKey="slowCount" fill="#ef4444" name="Slow Operations" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="timeseries" className="space-y-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-lg">Response Time Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={metrics.timeSeriesData}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="timestamp" />
                        <YAxis label={{ value: 'Response Time (ms)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="mongodbAvgTime" stroke="#4f46e5" name="MongoDB Avg Time" />
                        <Line type="monotone" dataKey="postgresqlAvgTime" stroke="#0ea5e9" name="PostgreSQL Avg Time" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-lg">Operation Count Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={metrics.timeSeriesData}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="timestamp" />
                        <YAxis label={{ value: 'Operation Count', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="mongodbOpCount" stroke="#4f46e5" name="MongoDB Operations" />
                        <Line type="monotone" dataKey="postgresqlOpCount" stroke="#0ea5e9" name="PostgreSQL Operations" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
