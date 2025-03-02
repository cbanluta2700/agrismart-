// Test script for MongoDB integration
const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'agrismart_chat';

async function main() {
  console.log('🔍 Testing MongoDB connection...');
  console.log(`URI: ${MONGODB_URI}`);
  console.log(`Database: ${MONGODB_DB_NAME}`);
  
  let client;
  
  try {
    // Create MongoDB client
    client = new MongoClient(MONGODB_URI);
    
    // Connect to MongoDB
    await client.connect();
    console.log('✅ Successfully connected to MongoDB');
    
    // Get database reference
    const db = client.db(MONGODB_DB_NAME);
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log('\n📋 Collections in database:');
    if (collections.length === 0) {
      console.log('  No collections found');
    } else {
      collections.forEach(collection => {
        console.log(`  - ${collection.name}`);
      });
    }
    
    // Test create a dummy conversation
    const testConversation = {
      id: `test-${Date.now()}`,
      userId: 'test-user',
      messages: [
        { role: 'system', content: 'This is a test system message', timestamp: new Date() },
        { role: 'user', content: 'This is a test user message', timestamp: new Date() },
        { role: 'assistant', content: 'This is a test assistant response', timestamp: new Date() }
      ],
      title: 'Test Conversation',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('\n📝 Creating test conversation...');
    const conversationsCollection = db.collection('conversations');
    const result = await conversationsCollection.insertOne(testConversation);
    console.log(`✅ Test conversation created with ID: ${testConversation.id}`);
    
    // Verify retrieval
    console.log('\n🔍 Retrieving test conversation...');
    const retrievedConversation = await conversationsCollection.findOne({ id: testConversation.id });
    console.log('✅ Successfully retrieved conversation:');
    console.log(`  Title: ${retrievedConversation.title}`);
    console.log(`  User ID: ${retrievedConversation.userId}`);
    console.log(`  Messages: ${retrievedConversation.messages.length}`);
    
    // Clean up test conversation
    console.log('\n🧹 Cleaning up test conversation...');
    await conversationsCollection.deleteOne({ id: testConversation.id });
    console.log('✅ Test conversation deleted');
    
    console.log('\n✅ MongoDB connection test completed successfully');
  } catch (error) {
    console.error('\n❌ Error connecting to MongoDB:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
}

main().catch(console.error);
