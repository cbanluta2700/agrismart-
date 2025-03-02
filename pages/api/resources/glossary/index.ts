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
  // Get the session to check if user is authenticated for write operations
  if (req.method !== 'GET') {
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
  }

  switch (req.method) {
    case 'GET':
      return getGlossaryTerms(req, res);
    case 'POST':
      return createGlossaryTerm(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

// Get glossary terms with optional filtering
async function getGlossaryTerms(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { 
      status, 
      page = '1', 
      limit = '50',
      search,
      tag,
      startsWith
    } = req.query;

    // Build filters
    const filters: any = {};
    
    if (status) {
      filters.status = status;
    }
    
    if (search) {
      filters.OR = [
        { term: { contains: search as string, mode: 'insensitive' } },
        { definition: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    
    if (tag) {
      filters.tags = { has: tag as string };
    }
    
    if (startsWith) {
      filters.term = { startsWith: startsWith as string, mode: 'insensitive' };
    }

    // Parse pagination
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Get glossary terms count for pagination
    const totalTerms = await prisma.glossaryTerm.count({
      where: filters,
    });

    // Get glossary terms
    const terms = await prisma.glossaryTerm.findMany({
      where: filters,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        term: 'asc',
      },
      skip,
      take: limitNum,
    });

    return res.status(200).json({
      terms,
      pagination: {
        total: totalTerms,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalTerms / limitNum),
      },
    });
  } catch (error) {
    console.error('Error getting glossary terms:', error);
    return res.status(500).json({ error: 'Failed to get glossary terms' });
  }
}

// Create a new glossary term
async function createGlossaryTerm(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    const userId = session?.user?.email ? 
      (await prisma.user.findUnique({ where: { email: session.user.email } }))?.id : 
      undefined;

    const {
      term,
      slug,
      definition,
      tags,
      status = 'draft',
    } = req.body;

    // Validate required fields
    if (!term || !definition) {
      return res.status(400).json({ error: 'Term and definition are required' });
    }

    // Generate a slug if not provided
    const finalSlug = slug || term.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Check if term or slug exists
    const existingTerm = await prisma.glossaryTerm.findFirst({
      where: {
        OR: [
          { term: { equals: term, mode: 'insensitive' } },
          { slug: finalSlug },
        ],
      },
    });

    if (existingTerm) {
      return res.status(400).json({ error: 'Term or slug already exists' });
    }

    // Create the glossary term
    const glossaryTerm = await prisma.glossaryTerm.create({
      data: {
        term,
        slug: finalSlug,
        definition,
        authorId: userId,
        tags: tags || [],
        status,
        publishedAt: status === 'published' ? new Date() : null,
      },
    });

    // Create a content version
    await createContentVersion(
      prisma,
      CONTENT_TYPES.GLOSSARY,
      glossaryTerm.id,
      {
        term,
        slug: finalSlug,
        definition,
        tags: tags || [],
      },
      userId
    );

    // If published, deploy to edge
    if (status === 'published') {
      await deployContent(CONTENT_TYPES.GLOSSARY, glossaryTerm.id, glossaryTerm);
    }

    return res.status(201).json({ glossaryTerm });
  } catch (error) {
    console.error('Error creating glossary term:', error);
    return res.status(500).json({ error: 'Failed to create glossary term' });
  }
}
