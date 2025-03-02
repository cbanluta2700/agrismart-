/**
 * Mock API Server for AgriSmart Platform
 * 
 * This script sets up a mock API server to simulate the database migration APIs
 * and other database-related endpoints for demonstration purposes.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Helper to read mock data
const readMockData = (filename) => {
  const filePath = path.join(__dirname, '..', 'mock-data', filename);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  return null;
};

// Helper to write mock data
const writeMockData = (filename, data) => {
  const filePath = path.join(__dirname, '..', 'mock-data', filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// Track current migration state
let currentMigrationState = null;

// Initialize with idle state
const initializeMigrationState = () => {
  const migrationStates = readMockData('migration-states.json');
  if (migrationStates && !currentMigrationState) {
    currentMigrationState = { ...migrationStates.idle };
  }
};

// API Routes

// Get database metrics
app.get('/api/admin/database-metrics', (req, res) => {
  const metrics = readMockData('database-metrics.json');
  res.json(metrics || { error: 'No metrics data available' });
});

// Get connection status
app.get('/api/admin/database-status', (req, res) => {
  const status = readMockData('connection-status.json');
  res.json(status || { error: 'No connection status data available' });
});

// Get migration status
app.get('/api/admin/migration-status', (req, res) => {
  initializeMigrationState();
  res.json(currentMigrationState);
});

// Start migration
app.post('/api/admin/start-migration', (req, res) => {
  initializeMigrationState();
  
  // Don't start if already running
  if (currentMigrationState.status === 'running') {
    return res.status(400).json({ error: 'Migration already in progress' });
  }
  
  // Get running state from mock data
  const migrationStates = readMockData('migration-states.json');
  currentMigrationState = { ...migrationStates.running };
  
  // Update with config from request
  currentMigrationState.config = {
    ...currentMigrationState.config,
    ...req.body
  };
  
  // Generate new job ID
  currentMigrationState.jobId = uuidv4();
  currentMigrationState.startTime = new Date();
  
  // Start migration simulation
  simulateMigrationProgress();
  
  res.json({ 
    message: 'Migration started successfully', 
    jobId: currentMigrationState.jobId,
    progress: currentMigrationState.progress,
    logs: currentMigrationState.logs
  });
});

// Cancel migration
app.post('/api/admin/cancel-migration', (req, res) => {
  initializeMigrationState();
  
  if (currentMigrationState.status !== 'running') {
    return res.status(400).json({ error: 'No migration in progress to cancel' });
  }
  
  currentMigrationState.status = 'cancelled';
  currentMigrationState.endTime = new Date();
  currentMigrationState.logs.push('Migration cancelled by administrator');
  
  res.json({ 
    message: 'Migration cancelled successfully',
    status: currentMigrationState.status
  });
});

// Retry failed conversations
app.post('/api/admin/retry-failed-conversations', (req, res) => {
  initializeMigrationState();
  
  if (currentMigrationState.status === 'running') {
    return res.status(400).json({ error: 'A migration is already in progress' });
  }
  
  if (!currentMigrationState.failedConversations || currentMigrationState.failedConversations.length === 0) {
    return res.status(400).json({ 
      error: 'No failed conversations to retry',
      count: 0
    });
  }
  
  // Store failed conversations count for retry
  const conversationsToRetry = [...currentMigrationState.failedConversations];
  
  // Get running state from mock data as a base
  const migrationStates = readMockData('migration-states.json');
  currentMigrationState = { ...migrationStates.running };
  
  // Update with retry-specific information
  currentMigrationState.jobId = uuidv4();
  currentMigrationState.startTime = new Date();
  currentMigrationState.progress.totalConversations = conversationsToRetry.length;
  currentMigrationState.progress.processed = 0;
  currentMigrationState.progress.successful = 0;
  currentMigrationState.progress.failed = 0;
  currentMigrationState.progress.skipped = 0;
  currentMigrationState.progress.currentBatch = 0;
  currentMigrationState.progress.totalBatches = Math.ceil(conversationsToRetry.length / 50);
  currentMigrationState.logs = [
    `Retry job started with ID: ${currentMigrationState.jobId}`,
    `Retrying ${conversationsToRetry.length} failed conversations`
  ];
  
  // Start migration simulation
  simulateMigrationProgress(true);
  
  res.json({ 
    message: 'Retry job started successfully', 
    jobId: currentMigrationState.jobId,
    count: conversationsToRetry.length
  });
});

// Simulate migration progress
const simulateMigrationProgress = (isRetry = false) => {
  const batchProcessTime = 5000; // 5 seconds per batch
  const totalBatches = currentMigrationState.progress.totalBatches;
  let currentBatch = 0;
  
  // Random chance of error (10% for normal, 5% for retry)
  const errorChance = isRetry ? 0.05 : 0.1;
  
  // Adjust for demo: make retry more successful
  const successRate = isRetry ? 0.9 : 0.7;
  
  const processBatch = () => {
    if (currentMigrationState.status !== 'running') {
      return; // Stop simulation if cancelled or errored
    }
    
    currentBatch++;
    
    if (currentBatch > totalBatches) {
      // Complete the migration
      const migrationStates = readMockData('migration-states.json');
      
      // Mix the completed state with current progress
      currentMigrationState = { 
        ...migrationStates.completed,
        progress: {
          ...currentMigrationState.progress,
          processed: currentMigrationState.progress.totalConversations,
          currentBatch: totalBatches,
          estimatedTimeRemaining: 0
        },
        startTime: currentMigrationState.startTime,
        endTime: new Date(),
        jobId: currentMigrationState.jobId
      };
      
      // Add completion log
      currentMigrationState.logs.push(
        `Migration completed in ${Math.round((Date.now() - new Date(currentMigrationState.startTime).getTime()) / 1000)} seconds`,
        `Total conversations: ${currentMigrationState.progress.totalConversations}`,
        `Successfully migrated: ${currentMigrationState.progress.successful} conversations`,
        `Skipped: ${currentMigrationState.progress.skipped} conversations`,
        `Failed: ${currentMigrationState.progress.failed} conversations`
      );
      
      return;
    }
    
    // Simulate critical error with 5% chance (but not for retry operations)
    if (!isRetry && Math.random() < 0.05 && currentBatch > 2) {
      const migrationStates = readMockData('migration-states.json');
      
      // Mix the error state with current progress
      currentMigrationState = { 
        ...migrationStates.error,
        progress: {
          ...currentMigrationState.progress,
          currentBatch: currentBatch
        },
        startTime: currentMigrationState.startTime,
        endTime: new Date(),
        jobId: currentMigrationState.jobId
      };
      
      return;
    }
    
    // Update batch progress
    const batchSize = Math.min(50, currentMigrationState.progress.totalConversations - currentMigrationState.progress.processed);
    const successCount = Math.floor(batchSize * successRate);
    const errorCount = Math.floor(batchSize * errorChance);
    const skippedCount = batchSize - successCount - errorCount;
    
    // Update progress
    currentMigrationState.progress.currentBatch = currentBatch;
    currentMigrationState.progress.processed += batchSize;
    currentMigrationState.progress.successful += successCount;
    currentMigrationState.progress.failed += errorCount;
    currentMigrationState.progress.skipped += skippedCount;
    
    // Update elapsed time
    const elapsedTime = Date.now() - new Date(currentMigrationState.startTime).getTime();
    currentMigrationState.progress.elapsedTime = elapsedTime;
    
    // Calculate estimated time remaining
    if (currentMigrationState.progress.processed > 0) {
      const msPerConversation = elapsedTime / currentMigrationState.progress.processed;
      const remainingConversations = currentMigrationState.progress.totalConversations - currentMigrationState.progress.processed;
      currentMigrationState.progress.estimatedTimeRemaining = msPerConversation * remainingConversations;
    }
    
    // Add batch logs
    currentMigrationState.logs.push(
      `Processing batch ${currentBatch}/${totalBatches} (${batchSize} conversations)`,
      `Completed batch ${currentBatch}/${totalBatches} - Migrated: ${successCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`
    );
    
    // Add error details if there are errors
    if (errorCount > 0) {
      // Update error summary
      const errorTypes = ['CONNECTION_ERROR', 'VALIDATION_ERROR', 'FORMAT_ERROR', 'MISSING_FIELD', 'DUPLICATE_KEY'];
      for (let i = 0; i < errorCount; i++) {
        const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
        currentMigrationState.errorSummary[errorType] = (currentMigrationState.errorSummary[errorType] || 0) + 1;
        
        // Add to failed conversations
        currentMigrationState.failedConversations.push(uuidv4());
      }
    }
    
    // Schedule next batch
    setTimeout(processBatch, batchProcessTime);
  };
  
  // Start batch processing
  processBatch();
};

// Start the server
app.listen(PORT, () => {
  console.log(`Mock API server running on port ${PORT}`);
  
  // Check for mock data and generate if not present
  const mockDataDir = path.join(__dirname, '..', 'mock-data');
  if (!fs.existsSync(mockDataDir)) {
    console.log('Mock data not found. Run generate-mock-data.js first.');
  } else {
    console.log('Mock data found and loaded.');
    initializeMigrationState();
  }
});
