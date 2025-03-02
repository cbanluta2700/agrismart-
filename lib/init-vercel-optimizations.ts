import { setupResourceCaching } from './resource-optimizations';
import { configureSearchCache } from '../pages/api/resources/optimized-search';

/**
 * Initialize all Vercel SDK optimizations for the application
 * This should be called during app startup or on-demand when configuration changes
 */
export async function initializeVercelOptimizations() {
  try {
    console.log('Initializing Vercel SDK optimizations...');
    
    // Setup resource caching
    const resourceCachingResult = await setupResourceCaching();
    console.log('Resource caching setup:', resourceCachingResult);
    
    // Configure search caching
    const searchCachingResult = await configureSearchCache();
    console.log('Search caching setup:', searchCachingResult);
    
    console.log('Vercel SDK optimizations initialized successfully!');
    return {
      success: true,
      message: 'All Vercel SDK optimizations initialized successfully'
    };
  } catch (error) {
    console.error('Failed to initialize Vercel SDK optimizations:', error);
    return {
      success: false,
      error
    };
  }
}
