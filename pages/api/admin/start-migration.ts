import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { PrismaClient } from '@prisma/client';
import { fork } from 'child_process';
import path from 'path';

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

  // Check if migration is already running
  if (migrationState.status === 'running') {
    return res.status(400).json({
      error: 'Migration is already running',
      status: migrationState.status,
      progress: migrationState.progress,
    });
  }

  try {
    // Extract configuration from request body
    const config = req.body;
    
    // Validate configuration
    if (!config) {
      return res.status(400).json({ error: 'Missing migration configuration' });
    }

    // Reset migration status
    migrationState.status = 'running';
    migrationState.progress = {
      totalConversations: 0,
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      currentBatch: 0,
      totalBatches: 0,
      elapsedTime: 0,
      estimatedTimeRemaining: null,
    };
    migrationState.error = null;
    migrationState.logs = [];
    migrationState.startTime = new Date();
    migrationState.endTime = null;

    // Create a new log entry
    migrationState.logs.push('Starting migration process...');
    migrationState.logs.push(`Batch size: ${config.batchSize}, Concurrent batches: ${config.concurrentBatches}`);
    
    if (config.dryRun) {
      migrationState.logs.push('DRY RUN MODE: No data will be written to MongoDB');
    }

    // Start the migration process in a separate process
    const scriptPath = path.resolve(process.cwd(), 'scripts/migrate-kv-to-mongodb.js');
    
    // Fork the process and pass configuration
    const migrationProcess = fork(scriptPath, [], { 
      env: {
        ...process.env,
        MIGRATION_CONFIG: JSON.stringify(config),
      },
      detached: true 
    });

    // Listen for messages from the child process
    migrationProcess.on('message', (message: any) => {
      if (message.type === 'progress') {
        // Update progress
        migrationState.progress = {
          ...migrationState.progress,
          ...message.data
        };
      } else if (message.type === 'log') {
        // Add log entry
        migrationState.logs.push(message.data);
      } else if (message.type === 'complete') {
        // Mark migration as complete
        migrationState.status = 'completed';
        migrationState.endTime = new Date();
        migrationState.logs.push(`Migration completed successfully in ${
          (migrationState.endTime.getTime() - migrationState.startTime!.getTime()) / 1000
        } seconds`);
      } else if (message.type === 'error') {
        // Mark migration as failed
        migrationState.status = 'error';
        migrationState.error = message.data;
        migrationState.endTime = new Date();
        migrationState.logs.push(`Migration failed: ${message.data}`);
      }
    });

    // Handle process exit
    migrationProcess.on('exit', (code) => {
      if (code !== 0 && migrationState.status === 'running') {
        // Process exited with error and status wasn't already updated
        migrationState.status = 'error';
        migrationState.error = `Migration process exited unexpectedly with code ${code}`;
        migrationState.endTime = new Date();
        migrationState.logs.push(`Migration process exited unexpectedly with code ${code}`);
      }
    });

    // Unref the child process to allow the Node.js event loop to exit
    migrationProcess.unref();

    // Return initial status
    return res.status(200).json({
      success: true,
      message: 'Migration started successfully',
      status: migrationState.status,
      progress: migrationState.progress,
      logs: migrationState.logs,
    });
  } catch (error: any) {
    // Handle any unexpected errors
    console.error('Error starting migration:', error);
    
    migrationState.status = 'error';
    migrationState.error = error.message || 'Unknown error starting migration';
    
    return res.status(500).json({
      error: 'Failed to start migration',
      message: error.message || 'Unknown error',
    });
  }
}
