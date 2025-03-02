import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { getUserConversations } from '../../../../lib/chat/chat-integration';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const userId = session.user.id;
  
  // Get conversations for this user from MongoDB
  try {
    const conversations = await getUserConversations(userId);
    
    // Map conversations to a simplified format for the client
    const simplifiedConversations = conversations.map((conversation) => ({
      id: conversation.id,
      title: conversation.title || conversation.messages.find(m => m.role === 'user')?.content.substring(0, 50) || 'New conversation',
      updatedAt: conversation.updatedAt,
      messageCount: conversation.messages.length,
    }));
    
    return res.status(200).json(simplifiedConversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return res.status(500).json({ error: 'Failed to fetch conversations' });
  }
}
