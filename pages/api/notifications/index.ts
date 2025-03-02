import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

/**
 * API handler for fetching user notifications
 * - GET: Retrieve notifications for the authenticated user
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Ensure user is authenticated
  const session = await getServerSession(req, res, authOptions);
  
  if (!session || !session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const userId = session.user.id;
  
  // GET: Retrieve notifications
  if (req.method === 'GET') {
    try {
      const { limit = '20', offset = '0', unreadOnly = 'false' } = req.query;
      
      // Build where clause
      const where = {
        userId,
        ...(unreadOnly === 'true' ? { read: false } : {})
      };
      
      // Query for notifications
      const notifications = await prisma.notification.findMany({
        where,
        orderBy: {
          createdAt: 'desc'
        },
        take: parseInt(limit as string),
        skip: parseInt(offset as string)
      });
      
      // Get total count
      const totalCount = await prisma.notification.count({ where });
      
      // Get unread count
      const unreadCount = await prisma.notification.count({
        where: {
          userId,
          read: false
        }
      });
      
      return res.status(200).json({
        notifications,
        totalCount,
        unreadCount
      });
    } catch (error) {
      console.error('Error retrieving notifications:', error);
      return res.status(500).json({ message: 'Failed to retrieve notifications' });
    }
  }
  
  // Handle unsupported methods
  return res.status(405).json({ message: 'Method not allowed' });
}
