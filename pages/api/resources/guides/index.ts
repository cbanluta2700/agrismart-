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
      return getGuides(req, res);
    case 'POST':
      return createGuide(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

// Get guides with optional filtering
async function getGuides(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { 
      status, 
      categoryId, 
      page = '1', 
      limit = '10',
      search,
      tag,
      difficulty 
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
    
    if (difficulty) {
      filters.difficulty = difficulty;
    }

    // Parse pagination
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Get guides count for pagination
    const totalGuides = await prisma.guide.count({
      where: filters,
    });

    // Get guides
    const guides = await prisma.guide.findMany({
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
      guides,
      pagination: {
        total: totalGuides,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalGuides / limitNum),
      },
    });
  } catch (error) {
    console.error('Error getting guides:', error);
    return res.status(500).json({ error: 'Failed to get guides' });
  }
}

// Create a new guide
async function createGuide(req: NextApiRequest, res: NextApiResponse) {
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
      steps,
      tags,
      status = 'draft',
      difficulty,
      metadata,
    } = req.body;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Check if slug exists
    if (slug) {
      const existingGuide = await prisma.guide.findUnique({
        where: { slug },
      });

      if (existingGuide) {
        return res.status(400).json({ error: 'Slug already exists' });
      }
    }

    // Generate a slug if not provided
    const finalSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Validate steps format if provided
    if (steps && !Array.isArray(steps)) {
      return res.status(400).json({ error: 'Steps must be an array' });
    }

    // Create the guide
    const guide = await prisma.guide.create({
      data: {
        title,
        slug: finalSlug,
        summary,
        content,
        featuredImage,
        categoryId,
        authorId: userId,
        steps: steps || [],
        tags: tags || [],
        status,
        difficulty,
        metadata: metadata || {},
      },
    });

    // Create a content version
    await createContentVersion(
      prisma,
      CONTENT_TYPES.GUIDE,
      guide.id,
      {
        title,
        slug: finalSlug,
        summary,
        content,
        featuredImage,
        categoryId,
        steps: steps || [],
        tags: tags || [],
        difficulty,
        metadata: metadata || {},
      },
      userId
    );

    // If published, deploy to edge
    if (status === 'published') {
      await deployContent(CONTENT_TYPES.GUIDE, guide.id, guide);
    }

    return res.status(201).json({ guide });
  } catch (error) {
    console.error('Error creating guide:', error);
    return res.status(500).json({ error: 'Failed to create guide' });
  }
}
