/**
 * API route for warming up cold functions
 * Triggered by cron job every 10 minutes to minimize cold starts
 */
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Functions to warm up
const WARMUP_FUNCTIONS = [
  'ai-moderation',
  'moderation:check'
];

// Keep track of last warmup times
interface WarmupStatus {
  lastExecuted: number;
  functions: Record<string, {
    lastWarmup: number;
    status: 'success' | 'failed';
    error?: string;
  }>;
}

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// Initialize Redis client if credentials are available
let redis: Redis | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

/**
 * Handler for API route
 * This is called by the Vercel cron job configured in vercel.json
 */
export async function GET(request: NextRequest) {
  try {
    // Ensure it's from a valid source - either cron job or admin
    const isSystemRequest = request.headers.get('x-vercel-cron') === 'true';
    
    if (!isSystemRequest) {
      // For manual invocation, check auth
      const session = await getServerSession(authOptions);
      
      if (!session?.user || !session.user.isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    
    // Check if Redis is available
    if (!redis) {
      logger.error('Redis not available for warmup function');
      return NextResponse.json({
        success: false,
        error: 'Redis not available',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
    
    // Get current status
    const status: WarmupStatus = await redis.get('warmup:status') || {
      lastExecuted: 0,
      functions: {}
    };
    
    // Track the new execution
    status.lastExecuted = Date.now();
    
    // Execute warmup for each function
    for (const functionKey of WARMUP_FUNCTIONS) {
      try {
        // Set the warmup key
        const warmupKey = `${functionKey}:warmup`;
        await redis.set(warmupKey, Date.now());
        await redis.expire(warmupKey, 120); // 2 minutes TTL
        
        // Update status
        status.functions[functionKey] = {
          lastWarmup: Date.now(),
          status: 'success'
        };
        
        logger.info('Function warmed up successfully', { function: functionKey });
      } catch (error) {
        logger.error('Error warming up function', { function: functionKey, error });
        status.functions[functionKey] = {
          lastWarmup: Date.now(),
          status: 'failed',
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
    
    // Store updated status
    await redis.set('warmup:status', status);
    await redis.expire('warmup:status', 86400); // 24 hours TTL
    
    return NextResponse.json({
      success: true,
      message: `Warmed up ${WARMUP_FUNCTIONS.length} functions`,
      timestamp: new Date().toISOString(),
      functions: status.functions
    });
  } catch (error) {
    logger.error('Error in warmup function', { error });
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
