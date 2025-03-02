import { MongoClient, Collection, Db } from 'mongodb';

// Types
export interface ChatConversation {
  id: string;
  userId: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
    timestamp?: Date;
  }>;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

// Connection pooling variables
let client: MongoClient | null = null;
let database: Db | null = null;
let isConnecting = false;
let connectionPromise: Promise<{ client: MongoClient; db: Db; conversations: Collection<ChatConversation>; }> | null = null;

// Database configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'agrismart_chat';

// Connection options with pooling
const connectionOptions = {
  maxPoolSize: 10,           // Maximum number of connections in the pool
  minPoolSize: 5,            // Minimum number of connections in the pool
  maxIdleTimeMS: 30000,      // How long a connection can remain idle before being removed from the pool
  connectTimeoutMS: 5000,    // How long to wait for a connection to be established before timing out
  socketTimeoutMS: 30000     // How long to wait on idle socket operations before timing out
};

// Collection names
const COLLECTIONS = {
  CONVERSATIONS: 'conversations',
  ANALYTICS: 'chat_analytics',
};

/**
 * Connect to MongoDB with connection pooling
 * This function will reuse existing connections when possible
 */
export async function connectToDatabase(): Promise<{
  client: MongoClient;
  db: Db;
  conversations: Collection<ChatConversation>;
}> {
  // If we already have an active connection, return it
  if (client && database) {
    return { 
      client, 
      db: database, 
      conversations: database.collection<ChatConversation>(COLLECTIONS.CONVERSATIONS)
    };
  }

  // If a connection is already in progress, return the promise
  if (isConnecting && connectionPromise) {
    return connectionPromise;
  }

  // Set connecting flag and create a new connection
  isConnecting = true;
  connectionPromise = (async () => {
    try {
      // Check if we need to create a new client
      if (!client) {
        client = new MongoClient(MONGODB_URI, connectionOptions);
        console.log('Creating new MongoDB connection pool...');
      }

      // Connect to MongoDB if not already connected
      if (!client.topology || !client.topology.isConnected()) {
        await client.connect();
        console.log('Connected to MongoDB');
      }

      // Get database
      database = client.db(MONGODB_DB_NAME);

      // Get the conversations collection
      const conversations = database.collection<ChatConversation>(COLLECTIONS.CONVERSATIONS);

      // Create indexes if they don't exist
      await conversations.createIndexes([
        { key: { userId: 1 }, name: 'userId_idx' },
        { key: { updatedAt: -1 }, name: 'updatedAt_idx' },
        { key: { userId: 1, updatedAt: -1 }, name: 'userId_updatedAt_idx' }
      ]);

      return { client, db: database, conversations };
    } catch (error) {
      console.error('MongoDB connection error:', error);
      
      // Reset connection variables on error
      client = null;
      database = null;
      
      throw error;
    } finally {
      // Reset connection flags
      isConnecting = false;
      connectionPromise = null;
    }
  })();

  return connectionPromise;
}

/**
 * Close the MongoDB connection pool
 * This should be called when the application is shutting down
 */
export async function closeMongoDBConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    database = null;
    console.log('MongoDB connection closed');
  }
}

/**
 * Helper function to check if MongoDB is connected
 */
export function isMongoDBConnected(): boolean {
  return !!(client && client.topology && client.topology.isConnected());
}

/**
 * Get MongoDB connection statistics
 */
export function getMongoDBConnectionStats(): any {
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

// Helper functions for conversation operations
export async function findConversationById(conversationId: string): Promise<ChatConversation | null> {
  const { conversations } = await connectToDatabase();
  return conversations.findOne({ id: conversationId });
}

export async function findConversationsByUserId(userId: string): Promise<ChatConversation[]> {
  const { conversations } = await connectToDatabase();
  return conversations
    .find({ userId })
    .sort({ updatedAt: -1 })
    .toArray();
}

export async function insertConversation(conversation: ChatConversation): Promise<void> {
  const { conversations } = await connectToDatabase();
  await conversations.insertOne(conversation);
}

export async function updateConversation(
  conversationId: string,
  updates: Partial<ChatConversation>
): Promise<void> {
  const { conversations } = await connectToDatabase();
  await conversations.updateOne(
    { id: conversationId },
    { $set: { ...updates, updatedAt: new Date() } }
  );
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const { conversations } = await connectToDatabase();
  await conversations.deleteOne({ id: conversationId });
}

// Add messages to a conversation
export async function addMessageToConversation(
  conversationId: string,
  message: { role: 'system' | 'user' | 'assistant'; content: string }
): Promise<void> {
  const { conversations } = await connectToDatabase();
  await conversations.updateOne(
    { id: conversationId },
    { 
      $push: { messages: { ...message, timestamp: new Date() } }, 
      $set: { updatedAt: new Date() } 
    }
  );
}
