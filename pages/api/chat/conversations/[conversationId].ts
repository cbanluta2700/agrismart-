import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { 
  getConversation, 
  deleteConversation as deleteChatConversation,
  addAgriSmartContext 
} from '../../../../lib/chat/chat-integration';

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
  const { conversationId } = req.query;
  
  if (!conversationId || typeof conversationId !== 'string') {
    return res.status(400).json({ error: 'Invalid conversation ID' });
  }
  
  try {
    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        const conversation = await getConversation(conversationId, userId);
        
        if (!conversation) {
          return res.status(404).json({ error: 'Conversation not found' });
        }
        
        return res.status(200).json(conversation);
        
      case 'DELETE':
        const deleteResult = await deleteChatConversation(conversationId);
        return res.status(200).json(deleteResult);
        
      case 'PATCH':
        // For updating context data
        const { contextData } = req.body;
        
        if (!contextData) {
          return res.status(400).json({ error: 'Context data is required' });
        }
        
        const updateResult = await addAgriSmartContext(conversationId, contextData);
        return res.status(200).json(updateResult);
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error(`Error handling conversation ${conversationId}:`, error);
    return res.status(500).json({
      error: 'Failed to process conversation',
      message: error.message,
    });
  }
}
