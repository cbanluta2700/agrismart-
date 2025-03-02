// Script to migrate chat conversations from Vercel KV to MongoDB
const { createClient } = require('@vercel/kv');
const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const { performance } = require('perf_hooks');

// Load environment variables
dotenv.config();

// Get configuration from environment
let config = {
  batchSize: 50,
  concurrentBatches: 5,
  skipExisting: true,
  dryRun: false,
  verbose: true
};

// Parse configuration from environment if provided
try {
  if (process.env.MIGRATION_CONFIG) {
    const envConfig = JSON.parse(process.env.MIGRATION_CONFIG);
    config = { ...config, ...envConfig };
  }
} catch (error) {
  console.error('Error parsing migration configuration:', error);
}

// Create KV client
const kv = createClient({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// Create MongoDB client with connection pooling
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const mongoDbName = process.env.MONGODB_DB_NAME || 'agrismart_chat';
const mongoClient = new MongoClient(mongoUri, {
  maxPoolSize: 10,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
  connectTimeoutMS: 5000,
  socketTimeoutMS: 30000
});

// Create Prisma client
const prisma = new PrismaClient();

// Sleep utility to avoid rate limiting
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to send messages back to parent process
const sendMessage = (type, data) => {
  if (process.send) {
    process.send({ type, data });
  }
};

// Helper to send log messages
const log = (message) => {
  console.log(message);
  sendMessage('log', message);
};

// Enhanced error handling utilities
const errorTypes = {
  CONNECTION: 'connection_error',
  VALIDATION: 'data_validation_error',
  PROCESSING: 'processing_error',
  UNKNOWN: 'unknown_error'
};

// Error tracking with categorization
const errorTracker = {
  errors: [],
  failedConversations: new Set(),
  addError(conversationId, errorType, message, stack) {
    this.errors.push({
      conversationId,
      type: errorType,
      message,
      timestamp: new Date().toISOString(),
      stack
    });
    
    if (conversationId) {
      this.failedConversations.add(conversationId);
    }
    
    // Send error to parent process
    if (process.send) {
      process.send({
        type: 'error',
        error: { conversationId, type: errorType, message }
      });
    }
  },
  getSummary() {
    const counts = {};
    this.errors.forEach(err => {
      counts[err.type] = (counts[err.type] || 0) + 1;
    });
    
    return {
      total: this.errors.length,
      byType: counts,
      failedConversations: Array.from(this.failedConversations)
    };
  }
};

// Retry utility for operations that might fail temporarily
async function withRetry(operation, maxRetries = 3, delay = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.log(`Retry ${attempt}/${maxRetries} failed: ${error.message}`);
      
      if (attempt < maxRetries) {
        // Wait before next retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
      }
    }
  }
  
  throw lastError;
}

// Check if we're in retry mode
const RETRY_CONVERSATIONS = process.env.RETRY_CONVERSATIONS ? 
  JSON.parse(process.env.RETRY_CONVERSATIONS) : null;

async function migrateConversations() {
  let db;
  
  try {
    // Connect to MongoDB with retry
    await withRetry(async () => {
      console.log(`Connecting to MongoDB at ${mongoUri}`);
      await mongoClient.connect();
      db = mongoClient.db(mongoDbName);
      console.log('Connected to MongoDB successfully');
    }, 5, 2000);
    
    // Determine which conversations to process
    let allKeys;
    if (RETRY_CONVERSATIONS && RETRY_CONVERSATIONS.length > 0) {
      // We're in retry mode - only process the specified conversations
      console.log(`Retry mode: Processing ${RETRY_CONVERSATIONS.length} failed conversations`);
      allKeys = RETRY_CONVERSATIONS.map(id => `conversation:${id}`);
    } else {
      // Normal mode - get all conversation keys from KV
      log('Fetching conversation keys from Vercel KV...');
      allKeys = await withRetry(() => kv.keys('conversation:*'), 3, 2000);
      log(`Found ${allKeys.length} conversations in Vercel KV`);
    }
    
    // Track migration statistics
    let migratedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    let totalMessages = 0;
    let processedCount = 0;
    
    // Calculate total batches
    const totalBatches = Math.ceil(allKeys.length / config.batchSize);
    
    // Update progress
    sendMessage('progress', {
      totalConversations: allKeys.length,
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      currentBatch: 0,
      totalBatches: totalBatches,
      elapsedTime: 0,
      estimatedTimeRemaining: null
    });
    
    // Process conversations in batches
    for (let i = 0; i < allKeys.length; i += config.batchSize) {
      const batchKeys = allKeys.slice(i, i + config.batchSize);
      const batchStartTime = performance.now();
      const currentBatch = Math.floor(i / config.batchSize) + 1;
      
      log(`\nProcessing batch ${currentBatch} of ${totalBatches} (${batchKeys.length} conversations)`);
      
      // Create a batch chunking algorithm for concurrent processing
      const chunks = [];
      for (let j = 0; j < batchKeys.length; j += Math.ceil(batchKeys.length / config.concurrentBatches)) {
        chunks.push(batchKeys.slice(j, j + Math.ceil(batchKeys.length / config.concurrentBatches)));
      }
      
      // Process each chunk of the batch concurrently
      let batchResults = [];
      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex];
        
        // Create batch promises array for this chunk
        const chunkPromises = chunk.map(async (key) => {
          try {
            // Extract conversation ID from the key
            const conversationId = key.replace('conversation:', '');
            
            // Get conversation data from KV
            const kvConversation = await withRetry(() => kv.get(key), 3, 1000);
            
            if (!kvConversation) {
              errorTracker.addError(conversationId, errorTypes.VALIDATION, 'Conversation data is empty');
              return { status: 'skipped', reason: 'no_data' };
            }
            
            // Get user ID from KV conversation
            const userId = kvConversation.userId || kvConversation.metadata?.userId;
            
            if (!userId) {
              errorTracker.addError(conversationId, errorTypes.VALIDATION, 
                `Invalid conversation data structure: userId=${kvConversation.userId}, messages=${typeof kvConversation.messages}`);
              return { status: 'skipped', reason: 'no_user_id' };
            }
            
            // Check if the conversation already exists in MongoDB and should be skipped
            if (config.skipExisting && !config.dryRun) {
              const existingConversation = await withRetry(() => db.collection('conversations').findOne({ id: conversationId }), 3, 1000);
              
              if (existingConversation) {
                errorTracker.addError(conversationId, errorTypes.PROCESSING, 
                  `Skipping conversation ${conversationId}: Already exists in MongoDB`);
                return { status: 'skipped', reason: 'already_exists' };
              }
            }
            
            // Format messages for MongoDB
            const messages = Array.isArray(kvConversation.messages) 
              ? kvConversation.messages.map(msg => ({
                  role: msg.role || 'user',
                  content: msg.content || '',
                  timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
                }))
              : [];
            
            // Create MongoDB document
            const mongoConversation = {
              id: conversationId,
              userId: userId,
              title: kvConversation.title || (messages.find(m => m.role === 'user')?.content.substring(0, 50) || 'Migrated conversation'),
              messages: messages,
              createdAt: kvConversation.createdAt ? new Date(kvConversation.createdAt) : new Date(),
              updatedAt: kvConversation.updatedAt ? new Date(kvConversation.updatedAt) : new Date(),
              metadata: kvConversation.metadata || {}
            };
            
            if (!config.dryRun) {
              // Insert into MongoDB
              await withRetry(() => db.collection('conversations').insertOne(mongoConversation), 3, 1000);
              
              // Create usage record in PostgreSQL
              try {
                await withRetry(() => prisma.chatUsage.create({
                  data: {
                    userId: userId,
                    conversationId: conversationId,
                    messageCount: messages.length,
                    tokensUsed: Math.floor(messages.reduce((sum, msg) => sum + (msg.content.length / 3), 0)), // Rough estimate
                    createdAt: new Date()
                  }
                }), 2, 500);
              } catch (prismaError) {
                // Log Prisma error but continue with migration
                errorTracker.addError(conversationId, errorTypes.PROCESSING, 
                  `Error creating usage record: ${prismaError.message}`);
              }
            }
            
            errorTracker.addError(conversationId, errorTypes.PROCESSING, 
              `Migrated conversation ${conversationId} with ${messages.length} messages`);
            
            return { 
              status: 'migrated', 
              conversationId, 
              messageCount: messages.length 
            };
            
          } catch (error) {
            // Log error details
            errorTracker.addError(
              conversationId, 
              error.message.includes('connect') ? errorTypes.CONNECTION : errorTypes.PROCESSING,
              `Failed to migrate conversation: ${error.message}`,
              error.stack
            );
            return { status: 'error', key: conversationId, error: error.message };
          }
        });
        
        // Wait for all conversations in the chunk to be processed
        const chunkResults = await Promise.all(chunkPromises);
        batchResults = [...batchResults, ...chunkResults];
      }
      
      // Process batch results
      const batchMigrated = batchResults.filter(r => r.status === 'migrated').length;
      const batchSkipped = batchResults.filter(r => r.status === 'skipped').length;
      const batchErrors = batchResults.filter(r => r.status === 'error').length;
      const batchMessages = batchResults.reduce((sum, r) => sum + (r.messageCount || 0), 0);
      
      // Update totals
      migratedCount += batchMigrated;
      skippedCount += batchSkipped;
      errorCount += batchErrors;
      totalMessages += batchMessages;
      processedCount += batchResults.length;
      
      // Log batch results
      const batchEndTime = performance.now();
      const batchDuration = (batchEndTime - batchStartTime) / 1000;
      
      log(`Batch completed in ${batchDuration.toFixed(2)}s`);
      log(`- Migrated: ${batchMigrated} conversations (${batchMessages} messages)`);
      log(`- Skipped: ${batchSkipped} conversations`);
      log(`- Errors: ${batchErrors} conversations`);
      
      // Show progress
      const progressPct = Math.min(100, Math.round(processedCount / allKeys.length * 100));
      log(`Overall progress: ${progressPct}% (${processedCount}/${allKeys.length})`);
      
      // Calculate elapsed time and estimated time remaining
      const elapsedTime = performance.now() - startTime;
      let estimatedTimeRemaining = null;
      
      if (processedCount > 0) {
        const conversationsPerMs = processedCount / elapsedTime;
        const remainingConversations = allKeys.length - processedCount;
        estimatedTimeRemaining = remainingConversations / conversationsPerMs;
      }
      
      // Send progress update
      sendMessage('progress', {
        totalConversations: allKeys.length,
        processed: processedCount,
        successful: migratedCount,
        failed: errorCount,
        skipped: skippedCount,
        currentBatch: currentBatch,
        totalBatches: totalBatches,
        elapsedTime: elapsedTime,
        estimatedTimeRemaining: estimatedTimeRemaining
      });
      
      // Brief pause between batches to avoid overwhelming the databases
      if (i + config.batchSize < allKeys.length) {
        if (config.verbose) log('Pausing briefly before next batch...');
        await sleep(1000);
      }
    }
    
    // Log migration results
    const endTime = performance.now();
    const totalDuration = (endTime - startTime) / 1000;
    
    log('\n=== Migration completed ===');
    log(`Duration: ${totalDuration.toFixed(2)} seconds`);
    log(`Total conversations in KV: ${allKeys.length}`);
    log(`Successfully migrated: ${migratedCount} conversations (${totalMessages} messages)`);
    log(`Skipped (already exists or invalid): ${skippedCount} conversations`);
    log(`Failed with errors: ${errorCount} conversations`);
    
    if (migratedCount > 0) {
      log(`\nAverage migration time: ${(totalDuration / migratedCount).toFixed(2)} seconds per conversation`);
      log(`Average messages per conversation: ${(totalMessages / migratedCount).toFixed(1)}`);
    }
    
    // Send completion message
    sendMessage('complete', {
      totalDuration: totalDuration,
      totalConversations: allKeys.length,
      migratedCount: migratedCount,
      skippedCount: skippedCount,
      errorCount: errorCount,
      totalMessages: totalMessages
    });
    
    return {
      success: true,
      totalConversations: allKeys.length,
      migratedCount,
      skippedCount,
      errorCount,
      totalMessages,
      totalDuration
    };
    
  } catch (error) {
    // Critical error in the migration process
    console.error('Critical error during migration:', error);
    errorTracker.addError(null, errorTypes.UNKNOWN, `Critical migration error: ${error.message}`, error.stack);
    
    // Send error to parent process
    if (process.send) {
      process.send({ 
        type: 'critical_error', 
        error: {
          message: error.message,
          stack: error.stack 
        }
      });
    }
    
    throw error;
  } finally {
    // Close connections
    try {
      await mongoClient.close();
      await prisma.$disconnect();
    } catch (err) {
      console.error('Error closing connections:', err);
    }
  }
}

// Run the migration
migrateConversations()
  .then((result) => {
    if (result.success) {
      log('Migration script completed successfully');
      
      // Exit with success code
      setTimeout(() => process.exit(0), 1000);
    } else {
      log(`Migration script failed: ${result.error}`);
      
      // Exit with error code
      setTimeout(() => process.exit(1), 1000);
    }
  })
  .catch((error) => {
    log(`Migration script crashed: ${error.message}`);
    
    // Send error message
    sendMessage('error', `Migration script crashed: ${error.message}`);
    
    // Exit with error code
    setTimeout(() => process.exit(1), 1000);
  });
