/**
 * Deployment Setup Script for AgriSmart Platform
 * 
 * This script automates the steps required for deploying the AgriSmart platform:
 * 1. Verifies MongoDB connection
 * 2. Verifies PostgreSQL connection
 * 3. Generates Prisma client
 * 4. Prepares the application for deployment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

// Load environment variables from .env.production
dotenv.config({ path: path.resolve(__dirname, '../.env.production') });

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Ask a question and get user input
 */
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Check if MongoDB connection string is configured
 */
async function checkMongoDBConfig() {
  console.log('\n🔍 Checking MongoDB configuration...');
  
  const connectionString = process.env.MONGODB_URI;
  if (!connectionString || connectionString.includes('<db_password>')) {
    console.log('❌ MongoDB connection string not found or not configured in .env.production');
    
    // Get MongoDB connection details from user
    const username = await askQuestion('Enter MongoDB username: ');
    const password = await askQuestion('Enter MongoDB password: ');
    const cluster = await askQuestion('Enter MongoDB cluster address (e.g., cluster0.sqn15.mongodb.net): ');
    const dbName = await askQuestion('Enter MongoDB database name [agrismart_chat]: ') || 'agrismart_chat';
    
    // Create and save new connection string
    const newConnectionString = `mongodb+srv://${username}:${password}@${cluster}/?retryWrites=true&w=majority&appName=Cluster0`;
    
    // Update .env.production file
    let envContent = fs.readFileSync(path.resolve(__dirname, '../.env.production'), 'utf8');
    if (envContent.includes('MONGODB_URI=')) {
      envContent = envContent.replace(/MONGODB_URI=.*/g, `MONGODB_URI=${newConnectionString}`);
    } else {
      envContent += `\nMONGODB_URI=${newConnectionString}`;
    }
    
    if (envContent.includes('MONGODB_DB_NAME=')) {
      envContent = envContent.replace(/MONGODB_DB_NAME=.*/g, `MONGODB_DB_NAME=${dbName}`);
    } else {
      envContent += `\nMONGODB_DB_NAME=${dbName}`;
    }
    
    fs.writeFileSync(path.resolve(__dirname, '../.env.production'), envContent);
    console.log('✅ MongoDB configuration updated in .env.production');
    
    return newConnectionString;
  }
  
  console.log('✅ MongoDB connection string found in .env.production');
  return connectionString;
}

/**
 * Check if PostgreSQL connection string is configured
 */
async function checkPostgreSQLConfig() {
  console.log('\n🔍 Checking PostgreSQL configuration...');
  
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString || connectionString.includes('your_password')) {
    console.log('❌ Valid PostgreSQL connection string not found in .env.production');
    
    // Get PostgreSQL connection details from user
    const host = await askQuestion('Enter PostgreSQL host (e.g., db.abcdef.supabase.co): ');
    const username = await askQuestion('Enter PostgreSQL username [postgres]: ') || 'postgres';
    const password = await askQuestion('Enter PostgreSQL password: ');
    const dbName = await askQuestion('Enter PostgreSQL database name [postgres]: ') || 'postgres';
    const port = await askQuestion('Enter PostgreSQL port [5432]: ') || '5432';
    
    // Create and save new connection string
    const newConnectionString = `postgresql://${username}:${password}@${host}:${port}/${dbName}`;
    
    // Update .env.production file
    let envContent = fs.readFileSync(path.resolve(__dirname, '../.env.production'), 'utf8');
    if (envContent.includes('DATABASE_URL=')) {
      envContent = envContent.replace(/DATABASE_URL=.*/g, `DATABASE_URL=${newConnectionString}`);
    } else {
      envContent += `\nDATABASE_URL=${newConnectionString}`;
    }
    
    fs.writeFileSync(path.resolve(__dirname, '../.env.production'), envContent);
    console.log('✅ PostgreSQL configuration updated in .env.production');
    
    return newConnectionString;
  }
  
  console.log('✅ PostgreSQL connection string found in .env.production');
  return connectionString;
}

/**
 * Generate Prisma client
 */
async function generatePrismaClient() {
  console.log('\n🔄 Generating Prisma client...');
  try {
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Prisma client generated successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to generate Prisma client:', error.message);
    return false;
  }
}

/**
 * Test MongoDB connection
 */
async function testMongoDBConnection(connectionString) {
  console.log('\n🔄 Testing MongoDB connection...');
  
  if (!connectionString) {
    console.error('❌ MongoDB connection string is not defined');
    return false;
  }
  
  const client = new MongoClient(connectionString);
  
  try {
    await client.connect();
    console.log('✅ Successfully connected to MongoDB');
    
    const dbName = process.env.MONGODB_DB_NAME || 'agrismart_chat';
    const db = client.db(dbName);
    
    // Check if required collections exist, create them if they don't
    const collections = ['conversations', 'messages', 'metadata', 'metrics'];
    const existingCollections = await db.listCollections().toArray();
    const existingCollectionNames = existingCollections.map(c => c.name);
    
    for (const collection of collections) {
      if (!existingCollectionNames.includes(collection)) {
        console.log(`🔄 Creating collection: ${collection}`);
        await db.createCollection(collection);
        console.log(`✅ Collection created: ${collection}`);
      } else {
        console.log(`✅ Collection exists: ${collection}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  } finally {
    await client.close();
  }
}

/**
 * Run full deployment setup
 */
async function setupDeployment() {
  console.log('🚀 Starting AgriSmart deployment setup...');
  
  // Step 1: Check MongoDB configuration
  const mongoDbConnectionString = await checkMongoDBConfig();
  
  // Step 2: Check PostgreSQL configuration
  const postgresConnectionString = await checkPostgreSQLConfig();
  
  // Step 3: Test MongoDB connection
  const mongoDbConnected = await testMongoDBConnection(mongoDbConnectionString);
  
  // Step 4: Generate Prisma client
  const prismaGenerated = await generatePrismaClient();
  
  // Step 5: Prepare application for deployment
  console.log('\n🔄 Preparing application for deployment...');
  
  if (mongoDbConnected && prismaGenerated) {
    console.log('🎉 Deployment setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Push your code to GitHub');
    console.log('2. Connect your repository to Vercel');
    console.log('3. Add your environment variables to Vercel');
    console.log('4. Deploy your application');
    console.log('\nRefer to DEPLOYMENT.md for detailed instructions.');
  } else {
    console.log('⚠️ Deployment setup completed with warnings. Please check the errors above.');
  }
  
  rl.close();
}

// Run the script
setupDeployment().catch((error) => {
  console.error('Fatal error during deployment setup:', error);
  rl.close();
  process.exit(1);
});
