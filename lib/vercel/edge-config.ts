import { get, getAll } from '@vercel/edge-config';

export interface ModerationFeatureFlags {
  // AI moderation feature flags
  enableAIModeration: boolean;
  moderationAIModel: string;
  moderationAIConfidenceThreshold: number;
  
  // UI feature flags
  enableModerationGraphView: boolean;
  enableModerationQueue: boolean;
  showModerationAnalytics: boolean;
  
  // Performance features
  moderationQueueRefreshRate: number; // in seconds
  enableEdgeCaching: boolean;
  cacheInvalidationStrategy: 'time-based' | 'action-based';
  
  // Experimental features
  enableAIContentClassification: boolean;
  enableStreamingModerationResponses: boolean;
}

// Default flags in case Edge Config is not available
const defaultFlags: ModerationFeatureFlags = {
  enableAIModeration: true,
  moderationAIModel: 'default',
  moderationAIConfidenceThreshold: 0.8,
  
  enableModerationGraphView: true,
  enableModerationQueue: true,
  showModerationAnalytics: true,
  
  moderationQueueRefreshRate: 30,
  enableEdgeCaching: true,
  cacheInvalidationStrategy: 'action-based',
  
  enableAIContentClassification: false,
  enableStreamingModerationResponses: false
};

/**
 * Get a single moderation feature flag from Edge Config
 * 
 * @param key - The feature flag key
 * @param fallback - Optional fallback value if the key is not found
 */
export async function getModerationFeatureFlag<K extends keyof ModerationFeatureFlags>(
  key: K, 
  fallback?: ModerationFeatureFlags[K]
): Promise<ModerationFeatureFlags[K]> {
  try {
    const value = await get(key);
    return value !== null && value !== undefined 
      ? value as ModerationFeatureFlags[K] 
      : (fallback ?? defaultFlags[key]);
  } catch (error) {
    console.warn(`Error fetching feature flag ${key}:`, error);
    return fallback ?? defaultFlags[key];
  }
}

/**
 * Get all moderation feature flags from Edge Config
 */
export async function getAllModerationFeatureFlags(): Promise<ModerationFeatureFlags> {
  try {
    const allFlags = await getAll();
    
    // Merge with default flags (for any missing keys)
    return {
      ...defaultFlags,
      ...allFlags as Partial<ModerationFeatureFlags>
    };
  } catch (error) {
    console.warn('Error fetching all feature flags:', error);
    return defaultFlags;
  }
}

/**
 * Check if a feature is enabled in Edge Config
 * 
 * @param feature - The feature flag to check
 */
export async function isModerationFeatureEnabled(
  feature: keyof Pick<ModerationFeatureFlags, 
    | 'enableAIModeration' 
    | 'enableModerationGraphView' 
    | 'enableModerationQueue' 
    | 'showModerationAnalytics'
    | 'enableEdgeCaching'
    | 'enableAIContentClassification'
    | 'enableStreamingModerationResponses'
  >
): Promise<boolean> {
  return getModerationFeatureFlag(feature);
}
