// Script to test MongoDB connection pooling
import dotenv from 'dotenv';
import { performance } from 'perf_hooks';
import { MongoClient } from 'mongodb';

// Load environment variables
dotenv.config();

// MongoDB connection URI and database name
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'agrismart_chat';

// Connection options with pooling
const connectionOptions = {
  maxPoolSize: 10,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
  connectTimeoutMS: 5000,
  socketTimeoutMS: 30000
};

// Global client instance to simulate connection pooling
let client: MongoClient | null = null;

// Number of concurrent connection requests to simulate
const NUM_CONCURRENT_REQUESTS = 20;

// Delay between batches (ms)
const BATCH_DELAY = 2000; 

// Number of batches to run
const NUM_BATCHES = 3;

/**
 * Connect to MongoDB with connection pooling
 */
async function connectToDatabase() {
  // If we already have an active connection, return it
  if (client && client.topology && client.topology.isConnected()) {
    const db = client.db(MONGODB_DB_NAME);
    const conversations = db.collection('conversations');
    return { client, db, conversations };
  }

  // Create new client if needed
  if (!client) {
    client = new MongoClient(MONGODB_URI, connectionOptions);
    console.log('Creating new MongoDB connection pool...');
  }

  // Connect if needed
  if (!client.topology || !client.topology.isConnected()) {
    await client.connect();
    console.log('Connected to MongoDB');
  }

  const db = client.db(MONGODB_DB_NAME);
  const conversations = db.collection('conversations');
  
  return { client, db, conversations };
}

/**
 * Close the MongoDB connection
 */
async function closeMongoDBConnection() {
  if (client) {
    await client.close();
    client = null;
    console.log('MongoDB connection closed');
  }
}

/**
 * Get MongoDB connection statistics
 */
function getMongoDBConnectionStats() {
  if (!client || !client.topology) {
    return { connected: false };
  }

  return {
    connected: client.topology.isConnected(),
    poolSize: client.topology.s?.size || 0,
    availableConnections: client.topology.s?.availableConnections?.length || 0,
    maxPoolSize: connectionOptions.maxPoolSize,
    minPoolSize: connectionOptions.minPoolSize
  };
}

/**
 * Test function to simulate concurrent database requests
 */
async function testConnectionPooling() {
  console.log('Testing MongoDB connection pooling...');
  console.log(`Will simulate ${NUM_CONCURRENT_REQUESTS} concurrent requests in ${NUM_BATCHES} batches`);
  
  try {
    // Run multiple batches
    for (let batch = 1; batch <= NUM_BATCHES; batch++) {
      console.log(`\n=== Starting Batch ${batch} ===`);
      
      // Create an array of concurrent connection requests
      const connectionPromises = [];
      const startTimes = [];
      
      for (let i = 0; i < NUM_CONCURRENT_REQUESTS; i++) {
        startTimes[i] = performance.now();
        connectionPromises.push(
          (async () => {
            // Connect to database
            const { client, db, conversations } = await connectToDatabase();
            
            // Simulate a simple operation
            const count = await conversations.countDocuments({});
            
            // Calculate connection time
            const connectionTime = performance.now() - startTimes[i];
            
            return {
              index: i,
              connectionTime,
              count
            };
          })()
        );
      }
      
      // Wait for all connections to complete
      const batchStartTime = performance.now();
      const results = await Promise.all(connectionPromises);
      const batchEndTime = performance.now();
      
      // Calculate statistics
      let totalTime = 0;
      let minTime = Infinity;
      let maxTime = 0;
      
      results.forEach(result => {
        totalTime += result.connectionTime;
        minTime = Math.min(minTime, result.connectionTime);
        maxTime = Math.max(maxTime, result.connectionTime);
      });
      
      const avgTime = totalTime / results.length;
      const batchTime = batchEndTime - batchStartTime;
      
      // Print batch results
      console.log(`Batch ${batch} completed in ${batchTime.toFixed(2)}ms`);
      console.log(`Average connection time: ${avgTime.toFixed(2)}ms`);
      console.log(`Min connection time: ${minTime.toFixed(2)}ms`);
      console.log(`Max connection time: ${maxTime.toFixed(2)}ms`);
      
      // Get current connection stats
      const stats = getMongoDBConnectionStats();
      console.log('Connection pool stats:', stats);
      
      // Wait between batches
      if (batch < NUM_BATCHES) {
        console.log(`Waiting ${BATCH_DELAY}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }
    
    // Final connection check
    const stats = getMongoDBConnectionStats();
    console.log(`\nFinal connection status: ${stats.connected ? 'Connected' : 'Disconnected'}`);
    
    // Close connection
    console.log('Closing MongoDB connection...');
    await closeMongoDBConnection();
    
    console.log('Connection pooling test completed');
    
  } catch (error) {
    console.error('Error testing connection pooling:', error);
  }
}

// Run the test
testConnectionPooling().catch(console.error);
