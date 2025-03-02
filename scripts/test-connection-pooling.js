// Script to test MongoDB connection pooling
const dotenv = require('dotenv');
const { performance } = require('perf_hooks');
const { 
  connectToDatabase, 
  closeMongoDBConnection, 
  isMongoDBConnected,
  getMongoDBConnectionStats 
} = require('../lib/chat/mongodb');

// Load environment variables
dotenv.config();

// Number of concurrent connection requests to simulate
const NUM_CONCURRENT_REQUESTS = 20;

// Delay between batches (ms)
const BATCH_DELAY = 2000; 

// Number of batches to run
const NUM_BATCHES = 3;

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
    const isConnected = isMongoDBConnected();
    console.log(`\nFinal connection status: ${isConnected ? 'Connected' : 'Disconnected'}`);
    
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
