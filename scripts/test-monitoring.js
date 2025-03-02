// Script to test database monitoring utilities
const axios = require('axios');
const dotenv = require('dotenv');
const { MongoClient } = require('mongodb');
const { PrismaClient } = require('@prisma/client');
const { connectToDatabase } = require('../lib/chat/mongodb');

// Import monitoring utilities
const dbPerformance = require('../lib/monitoring/database-performance');
const connectionStatus = require('../lib/monitoring/connection-status');

// Load environment variables
dotenv.config();

// Initialize Prisma client
const prisma = new PrismaClient();

// Admin API key for authentication
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

// Helper to make HTTP requests to API endpoints
async function callApiEndpoint(method, endpoint, data = null) {
  try {
    const url = `http://localhost:3000/api/admin/${endpoint}`;
    const headers = { 'x-api-key': ADMIN_API_KEY };
    
    const response = method === 'GET'
      ? await axios.get(url, { headers, params: data })
      : await axios.post(url, data, { headers });
    
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(`API ${method} request failed:`, error.response.data);
    } else {
      console.error(`API ${method} request error:`, error.message);
    }
    throw error;
  }
}

// Test MongoDB operations with performance tracking
async function testMongoDbOperations() {
  console.log('\n--- Testing MongoDB Operations with Performance Tracking ---');
  
  try {
    // Connect to MongoDB
    const { db, conversations } = await connectToDatabase();
    
    // Test insert operation
    await dbPerformance.trackMongoOperation('insert', 'conversations', async () => {
      const testConversation = {
        id: `test-${Date.now()}`,
        userId: 'test-user',
        title: 'Test Conversation',
        messages: [
          {
            role: 'user',
            content: 'Hello, this is a test',
            timestamp: new Date()
          },
          {
            role: 'assistant',
            content: 'Hello! I am here to help with your test.',
            timestamp: new Date()
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await conversations.insertOne(testConversation);
      console.log('Inserted test conversation');
      return testConversation;
    });
    
    // Test find operation
    const foundItems = await dbPerformance.trackMongoOperation('find', 'conversations', async () => {
      const result = await conversations.find({ userId: 'test-user' }).toArray();
      console.log(`Found ${result.length} conversations for test user`);
      return result;
    });
    
    // Test update operation
    if (foundItems && foundItems.length > 0) {
      const conversationId = foundItems[0].id;
      await dbPerformance.trackMongoOperation('update', 'conversations', async () => {
        const result = await conversations.updateOne(
          { id: conversationId },
          { 
            $push: { 
              messages: {
                role: 'user',
                content: 'This is an updated test message',
                timestamp: new Date()
              }
            },
            $set: { updatedAt: new Date() }
          }
        );
        console.log(`Updated conversation: ${result.modifiedCount} document modified`);
        return result;
      });
      
      // Test delete operation
      await dbPerformance.trackMongoOperation('delete', 'conversations', async () => {
        const result = await conversations.deleteMany({ userId: 'test-user' });
        console.log(`Deleted test conversations: ${result.deletedCount} documents removed`);
        return result;
      });
    }
    
    // Get and display performance metrics
    const mongoMetrics = dbPerformance.getMetrics('mongodb');
    console.log('\nMongoDB Performance Metrics:');
    console.log(JSON.stringify(mongoMetrics, null, 2));
    
  } catch (error) {
    console.error('Error testing MongoDB operations:', error);
  }
}

// Test PostgreSQL operations with performance tracking
async function testPostgresOperations() {
  console.log('\n--- Testing PostgreSQL Operations with Performance Tracking ---');
  
  try {
    // Test find operation
    await dbPerformance.trackPrismaOperation('findMany', 'user', async () => {
      const users = await prisma.user.findMany({
        take: 5,
        select: {
          id: true,
          email: true,
          role: true
        }
      });
      console.log(`Found ${users.length} users`);
      return users;
    });
    
    // Test count operation
    await dbPerformance.trackPrismaOperation('count', 'user', async () => {
      const count = await prisma.user.count();
      console.log(`Total users: ${count}`);
      return count;
    });
    
    // Get and display performance metrics
    const postgresMetrics = dbPerformance.getMetrics('postgres');
    console.log('\nPostgreSQL Performance Metrics:');
    console.log(JSON.stringify(postgresMetrics, null, 2));
    
  } catch (error) {
    console.error('Error testing PostgreSQL operations:', error);
  }
}

// Test connection status monitoring
async function testConnectionMonitoring() {
  console.log('\n--- Testing Connection Status Monitoring ---');
  
  try {
    // Check MongoDB connection
    console.log('Checking MongoDB connection...');
    await connectionStatus.checkMongoDbStatus();
    
    // Check PostgreSQL connection
    console.log('Checking PostgreSQL connection...');
    await connectionStatus.checkPostgresStatus();
    
    // Get and display connection status
    const status = connectionStatus.getConnectionStatus();
    console.log('\nDatabase Connection Status:');
    console.log(JSON.stringify(status, null, 2));
    
  } catch (error) {
    console.error('Error testing connection monitoring:', error);
  }
}

// Test API endpoints
async function testApiEndpoints() {
  console.log('\n--- Testing API Endpoints ---');
  
  try {
    // Test database metrics endpoint
    console.log('Getting database metrics from API...');
    const metricsResponse = await callApiEndpoint('GET', 'database-metrics');
    console.log('Database metrics API response received');
    
    // Test database status endpoint
    console.log('Getting database status from API with refresh...');
    const statusResponse = await callApiEndpoint('GET', 'database-status', { refresh: 'true' });
    console.log('Database status API response received');
    
    // Test updating configuration
    console.log('Updating connection monitor configuration...');
    const configResponse = await callApiEndpoint('POST', 'database-status', {
      action: 'update-config',
      config: {
        checkInterval: 120000, // 2 minutes
        connectionTimeout: 3000 // 3 seconds
      }
    });
    console.log('Configuration updated:', configResponse.config);
    
  } catch (error) {
    console.error('Error testing API endpoints:', error);
  }
}

// Main function to run all tests
async function runTests() {
  console.log('Starting database monitoring tests...');
  
  try {
    // Test MongoDB operations
    await testMongoDbOperations();
    
    // Test PostgreSQL operations
    await testPostgresOperations();
    
    // Test connection monitoring
    await testConnectionMonitoring();
    
    // Test API endpoints (if server is running)
    try {
      await testApiEndpoints();
    } catch (error) {
      console.warn('Could not test API endpoints. Is the development server running?');
    }
    
    console.log('\nAll tests completed.');
  } catch (error) {
    console.error('Test execution failed:', error);
  } finally {
    // Clean up connections
    await prisma.$disconnect();
    console.log('Test script execution completed.');
  }
}

// Run all tests
runTests().catch(console.error);
