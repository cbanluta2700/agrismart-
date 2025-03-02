import { NextRequest, NextResponse } from 'next/server';
import { createChatCompletion, chatMessageSchema } from '../../../lib/chat/chat-integration';
import { StreamingTextResponse } from 'ai';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../api/auth/[...nextauth]';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: NextRequest) {
  try {
    // Verify method
    if (req.method !== 'POST') {
      return new NextResponse(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405 }
      );
    }
    
    // Get session to verify user is logged in with Google
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized - please sign in with your Google account' }),
        { status: 401 }
      );
    }
    
    // Parse and validate input
    const body = await req.json();
    const result = chatMessageSchema.safeParse(body);
    
    if (!result.success) {
      return new NextResponse(
        JSON.stringify({
          error: 'Invalid request format',
          details: result.error.format(),
        }),
        { status: 400 }
      );
    }
    
    // Generate response
    const { stream, conversationId } = await createChatCompletion(result.data);
    
    // Return streaming response with conversation ID in header
    const streamingResponse = new StreamingTextResponse(stream);
    streamingResponse.headers.set('X-Conversation-ID', conversationId);
    
    return streamingResponse;
  } catch (error: any) {
    console.error('Chat API error:', error);
    
    return new NextResponse(
      JSON.stringify({
        error: 'Error processing chat request',
        message: error.message,
      }),
      { status: 500 }
    );
  }
}
