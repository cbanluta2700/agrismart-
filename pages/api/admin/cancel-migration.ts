import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { PrismaClient } from '@prisma/client';

// Import shared migration state
import migrationState from './shared/migration-state';

// Validate admin API key
const validateAdminApiKey = (req: NextApiRequest): boolean => {
  const apiKey = req.headers['x-api-key'];
  return apiKey === process.env.ADMIN_API_KEY;
};

// Check if user is admin
const isUserAdmin = async (userId: string): Promise<boolean> => {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return user?.role === 'ADMIN';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authenticate request - must be admin user or have admin API key
  let isAuthenticated = validateAdminApiKey(req);

  if (!isAuthenticated) {
    const session = await getSession({ req });
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    isAuthenticated = await isUserAdmin(session.user.id);
    if (!isAuthenticated) {
      return res.status(403).json({ error: 'Forbidden - Admin access required' });
    }
  }

  // Check if migration is running
  if (migrationState.status !== 'running') {
    return res.status(400).json({
      error: 'No active migration to cancel',
      status: migrationState.status,
    });
  }

  try {
    // Update migration state
    migrationState.status = 'idle';
    migrationState.logs.push('Migration cancelled by administrator');
    migrationState.endTime = new Date();
    
    // Send signal to cancel migration (in a production environment, you would
    // signal the worker process to gracefully terminate)
    // For now, we're just updating the state since we don't have a real process ID stored

    return res.status(200).json({
      success: true,
      message: 'Migration cancelled successfully',
      status: migrationState.status,
    });
  } catch (error: any) {
    console.error('Error cancelling migration:', error);
    
    return res.status(500).json({
      error: 'Failed to cancel migration',
      message: error.message || 'Unknown error',
    });
  }
}
