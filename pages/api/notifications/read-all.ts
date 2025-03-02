import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

/**
 * API handler for marking all notifications as read
 * - POST: Mark all of the user's notifications as read
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Ensure user is authenticated
  const session = await getServerSession(req, res, authOptions);
  
  if (!session || !session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const userId = session.user.id;
  
  // POST: Mark all notifications as read
  if (req.method === 'POST') {
    try {
      // Update all unread notifications for the user
      const { count } = await prisma.notification.updateMany({
        where: {
          userId,
          read: false
        },
        data: {
          read: true
        }
      });
      
      return res.status(200).json({ 
        message: 'All notifications marked as read',
        count
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return res.status(500).json({ message: 'Failed to mark all notifications as read' });
    }
  }
  
  // Handle unsupported methods
  return res.status(405).json({ message: 'Method not allowed' });
}
