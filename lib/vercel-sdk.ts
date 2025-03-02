import { VercelSDK } from '@vercel/sdk';

// Initialize the Vercel SDK with authentication
export const vercelClient = new VercelSDK({
  token: process.env.VERCEL_API_TOKEN as string,
  teamId: process.env.VERCEL_TEAM_ID,
});

// Content type definitions for Vercel SDK
export const CONTENT_TYPES = {
  ARTICLE: 'article',
  GUIDE: 'guide',
  VIDEO: 'video',
  GLOSSARY: 'glossary',
};

// Function to optimize images through Vercel Image Optimization
export const optimizeImage = (
  imageUrl: string, 
  options: { width?: number; height?: number; quality?: number; format?: 'webp' | 'jpg' | 'png' | 'avif' } = {}
) => {
  const { width = 800, height, quality = 80, format = 'webp' } = options;
  
  // Use Vercel's image optimization
  const params = new URLSearchParams();
  params.append('url', imageUrl);
  params.append('w', width.toString());
  if (height) params.append('h', height.toString());
  params.append('q', quality.toString());
  params.append('f', format);
  
  return `${process.env.NEXT_PUBLIC_VERCEL_URL}/_vercel/image?${params.toString()}`;
};

// Function to deploy content to Vercel's edge network
export const deployContent = async (contentType: string, contentId: string, data: any) => {
  try {
    // Use Vercel SDK to deploy content to the edge
    const deployment = await vercelClient.deployments.create({
      name: `content-${contentType}-${contentId}`,
      target: 'production',
      source: 'api',
      meta: {
        contentType,
        contentId,
      },
      // Convert data to a deployable format
      files: [
        {
          file: `content-${contentType}-${contentId}.json`,
          data: JSON.stringify(data),
        },
      ],
    });
    
    return deployment;
  } catch (error) {
    console.error('Error deploying content to Vercel edge:', error);
    throw new Error('Failed to deploy content to edge network');
  }
};

// Function to configure caching for content
export const configureCaching = async (contentType: string, contentPath: string, cacheDuration: number) => {
  try {
    // Use Vercel SDK to configure edge caching
    await vercelClient.projects.createOrUpdateCacheRule({
      source: `/${contentPath}/${contentType}/*`,
      duration: cacheDuration,
    });
    
    return { success: true, message: `Cache configured for ${contentType}` };
  } catch (error) {
    console.error('Error configuring caching:', error);
    throw new Error('Failed to configure edge caching');
  }
};

// Function to invalidate cache for specific content
export const invalidateCache = async (contentType: string, contentId: string) => {
  try {
    // Use Vercel SDK to invalidate cache
    await vercelClient.cacheKeys.purge({
      paths: [`/${contentType}/${contentId}*`],
    });
    
    return { success: true, message: `Cache invalidated for ${contentType}/${contentId}` };
  } catch (error) {
    console.error('Error invalidating cache:', error);
    throw new Error('Failed to invalidate cache');
  }
};

// Helper function to generate a content version
export const createContentVersion = async (prisma: any, contentType: string, contentId: string, data: any, createdBy?: string) => {
  try {
    // Find the latest version
    const latestVersion = await prisma.contentVersion.findFirst({
      where: { contentType, contentId },
      orderBy: { version: 'desc' },
    });
    
    const newVersion = latestVersion ? latestVersion.version + 1 : 1;
    
    // Create a new version
    const contentVersion = await prisma.contentVersion.create({
      data: {
        contentType,
        contentId,
        version: newVersion,
        data,
        createdBy,
      },
    });
    
    return contentVersion;
  } catch (error) {
    console.error('Error creating content version:', error);
    throw new Error('Failed to create content version');
  }
};

// Helper function to publish a specific version
export const publishContentVersion = async (prisma: any, contentType: string, contentId: string, version: number) => {
  try {
    // Update the content version as published
    const contentVersion = await prisma.contentVersion.update({
      where: { 
        contentType_contentId_version: {
          contentType,
          contentId,
          version,
        },
      },
      data: {
        publishedAt: new Date(),
      },
    });
    
    // Update the actual content item
    let contentData;
    switch (contentType) {
      case CONTENT_TYPES.ARTICLE:
        contentData = await prisma.article.update({
          where: { id: contentId },
          data: {
            ...contentVersion.data,
            status: 'published',
            publishedAt: new Date(),
          },
        });
        break;
      case CONTENT_TYPES.GUIDE:
        contentData = await prisma.guide.update({
          where: { id: contentId },
          data: {
            ...contentVersion.data,
            status: 'published',
            publishedAt: new Date(),
          },
        });
        break;
      case CONTENT_TYPES.VIDEO:
        contentData = await prisma.video.update({
          where: { id: contentId },
          data: {
            ...contentVersion.data,
            status: 'published',
            publishedAt: new Date(),
          },
        });
        break;
      case CONTENT_TYPES.GLOSSARY:
        contentData = await prisma.glossaryTerm.update({
          where: { id: contentId },
          data: {
            ...contentVersion.data,
            status: 'published',
            publishedAt: new Date(),
          },
        });
        break;
      default:
        throw new Error(`Unknown content type: ${contentType}`);
    }
    
    // Deploy to edge network
    await deployContent(contentType, contentId, contentData);
    
    return { contentVersion, contentData };
  } catch (error) {
    console.error('Error publishing content version:', error);
    throw new Error('Failed to publish content version');
  }
};
