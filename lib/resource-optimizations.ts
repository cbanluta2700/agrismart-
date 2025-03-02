import { optimizeImage, configureCaching, invalidateCache, CONTENT_TYPES } from './vercel-sdk';

// Cache duration in seconds
const RESOURCE_CACHE_DURATION = 60 * 60 * 24; // 24 hours
const RESOURCE_LIST_CACHE_DURATION = 60 * 60; // 1 hour

// Optimize resource featured images with proper dimensions and formats
export const optimizeResourceImage = (
  imageUrl: string, 
  type: 'thumbnail' | 'featured' | 'avatar' = 'featured'
) => {
  if (!imageUrl) return '';
  
  // Different optimization settings based on image type
  switch (type) {
    case 'thumbnail':
      return optimizeImage(imageUrl, { 
        width: 400, 
        height: 225, 
        quality: 85, 
        format: 'webp' 
      });
    case 'featured':
      return optimizeImage(imageUrl, { 
        width: 1200, 
        height: 675, 
        quality: 85, 
        format: 'webp' 
      });
    case 'avatar':
      return optimizeImage(imageUrl, { 
        width: 64, 
        height: 64, 
        quality: 90, 
        format: 'webp' 
      });
    default:
      return optimizeImage(imageUrl);
  }
};

// Setup caching for resources
export const setupResourceCaching = async () => {
  try {
    // Configure caching for different content types
    const promises = [
      configureCaching(CONTENT_TYPES.ARTICLE, 'resources', RESOURCE_CACHE_DURATION),
      configureCaching(CONTENT_TYPES.GUIDE, 'resources', RESOURCE_CACHE_DURATION),
      configureCaching(CONTENT_TYPES.VIDEO, 'resources', RESOURCE_CACHE_DURATION),
      // Cache the search results for a shorter duration
      configureCaching('search', 'resources', RESOURCE_LIST_CACHE_DURATION),
    ];
    
    await Promise.all(promises);
    return { success: true, message: 'Resource caching configured successfully' };
  } catch (error) {
    console.error('Error setting up resource caching:', error);
    throw new Error('Failed to setup resource caching');
  }
};

// Invalidate cache for a resource
export const invalidateResourceCache = async (contentType: string, resourceId: string) => {
  try {
    await invalidateCache(contentType, resourceId);
    // Also invalidate search results cache since they might include this resource
    await invalidateCache('search', '*');
    
    return { success: true, message: `Cache invalidated for ${contentType}/${resourceId}` };
  } catch (error) {
    console.error('Error invalidating resource cache:', error);
    throw new Error('Failed to invalidate resource cache');
  }
};

// Generate metadata for resource SEO
export const generateResourceMetadata = (resource: any) => {
  const { title, excerpt, category, tags, author, type, premium } = resource;
  
  return {
    title: `${title} ${premium ? '(Premium)' : ''} | AgriSmart Resources`,
    description: excerpt || `${type} about ${category} in agriculture`,
    openGraph: {
      title: `${title} ${premium ? '(Premium)' : ''}`,
      description: excerpt || `${type} about ${category} in agriculture`,
      type: 'article',
      authors: [author.name],
      tags: tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} ${premium ? '(Premium)' : ''}`,
      description: excerpt || `${type} about ${category} in agriculture`,
    }
  };
};

// Optimize resource data for client-side rendering
export const optimizeResourceForClient = (resource: any) => {
  // Create a new object with only the necessary fields
  const optimizedResource = {
    id: resource.id,
    title: resource.title,
    excerpt: resource.excerpt,
    type: resource.type,
    category: resource.category,
    tags: resource.tags || [],
    premium: resource.premium || false,
    createdAt: resource.createdAt,
    updatedAt: resource.updatedAt,
    publishedAt: resource.publishedAt,
    readTime: resource.readTime,
    views: resource.views || 0,
    bookmarks: resource.bookmarks || 0,
    
    // Optimize the featured image
    featuredImage: resource.featuredImage 
      ? optimizeResourceImage(resource.featuredImage, 'thumbnail') 
      : null,
      
    // Include only necessary author information
    author: {
      name: resource.author.name,
      avatar: resource.author.avatar 
        ? optimizeResourceImage(resource.author.avatar, 'avatar')
        : null,
    },
  };
  
  return optimizedResource;
};

// Prepare a batch of resources for client-side rendering
export const prepareResourcesForClient = (resources: any[]) => {
  return resources.map(optimizeResourceForClient);
};
