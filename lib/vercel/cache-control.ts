import { NextResponse } from 'next/server';
import { isModerationFeatureEnabled } from './edge-config';
import { kv } from '@vercel/kv';
import { env } from '@/env.mjs';

type CacheDuration = {
  shortTerm: number;   // For frequently updated data (1-30 seconds)
  mediumTerm: number;  // For semi-static data (1-10 minutes)
  longTerm: number;    // For rarely changing data (1 hour+)
};

/**
 * Default cache durations in seconds
 */
const DEFAULT_CACHE_DURATION: CacheDuration = {
  shortTerm: 10,        // 10 seconds
  mediumTerm: 300,      // 5 minutes
  longTerm: 3600,       // 1 hour
};

/**
 * Cache revalidation periods in seconds
 */
const DEFAULT_REVALIDATION_PERIOD: CacheDuration = {
  shortTerm: 60,        // 1 minute
  mediumTerm: 1800,     // 30 minutes
  longTerm: 86400,      // 24 hours
};

type CacheControlOptions = {
  /**
   * Cache duration type
   */
  duration?: keyof CacheDuration;
  
  /**
   * Enable stale-while-revalidate
   */
  staleWhileRevalidate?: boolean;
  
  /**
   * Override s-maxage value (in seconds)
   */
  sMaxAge?: number;
  
  /**
   * Set custom CDN-Cache-Control header
   */
  cdnCacheControl?: string;
  
  /**
   * Set custom Vercel-CDN-Cache-Control header
   */
  vercelCdnCacheControl?: string;
  
  /**
   * Allow purging the cache (adds x-vercel-cache-control-allow-purge header)
   */
  allowPurge?: boolean;
};

/**
 * Apply cache control headers to a NextResponse
 * 
 * @param response - The NextResponse object to add headers to
 * @param options - Cache control options
 * @returns The response with cache control headers
 */
export async function withCacheControl(
  response: NextResponse, 
  options: CacheControlOptions = {}
): Promise<NextResponse> {
  const headers = await getCacheControlHeaders(options);
  
  // Apply headers to response
  headers.forEach((value, key) => {
    response.headers.set(key, value);
  });
  
  return response;
}

/**
 * Create a NextResponse with proper cache control headers
 * 
 * @param body - The response body
 * @param init - Response initialization options
 * @param cacheOptions - Cache control options
 * @returns A NextResponse with cache control headers
 */
export async function cachedResponse(
  body: any,
  init?: ResponseInit,
  cacheOptions: CacheControlOptions = {}
): Promise<NextResponse> {
  const response = NextResponse.json(body, init);
  return withCacheControl(response, cacheOptions);
}

/**
 * Get cache control headers based on options
 * 
 * @param options - Cache control options
 * @returns Headers object with cache control headers
 */
export async function getCacheControlHeaders(
  options: CacheControlOptions = {}
): Promise<Headers> {
  const headers = new Headers();
  
  // Use default for moderation cache if not specified
  const useModerationSpecificCache = await isModerationFeatureEnabled('optimizedCaching');
  
  // Set appropriate max age
  let maxAge = options.sMaxAge;
  
  if (!maxAge && options.duration) {
    maxAge = DEFAULT_CACHE_DURATION[options.duration];
  } else if (!maxAge) {
    maxAge = DEFAULT_CACHE_DURATION.mediumTerm;
  }
  
  // Get revalidation period if stale-while-revalidate is enabled
  let revalidationPeriod = 0;
  
  if (options.staleWhileRevalidate && options.duration) {
    revalidationPeriod = DEFAULT_REVALIDATION_PERIOD[options.duration];
  } else if (options.staleWhileRevalidate) {
    revalidationPeriod = DEFAULT_REVALIDATION_PERIOD.mediumTerm;
  }
  
  // Build Cache-Control header value
  let cacheControl = `s-maxage=${maxAge}`;
  
  if (revalidationPeriod > 0) {
    cacheControl += `, stale-while-revalidate=${revalidationPeriod}`;
  }
  
  // Set cache control headers
  headers.set('Cache-Control', cacheControl);
  
  // Set CDN-specific cache control headers if provided
  if (options.cdnCacheControl) {
    headers.set('CDN-Cache-Control', options.cdnCacheControl);
  }
  
  if (options.vercelCdnCacheControl) {
    headers.set('Vercel-CDN-Cache-Control', options.vercelCdnCacheControl);
  }
  
  // Set purge allow header if requested
  if (options.allowPurge) {
    headers.set('x-vercel-cache-control-allow-purge', 'true');
  }
  
  // Set Vercel Edge caching headers in production
  if (env.NODE_ENV === 'production') {
    headers.set('x-vercel-cache', 'EDGE');
  }
  
  return headers;
}

/**
 * Cache key generation for moderation items
 * Creates a consistent cache key format for moderation-related items
 */
export function getModerationCacheKey(type: string, id: string, action?: string): string {
  if (action) {
    return `moderation:${type}:${id}:${action}`;
  }
  return `moderation:${type}:${id}`;
}

/**
 * Invalidate moderation item cache
 * Use this when a moderation action is taken to ensure fresh data
 */
export async function invalidateModerationCache(type: string, id: string): Promise<void> {
  if (!env.KV_REST_API_URL || !env.KV_REST_API_TOKEN) {
    console.warn('KV store not configured, skipping cache invalidation');
    return;
  }

  try {
    // Delete the specific item cache
    const itemKey = getModerationCacheKey(type, id);
    await kv.del(itemKey);
    
    // Also invalidate any list caches that might contain this item
    const listKey = `moderation:${type}:list`;
    await kv.del(listKey);
    
    // Clear the dashboard stats cache
    await kv.del('moderation:analytics:summary');
    
    console.log(`Invalidated cache for ${type} with ID ${id}`);
  } catch (error) {
    console.error('Error invalidating moderation cache:', error);
  }
}

/**
 * Cache moderation analytics data
 * This is used to store computed analytics data to avoid recalculation
 */
export async function cacheModerationAnalytics(key: string, data: any, expirationSeconds: number = 300): Promise<void> {
  if (!env.KV_REST_API_URL || !env.KV_REST_API_TOKEN) {
    console.warn('KV store not configured, skipping analytics caching');
    return;
  }

  try {
    const cacheKey = `moderation:analytics:${key}`;
    await kv.set(cacheKey, JSON.stringify(data), { ex: expirationSeconds });
    console.log(`Cached moderation analytics data for key: ${key}`);
  } catch (error) {
    console.error('Error caching moderation analytics:', error);
  }
}

/**
 * Get cached moderation analytics data
 */
export async function getCachedModerationAnalytics(key: string): Promise<any | null> {
  if (!env.KV_REST_API_URL || !env.KV_REST_API_TOKEN) {
    console.warn('KV store not configured, skipping analytics cache retrieval');
    return null;
  }

  try {
    const cacheKey = `moderation:analytics:${key}`;
    const cachedData = await kv.get(cacheKey);
    
    if (cachedData) {
      return typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching cached moderation analytics:', error);
    return null;
  }
}
