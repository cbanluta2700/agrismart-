/**
 * Simple MongoDB Connection Test
 * 
 * This script tests a MongoDB connection using the minimal required configuration.
 */

const { MongoClient } = require('mongodb');

// Connection URI from command line
const uri = process.argv[2];
if (!uri) {
  console.error('Please provide a MongoDB connection string as the first argument');
  process.exit(1);
}

// Create a new MongoClient with minimal options
const client = new MongoClient(uri, {
  // Disable serverApi for simplicity
  connectTimeoutMS: 5000,
  socketTimeoutMS: 30000
});

async function run() {
  try {
    console.log('Attempting to connect to MongoDB...');
    await client.connect();
    console.log('Connected successfully to MongoDB server');
    
    // List databases to verify connection
    const adminDb = client.db('admin');
    const result = await adminDb.command({ ping: 1 });
    console.log('Ping command result:', result);
    
    const dbs = await client.db().admin().listDatabases();
    console.log('Available databases:');
    dbs.databases.forEach(db => {
      console.log(` - ${db.name}`);
    });
  } catch (err) {
    console.error('Connection error:', err);
  } finally {
    await client.close();
    console.log('Connection closed');
  }
}

run().catch(console.error);
