// Shared migration state that can be imported across API routes
// This file maintains the state of the current or most recent migration process

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
  speed?: number; // conversations processed per second
}

interface ErrorSummary {
  [errorType: string]: number; // Maps error type to count
}

interface MigrationState {
  status: 'idle' | 'running' | 'completed' | 'cancelled' | 'error';
  progress: MigrationProgress;
  error: string | null;
  logs: string[];
  startTime: Date | null;
  endTime: Date | null;
  errorSummary?: ErrorSummary;
  failedConversations?: string[]; // List of conversation IDs that failed to migrate
  jobId?: string; // Unique identifier for the current migration job
  config?: {
    batchSize: number;
    limit?: number;
    options: string[];
  };
}

// Initialize with default values
const migrationState: MigrationState = {
  status: 'idle',
  progress: {
    totalConversations: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    currentBatch: 0,
    totalBatches: 0,
    elapsedTime: 0,
    estimatedTimeRemaining: null,
  },
  error: null,
  logs: [],
  startTime: null,
  endTime: null,
  errorSummary: {},
  failedConversations: [],
};

export default migrationState;
