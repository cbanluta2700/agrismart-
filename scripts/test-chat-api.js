// Test script for Chat API integration with MongoDB
const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN; // Should be set with a valid user token

// API client with authorization
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`
  }
});

async function testChatAPI() {
  console.log('🔍 Testing Chat API with MongoDB integration');
  console.log(`API URL: ${API_URL}`);
  
  try {
    // Step 1: Create a new conversation
    console.log('\n📝 Step 1: Creating a new conversation...');
    const createResponse = await apiClient.post('/chat', {
      message: 'This is a test message for MongoDB integration',
    });
    
    // Get conversation ID from response headers
    const conversationId = createResponse.headers['x-conversation-id'];
    console.log(`✅ Conversation created with ID: ${conversationId}`);
    console.log(`Response status: ${createResponse.status}`);
    
    // Step 2: Get list of conversations
    console.log('\n📋 Step 2: Getting list of conversations...');
    const listResponse = await apiClient.get('/chat/conversations');
    console.log(`✅ Retrieved ${listResponse.data.length} conversations`);
    console.log(`Response status: ${listResponse.status}`);
    
    // Step 3: Get the specific conversation
    console.log('\n🔍 Step 3: Getting specific conversation details...');
    const conversationResponse = await apiClient.get(`/chat/conversations/${conversationId}`);
    console.log(`✅ Retrieved conversation: ${conversationResponse.data.title}`);
    console.log(`Messages: ${conversationResponse.data.messages.length}`);
    console.log(`Response status: ${conversationResponse.status}`);
    
    // Step 4: Update conversation with context
    console.log('\n✏️ Step 4: Updating conversation with context...');
    const updateResponse = await apiClient.patch(`/chat/conversations/${conversationId}`, {
      contextData: {
        testKey: 'testValue',
        timestamp: new Date().toISOString()
      }
    });
    console.log(`✅ Update successful: ${updateResponse.data.success}`);
    console.log(`Response status: ${updateResponse.status}`);
    
    // Step 5: Add another message to the conversation
    console.log('\n💬 Step 5: Adding another message to the conversation...');
    const messageResponse = await apiClient.post('/chat', {
      message: 'This is a follow-up message for testing',
      conversationId
    });
    console.log(`✅ Message added to conversation`);
    console.log(`Response status: ${messageResponse.status}`);
    
    // Step 6: Get updated conversation
    console.log('\n🔍 Step 6: Getting updated conversation...');
    const updatedResponse = await apiClient.get(`/chat/conversations/${conversationId}`);
    console.log(`✅ Retrieved updated conversation`);
    console.log(`Messages: ${updatedResponse.data.messages.length}`);
    console.log(`Response status: ${updatedResponse.status}`);
    
    // Step 7: Delete the test conversation
    console.log('\n🧹 Step 7: Cleaning up test conversation...');
    const deleteResponse = await apiClient.delete(`/chat/conversations/${conversationId}`);
    console.log(`✅ Deletion successful: ${deleteResponse.data.success}`);
    console.log(`Response status: ${deleteResponse.status}`);
    
    console.log('\n✅ Chat API test completed successfully');
  } catch (error) {
    console.error('\n❌ Error testing Chat API:', error.response ? {
      status: error.response.status,
      data: error.response.data
    } : error.message);
  }
}

// Run the test
console.log('⚠️ Note: This test requires a valid authentication token to be set as TEST_AUTH_TOKEN');
console.log('If you have not set this environment variable, the tests will fail with authentication errors.\n');

testChatAPI().catch(console.error);
