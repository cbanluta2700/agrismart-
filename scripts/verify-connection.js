/**
 * Simple Connection Verification Script for AgriSmart Deployment
 * 
 * This script verifies connections to both MongoDB and PostgreSQL databases
 * before deployment.
 */

const { MongoClient, ServerApiVersion } = require('mongodb');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.production') });

// MongoDB connection details
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'agrismart_chat';

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const mongoClient = new MongoClient(MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// PostgreSQL connection via Prisma
const prisma = new PrismaClient();

async function verifyMongoDB() {
  console.log('\n📊 Verifying MongoDB connection...');
  try {
    await mongoClient.connect();
    console.log('✅ Successfully connected to MongoDB');
    
    const db = mongoClient.db(MONGODB_DB_NAME);
    const collections = await db.listCollections().toArray();
    
    console.log(`📚 Available collections: ${collections.length > 0 ? 
      collections.map(c => c.name).join(', ') : 
      'No collections found (database may be empty)'}`);
    
    // Create a test document
    const testCollection = db.collection('connection_tests');
    const result = await testCollection.insertOne({
      test: 'connectivity',
      timestamp: new Date(),
      success: true
    });
    
    console.log(`✅ Successfully wrote test document: ${result.insertedId}`);
    
    // Clean up test document
    await testCollection.deleteOne({ _id: result.insertedId });
    console.log('✅ Successfully deleted test document');
    
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  } finally {
    await mongoClient.close();
  }
}

async function verifyPostgreSQL() {
  console.log('\n📊 Verifying PostgreSQL connection...');
  try {
    // Test connection by querying for metadata
    const result = await prisma.$queryRaw`SELECT current_database(), current_user`;
    console.log(`✅ Successfully connected to PostgreSQL`);
    console.log(`📚 Connected to database: ${result[0].current_database}`);
    console.log(`👤 Connected as user: ${result[0].current_user}`);
    
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function verifyConnections() {
  console.log('🔄 Starting database connection verification...');
  
  const mongoSuccess = await verifyMongoDB();
  const postgresSuccess = await verifyPostgreSQL();
  
  console.log('\n📋 CONNECTION VERIFICATION SUMMARY:');
  console.log(`MongoDB: ${mongoSuccess ? '✅ CONNECTED' : '❌ FAILED'}`);
  console.log(`PostgreSQL: ${postgresSuccess ? '✅ CONNECTED' : '❌ FAILED'}`);
  
  if (mongoSuccess && postgresSuccess) {
    console.log('\n🎉 All database connections verified successfully! Ready for deployment.');
    return true;
  } else {
    console.log('\n⚠️ Some database connections failed. Please check your configuration.');
    return false;
  }
}

// Run verification
verifyConnections()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error during verification:', error);
    process.exit(1);
  });
