import { NextApiRequest, NextApiResponse } from 'next';
import { fork, ChildProcess } from 'child_process';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import validateAdminRequest from '../../../lib/auth/validateAdminRequest';
import migrationState from './shared/migration-state';

let migrationProcess: ChildProcess | null = null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Validate admin access
  const isAdmin = await validateAdminRequest(req);
  if (!isAdmin) {
    return res.status(401).json({ error: 'Unauthorized access' });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check if a migration is already running
  if (migrationState.status === 'running' && migrationProcess) {
    return res.status(400).json({ error: 'A migration is already in progress' });
  }

  try {
    // Make sure we have failed conversations to retry
    if (!migrationState.failedConversations || migrationState.failedConversations.length === 0) {
      return res.status(400).json({ 
        error: 'No failed conversations to retry', 
        count: 0 
      });
    }

    // Generate a new job ID
    const jobId = uuidv4();

    // Reset state for the new migration job
    migrationState.status = 'running';
    migrationState.startTime = new Date();
    migrationState.endTime = null;
    migrationState.error = null;
    migrationState.progress = {
      totalConversations: migrationState.failedConversations.length,
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      currentBatch: 0,
      totalBatches: Math.ceil(migrationState.failedConversations.length / 50), // Assuming batch size of 50
      elapsedTime: 0,
      estimatedTimeRemaining: null,
    };
    migrationState.jobId = jobId;
    migrationState.logs.push(`Retry job started with ID: ${jobId}`);
    migrationState.logs.push(`Retrying ${migrationState.failedConversations.length} failed conversations`);

    // Store the conversation IDs to retry
    const conversationsToRetry = [...migrationState.failedConversations];
    
    // Reset the failed conversations array for the new job
    migrationState.failedConversations = [];
    migrationState.errorSummary = {};

    // Start the migration process
    const scriptPath = path.resolve(process.cwd(), 'scripts/migrate-kv-to-mongodb.js');
    migrationProcess = fork(scriptPath, [], { 
      env: {
        ...process.env,
        RETRY_CONVERSATIONS: JSON.stringify(conversationsToRetry),
        MIGRATION_JOB_ID: jobId,
      }
    });

    // Listen for messages from the child process
    migrationProcess.on('message', (message: any) => {
      if (message.type === 'status') {
        // Update progress
        migrationState.progress = {
          ...migrationState.progress,
          ...message.status,
        };
      } else if (message.type === 'log') {
        // Add log
        migrationState.logs.push(message.message);
      } else if (message.type === 'error') {
        // Handle error
        migrationState.logs.push(`Error: ${message.error.message}`);
        
        // Update error summary
        if (message.error.type) {
          migrationState.errorSummary = migrationState.errorSummary || {};
          migrationState.errorSummary[message.error.type] = 
            (migrationState.errorSummary[message.error.type] || 0) + 1;
        }
        
        // Add to failed conversations
        if (message.error.conversationId) {
          migrationState.failedConversations = migrationState.failedConversations || [];
          migrationState.failedConversations.push(message.error.conversationId);
        }
      } else if (message.type === 'complete') {
        // Migration complete
        migrationState.status = 'completed';
        migrationState.endTime = new Date();
        migrationState.logs.push(`Retry completed. Successfully migrated: ${message.status.successful}, Failed: ${message.status.failed}`);
        
        // Clear the migration process reference
        migrationProcess = null;
      } else if (message.type === 'critical_error') {
        // Critical error occurred
        migrationState.status = 'error';
        migrationState.error = message.error.message;
        migrationState.endTime = new Date();
        migrationState.logs.push(`Critical error: ${message.error.message}`);
        
        // Clear the migration process reference
        migrationProcess = null;
      }
    });

    // Handle process exit
    migrationProcess.on('exit', (code) => {
      if (code !== 0 && migrationState.status === 'running') {
        migrationState.status = 'error';
        migrationState.error = `Migration process exited with code ${code}`;
        migrationState.endTime = new Date();
        migrationState.logs.push(`Process exited with code ${code}`);
      }
      
      // Clear the migration process reference
      migrationProcess = null;
    });

    return res.status(200).json({ 
      message: 'Retry job started successfully', 
      jobId,
      count: conversationsToRetry.length
    });
  } catch (error) {
    console.error('Error starting retry job:', error);
    return res.status(500).json({ error: 'Failed to start retry job' });
  }
}
