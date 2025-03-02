import { OpenAIStream, StreamingTextResponse } from 'ai';
import { OpenAI } from 'openai';
import prisma from '../prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../pages/api/auth/[...nextauth]';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { fluidCompute } from '../../utils/serverUtils';
import { 
  findConversationById, 
  findConversationsByUserId, 
  insertConversation, 
  updateConversation, 
  deleteConversation,
  addMessageToConversation,
  ChatConversation
} from './mongodb';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Validate chat message input
export const chatMessageSchema = z.object({
  message: z.string().min(1).max(4000),
  conversationId: z.string().optional(),
  parentMessageId: z.string().optional(),
  contextData: z.record(z.any()).optional(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

// Message formatting for OpenAI
type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

// Store conversation in MongoDB
export const storeConversation = fluidCompute(
  async (conversationId: string, messages: Message[], userId: string) => {
    const existingConversation = await findConversationById(conversationId);
    
    if (existingConversation) {
      // Update existing conversation
      await updateConversation(conversationId, {
        messages,
        updatedAt: new Date()
      });
    } else {
      // Create new conversation
      const title = messages.find(m => m.role === 'user')?.content.substring(0, 50) || 'New conversation';
      
      await insertConversation({
        id: conversationId,
        userId,
        messages,
        title,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }
);

// Get conversation from MongoDB
export const getConversation = fluidCompute(
  async (conversationId: string, userId: string) => {
    const conversation = await findConversationById(conversationId);
    
    // Verify this conversation belongs to the user
    if (conversation && conversation.userId !== userId) {
      throw new Error('Unauthorized access to conversation');
    }
    
    return conversation;
  }
);

// Get user's conversations list from MongoDB
export const getUserConversations = fluidCompute(
  async (userId: string) => {
    const conversations = await findConversationsByUserId(userId);
    return conversations.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }
);

// Create chat completion using OpenAI
export const createChatCompletion = fluidCompute(
  async (chatMessage: ChatMessage) => {
    // Get session to verify user is logged in
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      throw new Error('User must be logged in');
    }
    
    const userId = session.user.id;
    const { message, conversationId, parentMessageId, contextData } = chatMessage;
    
    // Create or retrieve conversation
    const id = conversationId || nanoid();
    const createdAt = new Date().toISOString();
    
    // Get existing conversation or create new
    let messages: Message[] = [];
    
    if (conversationId) {
      const existingConversation = await getConversation(conversationId, userId);
      if (existingConversation) {
        messages = existingConversation.messages;
      }
    }

    // Retrieve user-specific data from database to enhance context
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        farms: true,
      },
    });
    
    // Create system message with AgriSmart context
    if (messages.length === 0) {
      // Add system message with AgriSmart-specific context
      messages.push({
        role: 'system',
        content: `You are an AI assistant for AgriSmart, a platform for sustainable agriculture.
          User information: ${user?.name || 'User'} manages ${user?.farms?.length || 0} farms.
          ${contextData ? `Additional context: ${JSON.stringify(contextData)}` : ''}
          Provide helpful, accurate information about sustainable farming practices, crop management, and agricultural technologies.
          When discussing farming practices, focus on environmentally friendly approaches.
          If you don't know something specific about the user's farm, you can ask them for details.`
      });
    }
    
    // Add the new user message
    messages.push({
      role: 'user',
      content: message,
    });
    
    // Store the conversation with the user message
    await storeConversation(id, messages, userId);
    
    // Generate response from OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages,
      stream: true,
    });
    
    const stream = OpenAIStream(response, {
      onCompletion: async (completion) => {
        // Add the assistant's response to the stored conversation
        messages.push({
          role: 'assistant',
          content: completion,
        });
        
        await storeConversation(id, messages, userId);
        
        // Track chat usage for analytics
        await prisma.chatUsage.create({
          data: {
            userId,
            conversationId: id,
            messageCount: 1,
            tokensUsed: completion.length / 3, // Rough estimate
            createdAt: new Date(),
          },
        });
      },
    });
    
    // Return streaming response with additional metadata
    return { stream, conversationId: id };
  }
);

// Delete a conversation
export const deleteConversation = fluidCompute(
  async (conversationId: string) => {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      throw new Error('User must be logged in');
    }
    
    const userId = session.user.id;
    
    // Verify ownership
    const conversation = await getConversation(conversationId, userId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    
    // Delete from MongoDB
    await deleteConversation(conversationId);
    
    return { success: true };
  }
);

// Add AgriSmart-specific context to a conversation
export const addAgriSmartContext = fluidCompute(
  async (conversationId: string, contextData: Record<string, any>) => {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      throw new Error('User must be logged in');
    }
    
    const userId = session.user.id;
    
    // Get existing conversation
    const conversation = await getConversation(conversationId, userId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    
    const messages = conversation.messages;
    
    // Update system message with new context if it exists
    if (messages.length > 0 && messages[0].role === 'system') {
      messages[0].content += `\nUpdated context: ${JSON.stringify(contextData)}`;
    } else {
      // Insert system message at the beginning
      messages.unshift({
        role: 'system',
        content: `AgriSmart context: ${JSON.stringify(contextData)}`,
      });
    }
    
    // Store updated conversation
    await storeConversation(conversationId, messages, userId);
    
    return { success: true };
  }
);
