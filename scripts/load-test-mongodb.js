// Load testing script for MongoDB chat storage
const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const { performance } = require('perf_hooks');

// Load environment variables
dotenv.config();

// MongoDB connection details
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DB_NAME || 'agrismart_chat';

// Test parameters (can be adjusted)
const NUM_CONVERSATIONS = 50;
const MESSAGES_PER_CONVERSATION = 20;
const NUM_CONCURRENT_WRITES = 10;
const NUM_CONCURRENT_READS = 20;

// Main function
async function runLoadTest() {
  console.log('Starting MongoDB load test...');
  console.log(`Testing with ${NUM_CONVERSATIONS} conversations, ${MESSAGES_PER_CONVERSATION} messages each`);
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(dbName);
    const conversations = db.collection('conversations_test');
    
    // Create test collection if it doesn't exist
    if (!await collections.findOne({ name: 'conversations_test' })) {
      await db.createCollection('conversations_test');
    }
    
    // Clear any existing test data
    await conversations.deleteMany({});
    
    // Setup indexes similar to production
    await conversations.createIndexes([
      { key: { userId: 1 }, name: 'userId_idx' },
      { key: { updatedAt: -1 }, name: 'updatedAt_idx' },
      { key: { userId: 1, updatedAt: -1 }, name: 'userId_updatedAt_idx' },
    ]);
    
    // Generate test data
    const testData = [];
    for (let i = 0; i < NUM_CONVERSATIONS; i++) {
      const msgs = [];
      for (let j = 0; j < MESSAGES_PER_CONVERSATION; j++) {
        msgs.push({
          role: j % 2 === 0 ? 'user' : 'assistant',
          content: `Test message ${j + 1} for conversation ${i + 1}. ${'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(5)}`,
          timestamp: new Date(Date.now() - (MESSAGES_PER_CONVERSATION - j) * 60000)
        });
      }
      
      testData.push({
        id: `test-conversation-${i + 1}`,
        userId: `test-user-${Math.floor(i / 5) + 1}`, // Group conversations by user
        title: `Test Conversation ${i + 1}`,
        messages: msgs,
        createdAt: new Date(Date.now() - 3600000),
        updatedAt: new Date()
      });
    }
    
    // Test 1: Bulk insert performance
    console.log('\n--- Test 1: Bulk Insert Performance ---');
    const startBulkInsert = performance.now();
    await conversations.insertMany(testData);
    const endBulkInsert = performance.now();
    
    console.log(`Inserted ${testData.length} conversations with ${testData.length * MESSAGES_PER_CONVERSATION} total messages`);
    console.log(`Time taken: ${(endBulkInsert - startBulkInsert).toFixed(2)}ms`);
    console.log(`Average per conversation: ${((endBulkInsert - startBulkInsert) / testData.length).toFixed(2)}ms`);
    
    // Test 2: Concurrent read performance
    console.log('\n--- Test 2: Concurrent Read Performance ---');
    const readPromises = [];
    const readStartTimes = [];
    
    for (let i = 0; i < NUM_CONCURRENT_READS; i++) {
      const randomUserId = `test-user-${Math.floor(Math.random() * 10) + 1}`;
      readStartTimes[i] = performance.now();
      readPromises.push(
        conversations.find({ userId: randomUserId })
          .sort({ updatedAt: -1 })
          .toArray()
          .then(results => {
            const endTime = performance.now();
            return { count: results.length, time: endTime - readStartTimes[i] };
          })
      );
    }
    
    const readResults = await Promise.all(readPromises);
    const totalReadTime = readResults.reduce((sum, result) => sum + result.time, 0);
    const avgReadTime = totalReadTime / readResults.length;
    
    console.log(`Completed ${NUM_CONCURRENT_READS} concurrent read operations`);
    console.log(`Average read time: ${avgReadTime.toFixed(2)}ms per request`);
    console.log(`Total read time: ${totalReadTime.toFixed(2)}ms`);
    
    // Test 3: Write performance (append messages)
    console.log('\n--- Test 3: Write Performance (Append Messages) ---');
    const writePromises = [];
    const writeStartTimes = [];
    
    for (let i = 0; i < NUM_CONCURRENT_WRITES; i++) {
      const randomConversationId = `test-conversation-${Math.floor(Math.random() * NUM_CONVERSATIONS) + 1}`;
      const newMessage = {
        role: 'user',
        content: `New append test message ${i + 1}. ${'Testing append performance with realistic message size. '.repeat(3)}`,
        timestamp: new Date()
      };
      
      writeStartTimes[i] = performance.now();
      writePromises.push(
        conversations.updateOne(
          { id: randomConversationId },
          { 
            $push: { messages: newMessage },
            $set: { updatedAt: new Date() }
          }
        ).then(() => {
          const endTime = performance.now();
          return { time: endTime - writeStartTimes[i] };
        })
      );
    }
    
    const writeResults = await Promise.all(writePromises);
    const totalWriteTime = writeResults.reduce((sum, result) => sum + result.time, 0);
    const avgWriteTime = totalWriteTime / writeResults.length;
    
    console.log(`Completed ${NUM_CONCURRENT_WRITES} concurrent write operations`);
    console.log(`Average write time: ${avgWriteTime.toFixed(2)}ms per request`);
    console.log(`Total write time: ${totalWriteTime.toFixed(2)}ms`);
    
    // Test 4: Query by recent conversations across users
    console.log('\n--- Test 4: Query Recent Conversations Performance ---');
    const startRecentQuery = performance.now();
    const recentConversations = await conversations
      .find({})
      .sort({ updatedAt: -1 })
      .limit(20)
      .toArray();
    const endRecentQuery = performance.now();
    
    console.log(`Retrieved ${recentConversations.length} recent conversations`);
    console.log(`Time taken: ${(endRecentQuery - startRecentQuery).toFixed(2)}ms`);
    
    // Test 5: Full conversation retrieval performance
    console.log('\n--- Test 5: Full Conversation Retrieval Performance ---');
    const retrievalTimes = [];
    
    for (let i = 0; i < 10; i++) {
      const randomConversationId = `test-conversation-${Math.floor(Math.random() * NUM_CONVERSATIONS) + 1}`;
      const startRetrieval = performance.now();
      const conversation = await conversations.findOne({ id: randomConversationId });
      const endRetrieval = performance.now();
      
      retrievalTimes.push(endRetrieval - startRetrieval);
      console.log(`Retrieved conversation ${randomConversationId} with ${conversation.messages.length} messages in ${(endRetrieval - startRetrieval).toFixed(2)}ms`);
    }
    
    const avgRetrievalTime = retrievalTimes.reduce((sum, time) => sum + time, 0) / retrievalTimes.length;
    console.log(`Average full conversation retrieval time: ${avgRetrievalTime.toFixed(2)}ms`);
    
    // Clean up test collection
    await conversations.deleteMany({});
    console.log('\nTest collection cleaned up');
    
    console.log('\n--- Summary ---');
    console.log(`Bulk insert: ${((endBulkInsert - startBulkInsert) / testData.length).toFixed(2)}ms per conversation`);
    console.log(`Concurrent reads: ${avgReadTime.toFixed(2)}ms per request`);
    console.log(`Concurrent writes: ${avgWriteTime.toFixed(2)}ms per request`);
    console.log(`Recent conversations query: ${(endRecentQuery - startRecentQuery).toFixed(2)}ms`);
    console.log(`Full conversation retrieval: ${avgRetrievalTime.toFixed(2)}ms`);
    
  } catch (error) {
    console.error('Error during load test:', error);
  } finally {
    await client.close();
    console.log('Load test completed, MongoDB connection closed');
  }
}

// Run the load test
runLoadTest().catch(console.error);
