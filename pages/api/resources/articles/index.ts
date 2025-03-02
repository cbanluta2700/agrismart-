import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { 
  CONTENT_TYPES, 
  createContentVersion,
  deployContent 
} from '@/lib/vercel-sdk';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Get the session to check if user is authenticated
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Check if user has permission to manage content
  const user = await prisma.user.findUnique({
    where: { email: session.user?.email as string },
    select: { roles: true },
  });

  const canManageContent = user?.roles.some(role => 
    ['ADMIN', 'SELLER'].includes(role)
  );

  if (!canManageContent) {
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
  }

  switch (req.method) {
    case 'GET':
      return getArticles(req, res);
    case 'POST':
      return createArticle(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

// Get articles with optional filtering
async function getArticles(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { 
      status, 
      categoryId, 
      page = '1', 
      limit = '10',
      search,
      tag 
    } = req.query;

    // Build filters
    const filters: any = {};
    
    if (status) {
      filters.status = status;
    }
    
    if (categoryId) {
      filters.categoryId = categoryId as string;
    }
    
    if (search) {
      filters.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { summary: { contains: search as string, mode: 'insensitive' } },
        { content: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    
    if (tag) {
      filters.tags = { has: tag as string };
    }

    // Parse pagination
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Get articles count for pagination
    const totalArticles = await prisma.article.count({
      where: filters,
    });

    // Get articles
    const articles = await prisma.article.findMany({
      where: filters,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        publishedAt: 'desc',
      },
      skip,
      take: limitNum,
    });

    return res.status(200).json({
      articles,
      pagination: {
        total: totalArticles,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalArticles / limitNum),
      },
    });
  } catch (error) {
    console.error('Error getting articles:', error);
    return res.status(500).json({ error: 'Failed to get articles' });
  }
}

// Create a new article
async function createArticle(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    const userId = session?.user?.email ? 
      (await prisma.user.findUnique({ where: { email: session.user.email } }))?.id : 
      undefined;

    const {
      title,
      slug,
      summary,
      content,
      featuredImage,
      categoryId,
      tags,
      status = 'draft',
      metadata,
    } = req.body;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Check if slug exists
    if (slug) {
      const existingArticle = await prisma.article.findUnique({
        where: { slug },
      });

      if (existingArticle) {
        return res.status(400).json({ error: 'Slug already exists' });
      }
    }

    // Generate a slug if not provided
    const finalSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Create the article
    const article = await prisma.article.create({
      data: {
        title,
        slug: finalSlug,
        summary,
        content,
        featuredImage,
        categoryId,
        authorId: userId,
        tags: tags || [],
        status,
        readTime: calculateReadTime(content),
        metadata: metadata || {},
      },
    });

    // Create a content version
    await createContentVersion(
      prisma,
      CONTENT_TYPES.ARTICLE,
      article.id,
      {
        title,
        slug: finalSlug,
        summary,
        content,
        featuredImage,
        categoryId,
        tags: tags || [],
        metadata: metadata || {},
      },
      userId
    );

    // If published, deploy to edge
    if (status === 'published') {
      await deployContent(CONTENT_TYPES.ARTICLE, article.id, article);
    }

    return res.status(201).json({ article });
  } catch (error) {
    console.error('Error creating article:', error);
    return res.status(500).json({ error: 'Failed to create article' });
  }
}

// Helper function to calculate read time in minutes
function calculateReadTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}
