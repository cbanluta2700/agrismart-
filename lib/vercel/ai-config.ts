/**
 * Configuration for Vercel AI SDK integration in the AgriSmart platform
 */

/**
 * Global AI configuration settings
 */
export const aiConfig = {
  /**
   * OpenAI integration settings
   */
  openai: {
    /**
     * Whether to use the OpenAI API for moderation
     * Falls back to basic keyword matching if false or if API key is missing
     */
    enabled: !!process.env.OPENAI_API_KEY,
    
    /**
     * Organization ID for OpenAI API (optional)
     */
    organization: process.env.OPENAI_API_ORGANIZATION,
    
    /**
     * Default model to use for text generation
     */
    defaultModel: 'gpt-3.5-turbo',
    
    /**
     * Maximum tokens to generate in a response
     */
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '1000', 10),
    
    /**
     * Temperature setting for generation (0-1)
     * Lower values = more deterministic responses
     */
    temperature: 0.7
  },
  
  /**
   * Content moderation settings
   */
  moderation: {
    /**
     * Whether to enable AI moderation features
     */
    enabled: process.env.NEXT_PUBLIC_ENABLE_AI_MODERATION !== 'false',
    
    /**
     * Default sensitivity level for moderation (0-1)
     * Higher values = more strict moderation
     */
    sensitivityLevel: parseFloat(process.env.AI_MODERATION_SENSITIVITY || '0.7'),
    
    /**
     * Whether to fall back to basic keyword moderation if AI services fail
     */
    fallbackToBasic: process.env.AI_FALLBACK_TO_BASIC !== 'false',
    
    /**
     * Cache duration for moderation results in seconds
     */
    cacheDuration: parseInt(process.env.AI_CACHE_DURATION || '3600', 10),
    
    /**
     * Categories to check by default
     */
    defaultCategories: [
      'hate',
      'harassment', 
      'sexual',
      'self-harm',
      'violence'
    ],
    
    /**
     * Rate limits for moderation API (requests per minute)
     */
    rateLimits: {
      authenticated: 20,
      anonymous: 5
    }
  },
  
  /**
   * Edge function configuration
   */
  edge: {
    /**
     * Whether to use edge functions for AI features
     */
    enabled: true,
    
    /**
     * Cache control settings for edge functions
     */
    cacheControl: {
      /**
       * Max-age value for cached responses (in seconds)
       */
      maxAge: 300,
      
      /**
       * Whether to use stale-while-revalidate
       */
      staleWhileRevalidate: true,
      
      /**
       * Whether to enable shared caching
       */
      public: true
    }
  },
  
  /**
   * Analytics tracking for AI usage
   */
  analytics: {
    /**
     * Whether to track AI usage in analytics
     */
    enabled: true,
    
    /**
     * Sampling rate for AI usage tracking (0-1)
     * 1 = track 100% of requests, 0.1 = track 10% of requests
     */
    samplingRate: 0.5,
    
    /**
     * Events to track
     */
    events: {
      moderation: true,
      generation: true,
      errors: true
    }
  }
};

/**
 * Get a feature flag for AI moderation
 * @param flag The flag to check
 * @param defaultValue Default value if flag is not set
 * @returns The value of the flag or the default value
 */
export function getModerationFeatureFlag(
  flag: string,
  defaultValue: boolean = false
): boolean {
  // Check if moderation is globally disabled
  if (!aiConfig.moderation.enabled) {
    return false;
  }
  
  // Check specific flags
  switch (flag) {
    case 'enabled':
      return aiConfig.moderation.enabled;
    case 'fallbackToBasic':
      return aiConfig.moderation.fallbackToBasic;
    case 'trackAnalytics':
      return aiConfig.analytics.enabled && aiConfig.analytics.events.moderation;
    case 'useEdge':
      return aiConfig.edge.enabled;
    case 'useOpenAI':
      return aiConfig.openai.enabled;
    default:
      return defaultValue;
  }
}

/**
 * Get the configured sensitivity level for AI moderation
 * @returns The configured sensitivity level (0-1)
 */
export function getModerationSensitivity(): number {
  return aiConfig.moderation.sensitivityLevel;
}

/**
 * Get the default categories to check for moderation
 * @returns Array of category names
 */
export function getDefaultModerationCategories(): string[] {
  return [...aiConfig.moderation.defaultCategories];
}

/**
 * Get the cache duration for moderation results
 * @returns Cache duration in seconds
 */
export function getModerationCacheDuration(): number {
  return aiConfig.moderation.cacheDuration;
}

/**
 * Get the rate limit for moderation API based on authentication status
 * @param isAuthenticated Whether the user is authenticated
 * @returns Rate limit (requests per minute)
 */
export function getModerationRateLimit(isAuthenticated: boolean): number {
  return isAuthenticated 
    ? aiConfig.moderation.rateLimits.authenticated 
    : aiConfig.moderation.rateLimits.anonymous;
}
