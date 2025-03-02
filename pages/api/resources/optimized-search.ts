import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { searchResources } from '@/lib/search/resources-search';
import { prepareResourcesForClient } from '@/lib/resource-optimizations';
import { configureCaching } from '@/lib/vercel-sdk';

// Add cache header constants
const CACHE_MAX_AGE = 60 * 10; // 10 minutes for regular searches
const CACHE_STALE_WHILE_REVALIDATE = 60 * 60; // 1 hour

// Configure the cache for this API route
export const configureSearchCache = async () => {
  try {
    await configureCaching('search', 'api/resources', CACHE_MAX_AGE);
    return { success: true };
  } catch (error) {
    console.error('Failed to configure search cache:', error);
    return { success: false, error };
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Extract search parameters from query
    const { 
      query = '', 
      type, 
      category, 
      tags,
      author,
      sort = 'relevance',
      page = 1,
      limit = 10,
      premium
    } = req.query;

    // Validate page and limit
    const pageNum = Number(page);
    const limitNum = Number(limit);
    
    if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1) {
      return res.status(400).json({ message: 'Invalid page or limit parameters' });
    }

    // Extract and process tags if provided as a string
    let processedTags: string[] | undefined;
    if (tags) {
      processedTags = Array.isArray(tags) ? tags : [tags as string];
    }

    // Determine if we should filter by premium content
    let premiumFilter: boolean | undefined;
    if (premium === 'true') premiumFilter = true;
    if (premium === 'false') premiumFilter = false;

    // Execute search
    const searchResults = await searchResources(prisma, {
      query: query as string,
      type: type as string,
      category: category as string,
      tags: processedTags,
      author: author as string,
      sort: sort as string,
      page: pageNum,
      limit: limitNum,
      premium: premiumFilter
    });

    // Optimize resources for client-side rendering
    const optimizedResults = {
      ...searchResults,
      results: prepareResourcesForClient(searchResults.results)
    };

    // Set cache headers for edge caching
    res.setHeader('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, stale-while-revalidate=${CACHE_STALE_WHILE_REVALIDATE}`);
    
    // Return the optimized results
    return res.status(200).json(optimizedResults);
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ message: 'Error performing search', error: (error as Error).message });
  }
};
