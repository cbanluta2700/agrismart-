'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  AlertCircle, 
  Clock, 
  PieChart, 
  BarChart4, 
  Database,
  Activity
} from 'lucide-react';

interface ConnectionStatusCardProps {
  refreshInterval?: number; // in milliseconds, default 60s
  onCheckNow?: () => void;
}

type PoolStats = {
  connected: boolean;
  poolSize: number;
  availableConnections: number;
  maxPoolSize: number;
  minPoolSize: number;
};

type ConnectionStatus = {
  mongodb: {
    status: 'connected' | 'disconnected' | 'error';
    responseTime: number;
    error?: string;
    lastChecked: string;
    poolStats: PoolStats;
  };
  postgresql: {
    status: 'connected' | 'disconnected' | 'error';
    responseTime: number;
    error?: string;
    lastChecked: string;
  };
  monitoringEnabled: boolean;
  checkInterval: number;
};

const DEFAULT_REFRESH_INTERVAL = 60000; // 60 seconds

export function ConnectionStatusCard({ 
  refreshInterval = DEFAULT_REFRESH_INTERVAL,
  onCheckNow
}: ConnectionStatusCardProps) {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const fetchConnectionStatus = async () => {
    try {
      setIsChecking(true);
      const response = await fetch('/api/admin/database-status');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch connection status: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setStatus(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Error fetching connection status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error fetching connection status');
    } finally {
      setLoading(false);
      setIsChecking(false);
    }
  };

  const handleCheckNow = async () => {
    await fetchConnectionStatus();
    if (onCheckNow) onCheckNow();
  };

  const toggleMonitoring = async (enabled: boolean) => {
    try {
      setIsChecking(true);
      const response = await fetch('/api/admin/database-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ monitoringEnabled: enabled }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update monitoring settings: ${response.status} ${response.statusText}`);
      }
      
      await fetchConnectionStatus();
    } catch (err) {
      console.error('Error updating monitoring settings:', err);
      setError(err instanceof Error ? err.message : 'Unknown error updating monitoring settings');
    } finally {
      setIsChecking(false);
    }
  };

  const updateCheckInterval = async (intervalMs: number) => {
    try {
      setIsChecking(true);
      const response = await fetch('/api/admin/database-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ checkInterval: intervalMs }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update check interval: ${response.status} ${response.statusText}`);
      }
      
      await fetchConnectionStatus();
    } catch (err) {
      console.error('Error updating check interval:', err);
      setError(err instanceof Error ? err.message : 'Unknown error updating check interval');
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchConnectionStatus();
    
    // Set up interval for refreshing data
    const intervalId = setInterval(fetchConnectionStatus, refreshInterval);
    
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

  // Get status badge
  const getStatusBadge = (status: 'connected' | 'disconnected' | 'error') => {
    switch (status) {
      case 'connected':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Connected
          </Badge>
        );
      case 'disconnected':
        return (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Disconnected
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Error
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Database Connection Status
            </CardTitle>
            <CardDescription>
              Monitor connection health for MongoDB and PostgreSQL
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Last checked: {formatLastUpdated()}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && !status && (
          <div className="py-6 flex flex-col items-center gap-4">
            <Progress value={80} className="w-full" />
            <p className="text-sm text-muted-foreground">Checking database connections...</p>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {status && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* MongoDB Status */}
              <Card>
                <CardHeader className="py-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      MongoDB
                    </CardTitle>
                    {getStatusBadge(status.mongodb.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Response Time:</span>
                      <span className="font-medium">{formatTime(status.mongodb.responseTime)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Last Checked:</span>
                      <span className="font-medium">{status.mongodb.lastChecked}</span>
                    </div>
                    
                    {/* Connection Pool Statistics */}
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold mb-2">Connection Pool</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Current Size:</span>
                          <span className="font-medium">{status.mongodb.poolStats.poolSize}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Available Connections:</span>
                          <span className="font-medium">{status.mongodb.poolStats.availableConnections}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Configuration:</span>
                          <span className="font-medium">
                            {status.mongodb.poolStats.minPoolSize}-{status.mongodb.poolStats.maxPoolSize}
                          </span>
                        </div>
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground mb-1">Pool Utilization:</p>
                          <Progress 
                            value={Math.min(100, (status.mongodb.poolStats.poolSize / status.mongodb.poolStats.maxPoolSize) * 100)} 
                            className="h-2"
                          />
                        </div>
                      </div>
                    </div>

                    {status.mongodb.error && (
                      <Alert variant="destructive" className="mt-3">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Connection Error</AlertTitle>
                        <AlertDescription className="text-xs">{status.mongodb.error}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* PostgreSQL Status */}
              <Card>
                <CardHeader className="py-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      PostgreSQL
                    </CardTitle>
                    {getStatusBadge(status.postgresql.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Response Time:</span>
                      <span className="font-medium">{formatTime(status.postgresql.responseTime)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Last Checked:</span>
                      <span className="font-medium">{status.postgresql.lastChecked}</span>
                    </div>

                    {status.postgresql.error && (
                      <Alert variant="destructive" className="mt-3">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Connection Error</AlertTitle>
                        <AlertDescription className="text-xs">{status.postgresql.error}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Monitoring Settings */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-lg">Monitoring Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Auto-Check Interval:</span>
                      <span className="text-sm text-muted-foreground">
                        {(status.checkInterval / 1000).toFixed(0)} seconds
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Monitoring Status:</span>
                      <Badge 
                        className={status.monitoringEnabled 
                          ? "bg-green-100 text-green-800 hover:bg-green-100" 
                          : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                        }
                      >
                        {status.monitoringEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex-1" />
                  
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => toggleMonitoring(!status.monitoringEnabled)}
                      disabled={isChecking}
                    >
                      {status.monitoringEnabled ? 'Disable' : 'Enable'} Auto-Check
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => updateCheckInterval(30000)}
                      disabled={isChecking || status.checkInterval === 30000}
                    >
                      Set 30s Interval
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => updateCheckInterval(60000)}
                      disabled={isChecking || status.checkInterval === 60000}
                    >
                      Set 1m Interval
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => updateCheckInterval(300000)}
                      disabled={isChecking || status.checkInterval === 300000}
                    >
                      Set 5m Interval
                    </Button>
                    
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={handleCheckNow}
                      disabled={isChecking}
                      className="ml-1"
                    >
                      <RefreshCw className={`h-4 w-4 mr-1 ${isChecking ? 'animate-spin' : ''}`} />
                      Check Now
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
