import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { 
  searchResources, 
  ResourceSearchParams, 
  ResourceSearchResponse,
  getRelatedResources
} from '@/lib/search/resources-search';

/**
 * API handler for searching resources
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'GET':
        return await handleSearch(req, res);
      case 'POST':
        return await handleRelatedContent(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Error in resources search API:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handle GET requests for searching resources
 */
async function handleSearch(
  req: NextApiRequest,
  res: NextApiResponse<ResourceSearchResponse | { error: string }>
) {
  try {
    const session = await getSession({ req });
    
    // Parse query parameters
    const { 
      q, 
      type, 
      category, 
      tags, 
      author, 
      sortBy, 
      sortOrder, 
      page, 
      pageSize 
    } = req.query;
    
    // Validate required parameters
    if (!q && !category && !tags && !author) {
      return res.status(400).json({ error: 'At least one of q, category, tags, or author is required' });
    }
    
    // Determine if published-only content should be returned
    // Non-authenticated users can only see published content
    // Admin/moderator/author users can see all content
    const publishedOnly = !session || !['admin', 'moderator', 'contentManager', 'author']
      .includes(session.user.role as string);
    
    // Build search parameters
    const searchParams: ResourceSearchParams = {
      query: q as string || '',
      contentType: type as ResourceSearchParams['contentType'] || 'all',
      category: category as string || undefined,
      tags: tags ? Array.isArray(tags) ? tags as string[] : [tags as string] : undefined,
      publishedOnly,
      author: author as string || undefined,
      sortBy: sortBy as ResourceSearchParams['sortBy'] || 'relevance',
      sortOrder: sortOrder as ResourceSearchParams['sortOrder'] || 'desc',
      page: page ? parseInt(page as string, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize as string, 10) : 10
    };
    
    // Execute search
    const results = await searchResources(searchParams);
    
    // Return search results
    return res.status(200).json(results);
  } catch (error) {
    console.error('Error searching resources:', error);
    return res.status(500).json({ error: 'Error searching resources' });
  }
}

/**
 * Handle POST requests for getting related content
 */
async function handleRelatedContent(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { resourceId, contentType, tags, category, limit } = req.body;
    
    // Validate required parameters
    if (!resourceId || !contentType) {
      return res.status(400).json({ error: 'resourceId and contentType are required' });
    }
    
    // Get related resources
    const results = await getRelatedResources(
      resourceId,
      contentType,
      tags || [],
      category || null,
      limit || 4
    );
    
    // Return related resources
    return res.status(200).json({ results });
  } catch (error) {
    console.error('Error getting related resources:', error);
    return res.status(500).json({ error: 'Error getting related resources' });
  }
}
