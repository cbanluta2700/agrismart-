'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConnectionStatusCard, DatabaseMetricsCard } from '@/components/admin/database-dashboard';
import { AlertCircle, ArrowLeftIcon, RefreshCw, Database, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function DatabaseDashboardPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefreshAll = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeftIcon className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Database Dashboard</h1>
        </div>
        <div className="flex justify-between items-center">
          <Button onClick={handleRefreshAll} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh All
          </Button>
          <Link href="/admin/database/migrate">
            <Button className="flex items-center gap-2 ml-2">
              <Database className="h-4 w-4" />
              <span>Migrate KV to MongoDB</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <p className="text-muted-foreground">
        Monitor and manage the hybrid database architecture for the AgriSmart platform.
      </p>

      <div className="grid grid-cols-1 gap-6">
        {/* Connection Status Section */}
        <ConnectionStatusCard 
          key={`conn-${refreshKey}`} 
          refreshInterval={60000} 
          onCheckNow={handleRefreshAll}
        />
        
        {/* Performance Metrics Section */}
        <DatabaseMetricsCard 
          key={`metrics-${refreshKey}`} 
          refreshInterval={30000}
        />
        
        {/* Monitoring Tools Section */}
        <Card>
          <CardHeader>
            <CardTitle>Database Management Tools</CardTitle>
            <CardDescription>Tools for managing and optimizing database operations</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="migration">
              <TabsList className="mb-4">
                <TabsTrigger value="migration">Migration</TabsTrigger>
                <TabsTrigger value="optimization">Optimization</TabsTrigger>
                <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              </TabsList>
              
              <TabsContent value="migration">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-base">Migrate KV to MongoDB</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">
                          Transfer chat conversations from Vercel KV to MongoDB.
                        </p>
                        <Button asChild variant="secondary" size="sm">
                          <Link href="/admin/database/migrate">Run Migration</Link>
                        </Button>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-base">Export Data</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">
                          Export database data to JSON or CSV format.
                        </p>
                        <Button asChild variant="secondary" size="sm">
                          <Link href="/admin/database/export">Export Data</Link>
                        </Button>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-base">Import Data</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">
                          Import data from external sources or backups.
                        </p>
                        <Button asChild variant="secondary" size="sm">
                          <Link href="/admin/database/import">Import Data</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="optimization">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-base">MongoDB Indexes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">
                          Manage MongoDB collection indexes for optimal performance.
                        </p>
                        <Button asChild variant="secondary" size="sm">
                          <Link href="/admin/database/mongodb-indexes">Manage Indexes</Link>
                        </Button>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-base">Query Analyzer</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">
                          Analyze and optimize slow database queries.
                        </p>
                        <Button asChild variant="secondary" size="sm">
                          <Link href="/admin/database/query-analyzer">Analyze Queries</Link>
                        </Button>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-base">Pool Configuration</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">
                          Configure MongoDB connection pool settings.
                        </p>
                        <Button asChild variant="secondary" size="sm">
                          <Link href="/admin/database/pool-config">Configure Pool</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="maintenance">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-base">Backup Database</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">
                          Create backups of MongoDB and PostgreSQL data.
                        </p>
                        <Button asChild variant="secondary" size="sm">
                          <Link href="/admin/database/backup">Backup Now</Link>
                        </Button>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-base">Database Cleanup</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">
                          Remove old or redundant data from databases.
                        </p>
                        <Button asChild variant="secondary" size="sm">
                          <Link href="/admin/database/cleanup">Run Cleanup</Link>
                        </Button>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-base">Restore Data</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">
                          Restore data from previous backups.
                        </p>
                        <Button asChild variant="secondary" size="sm">
                          <Link href="/admin/database/restore">Restore Data</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
