import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

// Define validation schema for preferences
const preferencesSchema = z.object({
  email: z.boolean(),
  inApp: z.boolean(),
  batchSummary: z.boolean(),
});

/**
 * Handler for notification preferences API
 * - GET: Retrieve user's notification preferences
 * - POST: Update user's notification preferences
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Ensure user is authenticated
  const session = await getServerSession(req, res, authOptions);
  
  if (!session || !session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const userId = session.user.id;
  
  // GET: Retrieve user's notification preferences
  if (req.method === 'GET') {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { notificationPreferences: true }
      });
      
      // Default preferences
      const defaultPreferences = {
        email: true,
        inApp: true,
        batchSummary: false
      };
      
      // Parse stored preferences or use defaults
      let preferences = defaultPreferences;
      
      if (user?.notificationPreferences) {
        try {
          preferences = {
            ...defaultPreferences,
            ...JSON.parse(user.notificationPreferences as string)
          };
        } catch (error) {
          console.error('Error parsing notification preferences:', error);
        }
      }
      
      return res.status(200).json({ preferences });
    } catch (error) {
      console.error('Error retrieving notification preferences:', error);
      return res.status(500).json({ message: 'Failed to retrieve notification preferences' });
    }
  }
  
  // POST: Update user's notification preferences
  else if (req.method === 'POST') {
    try {
      const { preferences } = req.body;
      
      // Validate preferences
      const validatedPreferences = preferencesSchema.parse(preferences);
      
      // Update preferences in database
      await prisma.user.update({
        where: { id: userId },
        data: {
          notificationPreferences: JSON.stringify(validatedPreferences)
        }
      });
      
      return res.status(200).json({ 
        message: 'Notification preferences updated',
        preferences: validatedPreferences
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid preferences format',
          errors: error.errors
        });
      }
      
      console.error('Error updating notification preferences:', error);
      return res.status(500).json({ message: 'Failed to update notification preferences' });
    }
  }
  
  // Handle unsupported methods
  else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}
