import { PrismaClient, Prisma } from '@prisma/client';
import { getVercelEdgeConfig } from '../vercel-sdk';

const prisma = new PrismaClient();

/**
 * Interface for search parameters
 */
export interface ResourceSearchParams {
  query: string;
  contentType?: 'article' | 'guide' | 'video' | 'glossary' | 'all';
  category?: string;
  tags?: string[];
  publishedOnly?: boolean;
  author?: string;
  sortBy?: 'relevance' | 'date' | 'views' | 'title';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

/**
 * Interface for search result
 */
export interface ResourceSearchResult {
  id: string;
  title: string;
  excerpt: string | null;
  contentType: 'article' | 'guide' | 'video' | 'glossary';
  publishedAt: Date | null;
  updatedAt: Date;
  authorName: string | null;
  authorId: string | null;
  category: string | null;
  tags: string[];
  thumbnailUrl: string | null;
  slug: string | null;
  viewCount: number;
  highlighted: { field: string; text: string }[];
}

/**
 * Interface for search response
 */
export interface ResourceSearchResponse {
  results: ResourceSearchResult[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  contentTypeCounts: {
    article: number;
    guide: number;
    video: number;
    glossary: number;
  };
  facets: {
    categories: Array<{ name: string; count: number }>;
    tags: Array<{ name: string; count: number }>;
    authors: Array<{ id: string; name: string; count: number }>;
  };
}

/**
 * Function to highlight search terms in text
 */
const highlightSearchTerms = (text: string, query: string): string => {
  if (!text || !query.trim()) return text;
  
  const terms = query
    .toLowerCase()
    .split(' ')
    .filter(term => term.length > 2); // Only highlight terms with more than 2 characters
  
  if (terms.length === 0) return text;
  
  let highlighted = text;
  terms.forEach(term => {
    const regex = new RegExp(`(${term})`, 'gi');
    highlighted = highlighted.replace(regex, '<mark>$1</mark>');
  });
  
  return highlighted;
};

/**
 * Extract excerpt from content based on search query
 */
const extractExcerpt = (content: string, query: string, maxLength: number = 160): string => {
  if (!content) return '';
  
  // Remove HTML tags for excerpt
  const plainText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  
  // If query is empty, return the beginning of the content
  if (!query.trim()) {
    return plainText.substring(0, maxLength) + (plainText.length > maxLength ? '...' : '');
  }
  
  // Try to find the query in the content
  const terms = query.toLowerCase().split(' ').filter(term => term.length > 2);
  
  if (terms.length === 0) {
    return plainText.substring(0, maxLength) + (plainText.length > maxLength ? '...' : '');
  }
  
  // Find index of first query term match
  let lowestIndex = plainText.length;
  terms.forEach(term => {
    const index = plainText.toLowerCase().indexOf(term);
    if (index !== -1 && index < lowestIndex) {
      lowestIndex = index;
    }
  });
  
  // If no match found, return the beginning
  if (lowestIndex === plainText.length) {
    return plainText.substring(0, maxLength) + (plainText.length > maxLength ? '...' : '');
  }
  
  // Calculate start position, ensuring we don't start mid-word
  let startPos = Math.max(0, lowestIndex - 60);
  if (startPos > 0) {
    startPos = plainText.indexOf(' ', startPos) + 1;
  }
  
  // Extract excerpt
  let excerpt = plainText.substring(startPos, startPos + maxLength);
  
  // Add ellipsis if needed
  if (startPos > 0) excerpt = '...' + excerpt;
  if (startPos + maxLength < plainText.length) excerpt += '...';
  
  return excerpt;
};

/**
 * Build where clause for Prisma query based on search parameters
 */
const buildSearchWhereClause = (params: ResourceSearchParams): Prisma.Sql => {
  const conditions: Prisma.Sql[] = [];
  const { query, contentType, category, tags, publishedOnly, author } = params;
  
  // Search query condition
  if (query.trim()) {
    conditions.push(Prisma.sql`(
      title ILIKE ${`%${query}%`} OR 
      content ILIKE ${`%${query}%`} OR 
      excerpt ILIKE ${`%${query}%`} OR
      tags ?| ${Prisma.raw(`array[${query.split(' ').map(term => `'${term}'`).join(', ')}]`)}
    )`);
  }
  
  // Content type condition
  if (contentType && contentType !== 'all') {
    conditions.push(Prisma.sql`type = ${contentType}`);
  }
  
  // Category condition
  if (category) {
    conditions.push(Prisma.sql`category = ${category}`);
  }
  
  // Tags condition
  if (tags && tags.length > 0) {
    conditions.push(Prisma.sql`tags ?& ${Prisma.raw(`array[${tags.map(tag => `'${tag}'`).join(', ')}]`)}`);
  }
  
  // Published only condition
  if (publishedOnly) {
    conditions.push(Prisma.sql`status = 'published' AND published_at IS NOT NULL`);
  }
  
  // Author condition
  if (author) {
    conditions.push(Prisma.sql`author_id = ${author}`);
  }
  
  // Combine all conditions
  if (conditions.length === 0) {
    return Prisma.sql`TRUE`;
  }
  
  return Prisma.sql`(${Prisma.join(conditions, ' AND ')})`;
}

/**
 * Build order by clause for Prisma query based on search parameters
 */
const buildSearchOrderByClause = (params: ResourceSearchParams): Prisma.Sql => {
  const { sortBy = 'relevance', sortOrder = 'desc', query } = params;
  
  if (sortBy === 'relevance' && query.trim()) {
    // For relevance sorting, we use a custom relevance score
    return Prisma.sql`
      CASE 
        WHEN title ILIKE ${`%${query}%`} THEN 3
        WHEN excerpt ILIKE ${`%${query}%`} THEN 2 
        ELSE 1 
      END DESC, 
      view_count DESC, 
      published_at DESC NULLS LAST
    `;
  }
  
  switch (sortBy) {
    case 'date':
      return Prisma.sql`published_at ${sortOrder === 'asc' ? Prisma.sql`ASC NULLS LAST` : Prisma.sql`DESC NULLS LAST`}`;
    case 'views':
      return Prisma.sql`view_count ${sortOrder === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`}`;
    case 'title':
      return Prisma.sql`title ${sortOrder === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`}`;
    default:
      return Prisma.sql`published_at DESC NULLS LAST`;
  }
}

/**
 * Search resources with advanced functionality
 */
export async function searchResources(params: ResourceSearchParams): Promise<ResourceSearchResponse> {
  const {
    page = 1,
    pageSize = 10,
    query,
    contentType,
    publishedOnly = true
  } = params;
  
  const offset = (page - 1) * pageSize;
  const whereClause = buildSearchWhereClause(params);
  const orderByClause = buildSearchOrderByClause(params);
  
  // Get edge config for caching if available
  const edgeConfig = await getVercelEdgeConfig();
  const useCache = edgeConfig?.get('useSearchCache') as boolean || false;
  const cacheTTL = edgeConfig?.get('searchCacheTTL') as number || 300; // 5 minutes default
  
  // Generate cache key if caching is enabled
  let cacheKey: string | null = null;
  if (useCache) {
    cacheKey = `search:${JSON.stringify(params)}`;
    const cachedResult = await edgeConfig?.get(cacheKey);
    if (cachedResult) {
      return JSON.parse(cachedResult as string) as ResourceSearchResponse;
    }
  }
  
  // Execute search query
  const [results, totalCount, facets] = await Promise.all([
    // Get search results
    prisma.$queryRaw<any[]>`
      SELECT 
        r.id, 
        r.title, 
        r.excerpt, 
        r.type as "contentType", 
        r.published_at as "publishedAt", 
        r.updated_at as "updatedAt", 
        u.name as "authorName", 
        r.author_id as "authorId", 
        r.category, 
        r.tags, 
        r.thumbnail_url as "thumbnailUrl", 
        r.slug, 
        r.view_count as "viewCount"
      FROM resources r
      LEFT JOIN users u ON r.author_id = u.id
      WHERE ${whereClause}
      ORDER BY ${orderByClause}
      LIMIT ${pageSize}
      OFFSET ${offset}
    `,
    
    // Get total count
    prisma.$queryRaw<[{count: bigint}]>`
      SELECT COUNT(*) as count
      FROM resources r
      WHERE ${whereClause}
    `.then(result => Number(result[0].count)),
    
    // Get facets (categories, tags, authors)
    Promise.all([
      // Categories facet
      prisma.$queryRaw<Array<{name: string, count: bigint}>>`
        SELECT category as name, COUNT(*) as count
        FROM resources
        WHERE category IS NOT NULL AND ${whereClause}
        GROUP BY category
        ORDER BY count DESC
        LIMIT 20
      `,
      
      // Tags facet
      prisma.$queryRaw<Array<{name: string, count: bigint}>>`
        SELECT t as name, COUNT(*) as count
        FROM resources, unnest(tags) as t
        WHERE ${whereClause}
        GROUP BY t
        ORDER BY count DESC
        LIMIT 30
      `,
      
      // Authors facet
      prisma.$queryRaw<Array<{id: string, name: string, count: bigint}>>`
        SELECT 
          r.author_id as id, 
          u.name, 
          COUNT(*) as count
        FROM resources r
        LEFT JOIN users u ON r.author_id = u.id
        WHERE r.author_id IS NOT NULL AND ${whereClause}
        GROUP BY r.author_id, u.name
        ORDER BY count DESC
        LIMIT 15
      `,
      
      // Content type counts
      prisma.$queryRaw<Array<{type: string, count: bigint}>>`
        SELECT type, COUNT(*) as count
        FROM resources
        WHERE ${whereClause}
        GROUP BY type
      `
    ])
  ]);
  
  // Process results
  const processedResults = results.map(item => {
    // Extract highlight excerpts if there's a query
    const highlighted: { field: string; text: string }[] = [];
    
    if (query && query.trim()) {
      // Highlight title if it contains the query
      if (item.title && item.title.toLowerCase().includes(query.toLowerCase())) {
        highlighted.push({
          field: 'title',
          text: highlightSearchTerms(item.title, query)
        });
      }
      
      // Create excerpt from content with highlighted terms
      if (item.excerpt) {
        highlighted.push({
          field: 'excerpt',
          text: highlightSearchTerms(extractExcerpt(item.excerpt, query), query)
        });
      }
    }
    
    return {
      ...item,
      tags: item.tags || [],
      highlighted
    };
  });
  
  // Process facets
  const [categoriesFacet, tagsFacet, authorsFacet, contentTypeCounts] = facets;
  
  // Format content type counts
  const formattedContentTypeCounts = {
    article: 0,
    guide: 0,
    video: 0,
    glossary: 0
  };
  
  contentTypeCounts.forEach(item => {
    if (item.type in formattedContentTypeCounts) {
      formattedContentTypeCounts[item.type as keyof typeof formattedContentTypeCounts] = Number(item.count);
    }
  });
  
  // Create response
  const response: ResourceSearchResponse = {
    results: processedResults,
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
    contentTypeCounts: formattedContentTypeCounts,
    facets: {
      categories: categoriesFacet.map(item => ({ 
        name: item.name, 
        count: Number(item.count) 
      })),
      tags: tagsFacet.map(item => ({ 
        name: item.name, 
        count: Number(item.count) 
      })),
      authors: authorsFacet.map(item => ({ 
        id: item.id, 
        name: item.name, 
        count: Number(item.count) 
      }))
    }
  };
  
  // Store in cache if enabled
  if (useCache && cacheKey) {
    await edgeConfig?.set(cacheKey, JSON.stringify(response), { ttl: cacheTTL });
  }
  
  return response;
}

/**
 * Get related resources based on content, tags, and category
 */
export async function getRelatedResources(
  resourceId: string,
  contentType: string,
  tags: string[] = [],
  category: string | null = null,
  limit: number = 4
): Promise<ResourceSearchResult[]> {
  if (!resourceId) return [];
  
  // Get edge config for caching if available
  const edgeConfig = await getVercelEdgeConfig();
  const useCache = edgeConfig?.get('useRelatedResourcesCache') as boolean || false;
  const cacheTTL = edgeConfig?.get('relatedResourcesCacheTTL') as number || 3600; // 1 hour default
  
  // Generate cache key if caching is enabled
  let cacheKey: string | null = null;
  if (useCache) {
    cacheKey = `related:${resourceId}:${limit}`;
    const cachedResult = await edgeConfig?.get(cacheKey);
    if (cachedResult) {
      return JSON.parse(cachedResult as string) as ResourceSearchResult[];
    }
  }
  
  // Build query to find related resources based on tags and category
  const tagCondition = tags.length > 0 
    ? Prisma.sql`tags ?| ${Prisma.raw(`array[${tags.map(tag => `'${tag}'`).join(', ')}]`)}` 
    : Prisma.sql`TRUE`;
    
  const categoryCondition = category 
    ? Prisma.sql`category = ${category}` 
    : Prisma.sql`TRUE`;
  
  const results = await prisma.$queryRaw<any[]>`
    SELECT 
      r.id, 
      r.title, 
      r.excerpt, 
      r.type as "contentType", 
      r.published_at as "publishedAt", 
      r.updated_at as "updatedAt", 
      u.name as "authorName", 
      r.author_id as "authorId", 
      r.category, 
      r.tags, 
      r.thumbnail_url as "thumbnailUrl", 
      r.slug, 
      r.view_count as "viewCount",
      CASE 
        WHEN r.category = ${category} THEN 2 
        ELSE 0 
      END +
      CASE 
        WHEN ${tags.length > 0 ? Prisma.sql`array_length(array(SELECT unnest(r.tags) INTERSECT SELECT unnest(${tags}::text[])), 1) > 0` : Prisma.sql`FALSE`} 
        THEN cardinality(array(SELECT unnest(r.tags) INTERSECT SELECT unnest(${tags}::text[])))
        ELSE 0 
      END AS relevance_score
    FROM resources r
    LEFT JOIN users u ON r.author_id = u.id
    WHERE 
      r.id <> ${resourceId} AND
      r.status = 'published' AND
      r.published_at IS NOT NULL AND
      (${tagCondition} OR ${categoryCondition})
    ORDER BY relevance_score DESC, r.published_at DESC
    LIMIT ${limit}
  `;
  
  // Process results
  const processedResults = results.map(item => ({
    ...item,
    tags: item.tags || [],
    highlighted: []
  }));
  
  // Store in cache if enabled
  if (useCache && cacheKey) {
    await edgeConfig?.set(cacheKey, JSON.stringify(processedResults), { ttl: cacheTTL });
  }
  
  return processedResults;
}

/**
 * Clear search cache
 */
export async function clearSearchCache(): Promise<boolean> {
  try {
    const edgeConfig = await getVercelEdgeConfig();
    if (!edgeConfig) return false;
    
    // Get all keys with search: prefix
    const keys = await edgeConfig.getAll();
    const searchKeys = Object.keys(keys).filter(key => 
      key.startsWith('search:') || key.startsWith('related:')
    );
    
    // Delete all search-related keys
    for (const key of searchKeys) {
      await edgeConfig.delete(key);
    }
    
    return true;
  } catch (error) {
    console.error('Error clearing search cache:', error);
    return false;
  }
}
