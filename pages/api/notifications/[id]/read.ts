import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

/**
 * API handler for marking a notification as read
 * - POST: Mark the notification as read
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Ensure user is authenticated
  const session = await getServerSession(req, res, authOptions);
  
  if (!session || !session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const userId = session.user.id;
  const notificationId = req.query.id as string;
  
  // POST: Mark notification as read
  if (req.method === 'POST') {
    try {
      // Verify the notification belongs to the user
      const notification = await prisma.notification.findFirst({
        where: {
          id: notificationId,
          userId
        }
      });
      
      if (!notification) {
        return res.status(404).json({ message: 'Notification not found' });
      }
      
      // Update the notification
      await prisma.notification.update({
        where: { id: notificationId },
        data: { read: true }
      });
      
      return res.status(200).json({ 
        message: 'Notification marked as read',
        notificationId
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return res.status(500).json({ message: 'Failed to mark notification as read' });
    }
  }
  
  // Handle unsupported methods
  return res.status(405).json({ message: 'Method not allowed' });
}
