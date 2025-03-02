import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { PrismaClient } from '@prisma/client';

const connectionMonitor = require('../../../lib/monitoring/connection-status');

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
  // Only allow GET and POST methods
  if (req.method !== 'GET' && req.method !== 'POST') {
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

  // Handle GET request - return current status
  if (req.method === 'GET') {
    try {
      // Check if we should refresh the status
      const refresh = req.query.refresh === 'true';
      
      if (refresh) {
        // Perform a fresh check of all connections
        await connectionMonitor.checkAllConnections();
      }
      
      // Return the current status
      const status = connectionMonitor.getConnectionStatus();
      
      return res.status(200).json({
        success: true,
        timestamp: new Date().toISOString(),
        status
      });
    } catch (error: any) {
      return res.status(500).json({
        error: 'Failed to retrieve database status',
        message: error.message
      });
    }
  } 
  // Handle POST request - manage automatic checks or specific actions
  else if (req.method === 'POST') {
    try {
      const { action, config } = req.body;
      
      if (action === 'start-automatic-checks') {
        connectionMonitor.startAutomaticChecks();
        return res.status(200).json({
          success: true,
          message: 'Automatic database connection checks started',
          status: connectionMonitor.getConnectionStatus()
        });
      } 
      else if (action === 'stop-automatic-checks') {
        connectionMonitor.stopAutomaticChecks();
        return res.status(200).json({
          success: true,
          message: 'Automatic database connection checks stopped',
          status: connectionMonitor.getConnectionStatus()
        });
      }
      else if (action === 'check-now') {
        await connectionMonitor.checkAllConnections();
        return res.status(200).json({
          success: true,
          message: 'Database connection check completed',
          status: connectionMonitor.getConnectionStatus()
        });
      }
      else if (action === 'update-config' && config) {
        const updatedConfig = connectionMonitor.updateConfig(config);
        return res.status(200).json({
          success: true,
          message: 'Connection monitor configuration updated',
          config: updatedConfig
        });
      }
      else {
        return res.status(400).json({
          error: 'Invalid action',
          message: 'Supported actions: start-automatic-checks, stop-automatic-checks, check-now, update-config'
        });
      }
    } catch (error: any) {
      return res.status(500).json({
        error: 'Failed to process request',
        message: error.message
      });
    }
  }
}
