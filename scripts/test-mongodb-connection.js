// Simple MongoDB connection test
const { MongoClient } = require('mongodb');
const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.production
require('dotenv').config({ path: path.resolve(__dirname, '../.env.production') });

// MongoDB connection URI and database name
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'agrismart_chat';

console.log('Connecting to MongoDB at:', MONGODB_URI.replace(/:[^:]*@/, ':****@'));
console.log('Database name:', MONGODB_DB_NAME);

// Connection options with pooling
const connectionOptions = {
  maxPoolSize: 10,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
  connectTimeoutMS: 5000,
  socketTimeoutMS: 30000
};

// Create a single client instance that will be reused
const client = new MongoClient(MONGODB_URI, connectionOptions);

// Number of operations to perform
const NUM_OPERATIONS = 20;
// Number of test iterations
const NUM_ITERATIONS = 3;
// Delay between iterations (ms)
const ITERATION_DELAY = 2000;

/**
 * Run a batch of database operations
 */
async function runOperationBatch(iteration) {
  console.log(`\n=== Starting Iteration ${iteration} ===`);
  
  const startTime = performance.now();
  const operationPromises = [];
  
  // Create multiple operation promises
  for (let i = 0; i < NUM_OPERATIONS; i++) {
    operationPromises.push((async () => {
      const db = client.db(MONGODB_DB_NAME);
      const conversations = db.collection('conversations');
      
      // Simple find operation
      const opStart = performance.now();
      
      // Perform a simple find operation
      const count = await conversations.countDocuments({});
      
      // Add a random small document to simulate chat message storage
      const result = await conversations.insertOne({
        testMessage: `Test message ${i} from iteration ${iteration}`,
        userId: `test-user-${Math.floor(Math.random() * 10)}`,
        timestamp: new Date(),
        testData: Math.random().toString(36).substring(2)
      });
      
      const opDuration = performance.now() - opStart;
      
      return {
        operation: i,
        duration: opDuration,
        count: count,
        inserted: result.insertedId ? true : false
      };
    })());
  }
  
  // Wait for all operations to complete
  const results = await Promise.all(operationPromises);
  const endTime = performance.now();
  const batchDuration = endTime - startTime;
  
  // Calculate statistics
  let totalDuration = 0;
  let minDuration = Infinity;
  let maxDuration = 0;
  
  results.forEach(result => {
    totalDuration += result.duration;
    minDuration = Math.min(minDuration, result.duration);
    maxDuration = Math.max(maxDuration, result.duration);
  });
  
  const avgDuration = totalDuration / results.length;
  
  // Print results
  console.log(`Completed ${NUM_OPERATIONS} operations in ${batchDuration.toFixed(2)}ms`);
  console.log(`Average operation time: ${avgDuration.toFixed(2)}ms`);
  console.log(`Min operation time: ${minDuration.toFixed(2)}ms`);
  console.log(`Max operation time: ${maxDuration.toFixed(2)}ms`);
  
  return {
    batchDuration,
    avgDuration,
    minDuration,
    maxDuration
  };
}

/**
 * Main test function
 */
async function testMongoDBConnection() {
  console.log('Testing MongoDB connection with pooling...');
  
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Connected to MongoDB successfully');
    
    const iterationStats = [];
    
    // Run multiple iterations
    for (let i = 1; i <= NUM_ITERATIONS; i++) {
      const stats = await runOperationBatch(i);
      iterationStats.push(stats);
      
      // Wait between iterations
      if (i < NUM_ITERATIONS) {
        console.log(`Waiting ${ITERATION_DELAY}ms before next iteration...`);
        await new Promise(resolve => setTimeout(resolve, ITERATION_DELAY));
      }
    }
    
    // Compare first and last iteration to show the connection pooling effect
    if (iterationStats.length >= 2) {
      const firstIteration = iterationStats[0];
      const lastIteration = iterationStats[iterationStats.length - 1];
      
      console.log('\n=== Connection Pooling Effect ===');
      console.log(`First iteration average: ${firstIteration.avgDuration.toFixed(2)}ms`);
      console.log(`Last iteration average: ${lastIteration.avgDuration.toFixed(2)}ms`);
      
      const improvement = ((firstIteration.avgDuration - lastIteration.avgDuration) / firstIteration.avgDuration * 100).toFixed(2);
      console.log(`Performance improvement: ${improvement}%`);
    }
    
    // Clean up - delete all test documents
    console.log('\nCleaning up test data...');
    const db = client.db(MONGODB_DB_NAME);
    const conversations = db.collection('conversations');
    const deleteResult = await conversations.deleteMany({ testMessage: { $exists: true } });
    console.log(`Deleted ${deleteResult.deletedCount} test documents`);
    
    // Close the connection
    console.log('Closing MongoDB connection...');
    await client.close();
    console.log('Connection closed');
    
  } catch (error) {
    console.error('Error during MongoDB connection test:', error);
  }
}

// Run the test
testMongoDBConnection()
  .then(() => console.log('Test completed'))
  .catch(err => console.error('Test failed:', err));
