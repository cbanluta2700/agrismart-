'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeftIcon,
  CheckCircle,
  Database,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

type MigrationStatus = 'idle' | 'running' | 'completed' | 'error';

interface MigrationProgress {
  totalConversations: number;
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
  currentBatch: number;
  totalBatches: number;
  elapsedTime: number;
  estimatedTimeRemaining: number | null;
}

interface MigrationConfig {
  batchSize: number;
  concurrentBatches: number;
  skipExisting: boolean;
  dryRun: boolean;
  verbose: boolean;
}

const DEFAULT_CONFIG: MigrationConfig = {
  batchSize: 50,
  concurrentBatches: 5,
  skipExisting: true,
  dryRun: false,
  verbose: true,
};

const ErrorDetails = ({ errorSummary, failedConversations }) => {
  const [expanded, setExpanded] = useState(false);

  if (!errorSummary || Object.keys(errorSummary).length === 0) {
    return null;
  }

  return (
    <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
      <div className="flex justify-between items-center">
        <h3 className="text-red-800 font-medium">Error Summary</h3>
        <button 
          onClick={() => setExpanded(!expanded)}
          className="text-red-700 hover:text-red-900"
        >
          {expanded ? 'Hide Details' : 'Show Details'}
        </button>
      </div>
      
      <div className="mt-2">
        {Object.entries(errorSummary).map(([type, count]) => (
          <div key={type} className="flex justify-between text-sm">
            <span className="text-red-700">{type.replace('_', ' ')}:</span>
            <span className="font-medium">{count}</span>
          </div>
        ))}
      </div>
      
      {expanded && failedConversations && failedConversations.length > 0 && (
        <div className="mt-3 border-t border-red-200 pt-3">
          <h4 className="text-sm font-medium text-red-800 mb-2">Failed Conversations:</h4>
          <div className="max-h-40 overflow-y-auto text-xs">
            {failedConversations.map(id => (
              <div key={id} className="mb-1 text-red-600">{id}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function MigrationPage() {
  const [status, setStatus] = useState<MigrationStatus>('idle');
  const [config, setConfig] = useState<MigrationConfig>(DEFAULT_CONFIG);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [errorSummary, setErrorSummary] = useState({});
  const [failedConversations, setFailedConversations] = useState([]);

  // Simulate checking pre-existing migration status on component mount
  useEffect(() => {
    const checkMigrationStatus = async () => {
      try {
        const response = await fetch('/api/admin/migration-status');
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'running') {
            setStatus('running');
            setProgress(data.progress);
            setLogs(data.logs || []);
          }
        }
      } catch (err) {
        console.error('Error checking migration status:', err);
      }
    };

    checkMigrationStatus();
  }, []);

  // Polling for progress updates when migration is running
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (status === 'running') {
      intervalId = setInterval(async () => {
        try {
          const response = await fetch('/api/admin/migration-status');
          if (response.ok) {
            const data = await response.json();
            setProgress(data.progress);
            setLogs(data.logs || []);

            // Update status if migration completed or errored
            if (data.status !== 'running') {
              setStatus(data.status);
              if (data.status === 'error' && data.error) {
                setError(data.error);
              }
              if (data.errorSummary) {
                setErrorSummary(data.errorSummary);
              }
              if (data.failedConversations) {
                setFailedConversations(data.failedConversations);
              }
            }
          }
        } catch (err) {
          console.error('Error polling migration status:', err);
        }
      }, 2000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [status]);

  const startMigration = async () => {
    setStatus('running');
    setError(null);
    setLogs([]);
    setErrorSummary({});
    setFailedConversations([]);
    
    try {
      const response = await fetch('/api/admin/start-migration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start migration');
      }

      const data = await response.json();
      setProgress(data.progress);
      setLogs(data.logs || []);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unknown error starting migration');
    }
  };

  const cancelMigration = async () => {
    try {
      await fetch('/api/admin/cancel-migration', { method: 'POST' });
      setStatus('idle');
    } catch (err) {
      console.error('Error canceling migration:', err);
    }
  };

  const retryFailedConversations = async () => {
    try {
      await fetch('/api/admin/retry-failed-conversations', { method: 'POST' });
      setStatus('running');
    } catch (err) {
      console.error('Error retrying failed conversations:', err);
    }
  };

  const formatTime = (ms: number | null): string => {
    if (ms === null) return 'Calculating...';
    
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getProgressPercentage = (): number => {
    if (!progress || progress.totalConversations === 0) return 0;
    return Math.min(100, Math.round((progress.processed / progress.totalConversations) * 100));
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/admin/database">
            <Button variant="ghost" size="icon">
              <ArrowLeftIcon className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Migrate KV to MongoDB</h1>
        </div>
        <Badge 
          variant={
            status === 'idle' ? 'outline' : 
            status === 'running' ? 'secondary' : 
            status === 'completed' ? 'default' : 
            'destructive'
          }
          className="px-3 py-1"
        >
          {status === 'idle' && 'Ready'}
          {status === 'running' && 'Running'}
          {status === 'completed' && 'Completed'}
          {status === 'error' && 'Error'}
        </Badge>
      </div>

      <p className="text-muted-foreground">
        Transfer chat conversations from Vercel KV to MongoDB with options for batch processing and error handling.
      </p>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Migration Configuration</CardTitle>
            <CardDescription>Configure how the migration process runs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="batch-size">Batch Size: {config.batchSize}</Label>
              </div>
              <Slider 
                id="batch-size"
                value={[config.batchSize]} 
                min={10} 
                max={200} 
                step={10}
                disabled={status === 'running'}
                onValueChange={(value) => setConfig({...config, batchSize: value[0]})}
              />
              <p className="text-xs text-muted-foreground">
                Number of conversations to process in each batch (10-200)
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="concurrent-batches">Concurrent Batches: {config.concurrentBatches}</Label>
              </div>
              <Slider 
                id="concurrent-batches"
                value={[config.concurrentBatches]} 
                min={1} 
                max={10} 
                step={1}
                disabled={status === 'running'}
                onValueChange={(value) => setConfig({...config, concurrentBatches: value[0]})}
              />
              <p className="text-xs text-muted-foreground">
                Number of batches to process simultaneously (1-10)
              </p>
            </div>

            <div className="flex items-center justify-between space-x-2 pt-2">
              <Label htmlFor="skip-existing" className="cursor-pointer">Skip Existing Documents</Label>
              <Switch 
                id="skip-existing" 
                checked={config.skipExisting}
                disabled={status === 'running'}
                onCheckedChange={(checked) => setConfig({...config, skipExisting: checked})}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Skip conversations that already exist in MongoDB
            </p>
            
            <div className="flex items-center justify-between space-x-2 pt-2">
              <Label htmlFor="dry-run" className="cursor-pointer">Dry Run Mode</Label>
              <Switch 
                id="dry-run" 
                checked={config.dryRun}
                disabled={status === 'running'}
                onCheckedChange={(checked) => setConfig({...config, dryRun: checked})}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Simulate migration without writing to MongoDB
            </p>
            
            <div className="flex items-center justify-between space-x-2 pt-2">
              <Label htmlFor="verbose" className="cursor-pointer">Verbose Logging</Label>
              <Switch 
                id="verbose" 
                checked={config.verbose}
                disabled={status === 'running'}
                onCheckedChange={(checked) => setConfig({...config, verbose: checked})}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Show detailed logs during migration
            </p>

            {status === 'idle' && (
              <Button 
                className="w-full mt-4" 
                onClick={startMigration}
              >
                <Database className="mr-2 h-4 w-4" />
                Start Migration
              </Button>
            )}

            {status === 'running' && (
              <Button 
                className="w-full mt-4" 
                variant="destructive"
                onClick={cancelMigration}
              >
                Cancel Migration
              </Button>
            )}

            {(status === 'completed' || status === 'error') && (
              <Button 
                className="w-full mt-4" 
                variant="secondary"
                onClick={() => setStatus('idle')}
              >
                Reset
              </Button>
            )}
            
            {(status === 'error' && failedConversations.length > 0) && (
              <Button 
                className="w-full mt-4" 
                variant="secondary"
                onClick={retryFailedConversations}
              >
                Retry Failed Conversations
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Progress and Logs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress Card */}
          <Card>
            <CardHeader>
              <CardTitle>Migration Progress</CardTitle>
              <CardDescription>Current status and progress of the migration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!progress && status === 'idle' && (
                <div className="flex flex-col items-center justify-center py-8">
                  <Database className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">Ready to Start Migration</p>
                  <p className="text-sm text-muted-foreground">
                    Configure your settings and click "Start Migration"
                  </p>
                </div>
              )}

              {status === 'running' && progress && (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Progress: {getProgressPercentage()}%</span>
                      <span className="text-sm font-medium">
                        {progress.processed} / {progress.totalConversations}
                      </span>
                    </div>
                    <Progress value={getProgressPercentage()} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Processed</span>
                      <p className="text-lg font-medium">{progress.processed}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Successful</span>
                      <p className="text-lg font-medium text-green-600">{progress.successful}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Failed</span>
                      <p className="text-lg font-medium text-red-600">{progress.failed}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Skipped</span>
                      <p className="text-lg font-medium text-amber-600">{progress.skipped}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Elapsed Time</span>
                      <p className="text-lg font-medium">{formatTime(progress.elapsedTime)}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Estimated Time Remaining</span>
                      <p className="text-lg font-medium">{formatTime(progress.estimatedTimeRemaining)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Current Batch</span>
                      <p className="text-lg font-medium">{progress.currentBatch} / {progress.totalBatches}</p>
                    </div>
                  </div>
                </>
              )}

              {status === 'completed' && (
                <div className="flex items-center space-x-4 bg-green-50 dark:bg-green-950 p-4 rounded-md">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div>
                    <h3 className="font-medium">Migration Completed Successfully</h3>
                    <p className="text-sm text-muted-foreground">
                      All data has been transferred to MongoDB
                    </p>
                  </div>
                </div>
              )}

              {status === 'error' && !progress && (
                <div className="flex items-center space-x-4 bg-red-50 dark:bg-red-950 p-4 rounded-md">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                  <div>
                    <h3 className="font-medium">Migration Failed</h3>
                    <p className="text-sm text-muted-foreground">
                      An error occurred during the migration process
                    </p>
                  </div>
                </div>
              )}
              
              {status === 'error' && errorSummary && Object.keys(errorSummary).length > 0 && (
                <ErrorDetails 
                  errorSummary={errorSummary}
                  failedConversations={failedConversations}
                />
              )}
            </CardContent>
          </Card>

          {/* Log Console */}
          <Card>
            <CardHeader>
              <CardTitle>Migration Logs</CardTitle>
              <CardDescription>Live updates from the migration process</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-950 text-slate-50 rounded-md p-4 font-mono text-sm h-[400px] overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="text-slate-400 italic">No logs yet. Start the migration to see logs.</div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="pb-1">
                      <span className="opacity-50">[{new Date().toLocaleTimeString()}]</span> {log}
                    </div>
                  ))
                )}
                {status === 'running' && (
                  <div className="flex items-center pt-2 text-blue-400">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span>Migration in progress...</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
