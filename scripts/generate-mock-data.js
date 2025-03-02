/**
 * Mock Data Generator for AgriSmart Platform
 * 
 * This script generates mock data for demonstration purposes for the
 * database migration system and related admin interfaces.
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Create directory if it doesn't exist
const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Save JSON data to a file
const saveJsonToFile = (filename, data) => {
  ensureDirectoryExists(path.dirname(filename));
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  console.log(`✅ Generated: ${filename}`);
};

// Generate random date in the last 30 days
const randomRecentDate = () => {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 30);
  now.setDate(now.getDate() - daysAgo);
  return now;
};

// Generate a random conversation
const generateConversation = (id, errorRate = 0) => {
  const hasError = Math.random() < errorRate;
  const messageCount = Math.floor(Math.random() * 20) + 1;
  
  const messages = Array(messageCount).fill(0).map((_, i) => ({
    id: uuidv4(),
    role: i % 2 === 0 ? 'user' : 'assistant',
    content: `Message ${i + 1} content`,
    timestamp: new Date(Date.now() - (messageCount - i) * 3600000).toISOString()
  }));
  
  return {
    id,
    title: `Conversation about ${['crops', 'livestock', 'equipment', 'weather', 'soil', 'irrigation'][Math.floor(Math.random() * 6)]}`,
    userId: `user_${Math.floor(Math.random() * 1000)}`,
    createdAt: randomRecentDate().toISOString(),
    updatedAt: new Date().toISOString(),
    messages,
    metadata: {
      source: 'web',
      context: hasError ? {} : { topic: 'agriculture' },
      error: hasError ? {
        type: ['CONNECTION_ERROR', 'VALIDATION_ERROR', 'FORMAT_ERROR', 'MISSING_FIELD', 'DUPLICATE_KEY'][Math.floor(Math.random() * 5)],
        message: 'Mock error for demonstration purposes'
      } : null
    }
  };
};

// Generate mock database metrics
const generateDatabaseMetrics = () => {
  return {
    mongodb: {
      operationCounts: {
        find: Math.floor(Math.random() * 10000),
        insert: Math.floor(Math.random() * 5000),
        update: Math.floor(Math.random() * 3000),
        delete: Math.floor(Math.random() * 1000),
      },
      slowQueries: Array(Math.floor(Math.random() * 5)).fill(0).map(() => ({
        operation: ['find', 'aggregate', 'update', 'insert'][Math.floor(Math.random() * 4)],
        collection: ['conversations', 'messages', 'users', 'analytics'][Math.floor(Math.random() * 4)],
        durationMs: 100 + Math.floor(Math.random() * 900),
        timestamp: new Date(Date.now() - Math.floor(Math.random() * 86400000)).toISOString()
      })),
      responseTimes: {
        p50: 10 + Math.floor(Math.random() * 20),
        p90: 30 + Math.floor(Math.random() * 40),
        p99: 70 + Math.floor(Math.random() * 100)
      },
      connectionPoolStats: {
        totalConnections: 5 + Math.floor(Math.random() * 5),
        availableConnections: Math.floor(Math.random() * 5),
        inUseConnections: Math.floor(Math.random() * 5)
      }
    },
    postgresql: {
      operationCounts: {
        select: Math.floor(Math.random() * 8000),
        insert: Math.floor(Math.random() * 3000),
        update: Math.floor(Math.random() * 2000),
        delete: Math.floor(Math.random() * 500),
      },
      slowQueries: Array(Math.floor(Math.random() * 3)).fill(0).map(() => ({
        operation: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'][Math.floor(Math.random() * 4)],
        table: ['users', 'products', 'orders', 'reviews'][Math.floor(Math.random() * 4)],
        durationMs: 100 + Math.floor(Math.random() * 700),
        timestamp: new Date(Date.now() - Math.floor(Math.random() * 86400000)).toISOString()
      })),
      responseTimes: {
        p50: 5 + Math.floor(Math.random() * 15),
        p90: 20 + Math.floor(Math.random() * 30),
        p99: 50 + Math.floor(Math.random() * 70)
      },
      connectionStats: {
        totalConnections: 3 + Math.floor(Math.random() * 7),
        idleConnections: Math.floor(Math.random() * 5),
        activeConnections: Math.floor(Math.random() * 5)
      }
    }
  };
};

// Generate mock connection status data
const generateConnectionStatus = () => {
  return {
    mongodb: {
      status: Math.random() < 0.9 ? 'connected' : 'error',
      lastChecked: new Date().toISOString(),
      responseTimeMs: 10 + Math.floor(Math.random() * 90),
      error: Math.random() < 0.9 ? null : 'Connection timeout after 5000ms',
      version: '5.0.6',
      uptime: 3600 + Math.floor(Math.random() * 86400)
    },
    postgresql: {
      status: Math.random() < 0.95 ? 'connected' : 'error',
      lastChecked: new Date().toISOString(),
      responseTimeMs: 5 + Math.floor(Math.random() * 50),
      error: Math.random() < 0.95 ? null : 'Connection refused',
      version: '14.2',
      uptime: 3600 + Math.floor(Math.random() * 86400)
    },
    vercelKv: {
      status: Math.random() < 0.9 ? 'connected' : 'error',
      lastChecked: new Date().toISOString(),
      responseTimeMs: 20 + Math.floor(Math.random() * 100),
      error: Math.random() < 0.9 ? null : 'API key invalid',
      version: '1.0.0',
      uptime: 3600 + Math.floor(Math.random() * 86400)
    }
  };
};

// Generate mockdb migration state with various states
const generateMigrationStates = () => {
  // Create realistic failed conversation IDs
  const failedConversationIds = Array(15).fill(0).map(() => uuidv4());
  
  // Generate detailed error summary for various error types
  const errorSummary = {
    'CONNECTION_ERROR': 5,
    'VALIDATION_ERROR': 3,
    'FORMAT_ERROR': 2,
    'MISSING_FIELD': 4,
    'DUPLICATE_KEY': 1
  };
  
  const states = {
    idle: {
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
        speed: 0
      },
      error: null,
      logs: [],
      startTime: null,
      endTime: null,
      errorSummary: {},
      failedConversations: [],
      config: {
        batchSize: 50,
        restartFromScratch: true,
        logVerbosity: 'normal'
      },
      jobId: null
    },
    running: {
      status: 'running',
      progress: {
        totalConversations: 1000,
        processed: 350,
        successful: 320,
        failed: 15,
        skipped: 15,
        currentBatch: 7,
        totalBatches: 20,
        elapsedTime: 120000, // 2 minutes
        estimatedTimeRemaining: 180000, // 3 minutes
        speed: 2.92 // conversations per second
      },
      error: null,
      logs: [
        "Migration started",
        "Connected to MongoDB successfully",
        "Connected to Vercel KV successfully",
        "Found 1000 conversations in Vercel KV",
        "Processing batch 1/20 (50 conversations)",
        "Completed batch 1/20 - Migrated: 48, Skipped: 1, Errors: 1",
        "Processing batch 2/20 (50 conversations)",
        "Completed batch 2/20 - Migrated: 45, Skipped: 2, Errors: 3",
        "Processing batch 3/20 (50 conversations)",
        "Completed batch 3/20 - Migrated: 47, Skipped: 2, Errors: 1",
        "Processing batch 4/20 (50 conversations)",
        "Completed batch 4/20 - Migrated: 49, Skipped: 1, Errors: 0",
        "Processing batch 5/20 (50 conversations)",
        "Completed batch 5/20 - Migrated: 46, Skipped: 3, Errors: 1",
        "Processing batch 6/20 (50 conversations)",
        "Completed batch 6/20 - Migrated: 48, Skipped: 1, Errors: 1",
        "Processing batch 7/20 (50 conversations)",
      ],
      startTime: new Date(Date.now() - 120000).toISOString(),
      endTime: null,
      errorSummary: errorSummary,
      failedConversations: failedConversationIds,
      config: {
        batchSize: 50,
        restartFromScratch: true,
        logVerbosity: 'normal'
      },
      jobId: uuidv4()
    },
    completed: {
      status: 'completed',
      progress: {
        totalConversations: 1000,
        processed: 1000,
        successful: 960,
        failed: 15,
        skipped: 25,
        currentBatch: 20,
        totalBatches: 20,
        elapsedTime: 300000, // 5 minutes
        estimatedTimeRemaining: 0,
        speed: 3.33 // conversations per second
      },
      error: null,
      logs: [
        "Migration started",
        "Connected to MongoDB successfully",
        "Connected to Vercel KV successfully",
        "Found 1000 conversations in Vercel KV",
        "Processing batch 1/20 (50 conversations)",
        "Completed batch 1/20 - Migrated: 48, Skipped: 1, Errors: 1",
        // ... more batch logs would be here
        "Processing batch 20/20 (50 conversations)",
        "Completed batch 20/20 - Migrated: 49, Skipped: 1, Errors: 0",
        "Migration completed successfully",
        "Total time: 5 minutes 0 seconds",
        "Total conversations: 1000",
        "Successfully migrated: 960",
        "Skipped: 25",
        "Errors: 15"
      ],
      startTime: new Date(Date.now() - 300000).toISOString(),
      endTime: new Date().toISOString(),
      errorSummary: errorSummary,
      failedConversations: failedConversationIds,
      config: {
        batchSize: 50,
        restartFromScratch: true,
        logVerbosity: 'normal'
      },
      jobId: uuidv4()
    },
    error: {
      status: 'error',
      progress: {
        totalConversations: 1000,
        processed: 425,
        successful: 390,
        failed: 20,
        skipped: 15,
        currentBatch: 9,
        totalBatches: 20,
        elapsedTime: 180000, // 3 minutes
        estimatedTimeRemaining: null,
        speed: 2.36 // conversations per second
      },
      error: {
        message: "Database connection lost during migration",
        code: "ERR_MONGODB_CONNECTION_LOST",
        stack: "Error: Database connection lost during migration\n    at MigrationWorker.processBatch (file:///scripts/migrate-kv-to-mongodb.js:245:23)\n    at async MigrationWorker.run (file:///scripts/migrate-kv-to-mongodb.js:120:10)"
      },
      logs: [
        "Migration started",
        "Connected to MongoDB successfully",
        "Connected to Vercel KV successfully",
        "Found 1000 conversations in Vercel KV",
        "Processing batch 1/20 (50 conversations)",
        "Completed batch 1/20 - Migrated: 48, Skipped: 1, Errors: 1",
        // ... more batch logs would be here
        "Processing batch 9/20 (50 conversations)",
        "ERROR: Database connection lost during migration",
        "Migration failed: ERR_MONGODB_CONNECTION_LOST"
      ],
      startTime: new Date(Date.now() - 180000).toISOString(),
      endTime: new Date().toISOString(),
      errorSummary: {
        ...errorSummary,
        'CONNECTION_ERROR': 10 // More connection errors since this migration failed with a connection error
      },
      failedConversations: failedConversationIds.concat(Array(5).fill(0).map(() => uuidv4())), // Add more failed conversations
      config: {
        batchSize: 50,
        restartFromScratch: true,
        logVerbosity: 'verbose'
      },
      jobId: uuidv4()
    },
    cancelled: {
      status: 'cancelled',
      progress: {
        totalConversations: 1000,
        processed: 550,
        successful: 520,
        failed: 10,
        skipped: 20,
        currentBatch: 11,
        totalBatches: 20,
        elapsedTime: 240000, // 4 minutes
        estimatedTimeRemaining: null,
        speed: 2.29 // conversations per second
      },
      error: null,
      logs: [
        "Migration started",
        "Connected to MongoDB successfully",
        "Connected to Vercel KV successfully",
        "Found 1000 conversations in Vercel KV",
        "Processing batch 1/20 (50 conversations)",
        "Completed batch 1/20 - Migrated: 48, Skipped: 1, Errors: 1",
        // ... more batch logs would be here
        "Processing batch 11/20 (50 conversations)",
        "Migration cancelled by administrator"
      ],
      startTime: new Date(Date.now() - 240000).toISOString(),
      endTime: new Date().toISOString(),
      errorSummary: {
        'CONNECTION_ERROR': 3,
        'VALIDATION_ERROR': 2,
        'FORMAT_ERROR': 1,
        'MISSING_FIELD': 3,
        'DUPLICATE_KEY': 1
      },
      failedConversations: Array(10).fill(0).map(() => uuidv4()),
      config: {
        batchSize: 50,
        restartFromScratch: true,
        logVerbosity: 'normal'
      },
      jobId: uuidv4()
    }
  };
  
  return states;
};

// Generate mock KV conversation data
const generateKvConversations = (count = 100, errorRate = 0.05) => {
  const conversations = {};
  for (let i = 0; i < count; i++) {
    const id = uuidv4();
    conversations[`conversation:${id}`] = generateConversation(id, errorRate);
  }
  return conversations;
};

// Generate mock MongoDB database dump
const generateMongoDbData = (count = 50) => {
  return Array(count).fill(0).map(() => generateConversation(uuidv4(), 0));
};

// Generate admin dashboard data
const generateAdminDashboardData = () => {
  return {
    usersCount: 1200 + Math.floor(Math.random() * 300),
    activeSessions: 35 + Math.floor(Math.random() * 50),
    conversationsToday: 145 + Math.floor(Math.random() * 100),
    avgResponseTime: 1.2 + Math.random(),
    serverLoad: {
      cpu: 15 + Math.floor(Math.random() * 40),
      memory: 30 + Math.floor(Math.random() * 40),
      disk: 45 + Math.floor(Math.random() * 30)
    },
    recentErrors: Array(Math.floor(Math.random() * 5)).fill(0).map(() => ({
      timestamp: new Date(Date.now() - Math.floor(Math.random() * 86400000)).toISOString(),
      error: 'Error during operation',
      component: ['api', 'database', 'auth', 'chat', 'file-upload'][Math.floor(Math.random() * 5)],
      severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
    }))
  };
};

// Main function to generate all mock data
const generateAllMockData = () => {
  console.log('Generating mock data for AgriSmart platform...');
  
  // Create mock-data directory
  const mockDataDir = path.join(__dirname, '..', 'mock-data');
  ensureDirectoryExists(mockDataDir);
  
  // Generate and save mock KV conversations
  const kvConversations = generateKvConversations(1000, 0.05);
  saveJsonToFile(path.join(mockDataDir, 'kv-conversations.json'), kvConversations);
  
  // Generate and save mock MongoDB data
  const mongoDbData = generateMongoDbData(500);
  saveJsonToFile(path.join(mockDataDir, 'mongodb-conversations.json'), mongoDbData);
  
  // Generate and save mock database metrics
  const databaseMetrics = generateDatabaseMetrics();
  saveJsonToFile(path.join(mockDataDir, 'database-metrics.json'), databaseMetrics);
  
  // Generate and save mock connection status
  const connectionStatus = generateConnectionStatus();
  saveJsonToFile(path.join(mockDataDir, 'connection-status.json'), connectionStatus);
  
  // Generate and save mock migration states
  const migrationStates = generateMigrationStates();
  saveJsonToFile(path.join(mockDataDir, 'migration-states.json'), migrationStates);
  
  // Generate and save admin dashboard data
  const adminDashboardData = generateAdminDashboardData();
  saveJsonToFile(path.join(mockDataDir, 'admin-dashboard.json'), adminDashboardData);
  
  console.log('✅ All mock data generated successfully!');
  console.log(`Mock data saved to: ${mockDataDir}`);
};

// Execute the generation
generateAllMockData();
