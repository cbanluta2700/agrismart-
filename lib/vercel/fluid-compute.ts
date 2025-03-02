/**
 * Fluid Compute configuration and utilities for optimizing Vercel serverless functions
 * Implements cold-start reduction, in-function concurrency, and background processing
 */

import { Redis } from '@upstash/redis';
import { kv } from '@vercel/kv';
import { logger } from '@/lib/utils/logger';

// Initialize Redis client if credentials are available
let redis: Redis | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

/**
 * Function execution options for fluid compute
 */
interface FluidComputeOptions {
  /**
   * Maximum number of concurrent operations
   * @default 5
   */
  concurrency?: number;
  
  /**
   * Whether to keep warm to reduce cold starts
   * @default false
   */
  keepWarm?: boolean;
  
  /**
   * Maximum duration in ms for background processing
   * @default 60000 (60 seconds)
   */
  backgroundTimeout?: number;
  
  /**
   * Key prefix for this function's data in KV store
   */
  keyPrefix: string;
  
  /**
   * Optional TTL for cached results in seconds
   */
  cacheTTL?: number;
}

/**
 * Cache wrapper result
 */
interface CacheResult<T> {
  data: T | null;
  cached: boolean;
  timestamp: number;
}

/**
 * Default options for fluid compute
 */
const defaultOptions: Partial<FluidComputeOptions> = {
  concurrency: 5,
  keepWarm: false,
  backgroundTimeout: 60000,
  cacheTTL: 3600, // 1 hour
};

/**
 * Wrapper for functions to enable fluid compute capabilities
 * - Concurrent execution handling
 * - Cold start reduction
 * - Result caching
 */
export function fluidCompute<T, Args extends any[]>(
  fn: (...args: Args) => Promise<T>,
  options: FluidComputeOptions
): (...args: Args) => Promise<T> {
  const opts = { ...defaultOptions, ...options };
  const { keyPrefix, concurrency, cacheTTL } = opts;
  
  // Create semaphore for concurrent execution
  let activeTasks = 0;
  const taskQueue: (() => void)[] = [];
  
  // If keep warm is enabled, ping this function periodically
  if (opts.keepWarm) {
    const warmupKey = `${keyPrefix}:warmup`;
    
    // Check if we need to set up a new warmup
    const setupWarmup = async () => {
      const lastWarmup = await kv.get<number>(warmupKey);
      const now = Date.now();
      
      // If no recent warmup, schedule one
      if (!lastWarmup || (now - lastWarmup > 60000)) {
        await kv.set(warmupKey, now);
        await kv.expire(warmupKey, 120); // 2 minutes TTL
        
        // Schedule next warmup via cron (would be implemented in vercel.json)
        logger.info('Keeping function warm:', { function: keyPrefix });
      }
    };
    
    // Initial setup
    setupWarmup().catch((err) => logger.error('Warmup setup error', { error: err }));
  }
  
  // Acquire a "permit" from the semaphore
  const acquirePermit = () => {
    return new Promise<void>((resolve) => {
      if (activeTasks < (concurrency || 5)) {
        activeTasks++;
        resolve();
      } else {
        taskQueue.push(resolve);
      }
    });
  };
  
  // Release a "permit" back to the semaphore
  const releasePermit = () => {
    const nextTask = taskQueue.shift();
    if (nextTask) {
      nextTask();
    } else {
      activeTasks--;
    }
  };
  
  // Return the wrapped function
  return async (...args: Args): Promise<T> => {
    // Skip caching if KV is not available
    let shouldCache = cacheTTL && cacheTTL > 0 && !!kv;
    const cacheKey = `${keyPrefix}:${JSON.stringify(args)}`;
    
    // Try to get from cache first
    if (shouldCache) {
      try {
        const cachedResult = await kv.get<CacheResult<T>>(cacheKey);
        if (cachedResult && cachedResult.data !== null) {
          // Check if cache is still valid
          const age = Date.now() - cachedResult.timestamp;
          if (age < cacheTTL * 1000) {
            return cachedResult.data;
          }
        }
      } catch (err) {
        logger.error('Error reading from cache:', { error: err });
        // Continue with execution if cache read fails
      }
    }
    
    // Acquire permit for execution
    await acquirePermit();
    
    try {
      // Execute the function
      const result = await fn(...args);
      
      // Cache the result if TTL is set
      if (shouldCache) {
        try {
          await kv.set(cacheKey, {
            data: result,
            cached: true,
            timestamp: Date.now(),
          });
          await kv.expire(cacheKey, cacheTTL);
        } catch (err) {
          logger.error('Error caching result:', { error: err });
          // Non-fatal error, continue
        }
      }
      
      return result;
    } finally {
      // Always release the permit
      releasePermit();
    }
  };
}

/**
 * Execute a function in the background after response is sent
 * Ideal for non-blocking operations like logging, analytics, etc.
 */
export async function runPostResponseTask<T>(
  task: () => Promise<T>,
  options: {
    key: string;
    timeout?: number;
  }
): Promise<void> {
  const { key, timeout = 60000 } = options;
  const taskKey = `background:${key}:${Date.now()}`;
  
  // Check if Redis is available
  if (!redis) {
    // If no Redis, execute synchronously instead
    logger.warn('Redis not available for background task, executing synchronously', { key });
    try {
      await task();
    } catch (error) {
      logger.error('Background task error (sync fallback):', { error, key });
    }
    return;
  }
  
  // Register the task to be executed
  await redis.set(taskKey, JSON.stringify({
    status: 'pending',
    registered: Date.now(),
    timeout,
  }));
  await redis.expire(taskKey, Math.ceil(timeout / 1000) + 10);
  
  // Execute the task in a separate context if possible
  // In a true implementation, this would be handled by a worker or cron job
  setTimeout(async () => {
    try {
      // Mark task as in-progress
      await redis.set(taskKey, JSON.stringify({
        status: 'in-progress',
        started: Date.now(),
        timeout,
      }));
      
      // Execute the task
      await task();
      
      // Mark task as completed
      await redis.set(taskKey, JSON.stringify({
        status: 'completed',
        started: Date.now(),
        completed: Date.now(),
      }));
    } catch (error) {
      // Mark task as failed
      await redis.set(taskKey, JSON.stringify({
        status: 'failed',
        started: Date.now(),
        error: error instanceof Error ? error.message : String(error),
      }));
      logger.error('Background task failed:', { error, key });
    } finally {
      // Ensure the key gets cleaned up
      await redis.expire(taskKey, 3600); // Keep for an hour for debugging
    }
  }, 0);
}

/**
 * Optimized version of the moderation check using fluid compute
 * This is a simplified example for illustration
 */
export const optimizedModerationCheck = fluidCompute(
  async (content: string, contentType: string) => {
    // This would contain the actual moderation logic
    // For now, it's just a placeholder
    const containsProhibitedContent = /\b(bad|inappropriate|offensive)\b/i.test(content);
    
    return {
      isFlagged: containsProhibitedContent,
      categories: {
        hate: false,
        harassment: containsProhibitedContent,
        sexual: false,
      },
      categoryScores: {
        hate: 0.1,
        harassment: containsProhibitedContent ? 0.8 : 0.1,
        sexual: 0.1,
      },
      flaggedCategories: containsProhibitedContent ? ['harassment'] : []
    };
  },
  {
    keyPrefix: 'moderation:check',
    concurrency: 10,
    cacheTTL: 3600,
    keepWarm: true,
  }
);
