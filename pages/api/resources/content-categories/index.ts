import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
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
      return getCategories(req, res);
    case 'POST':
      return createCategory(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

// Get content categories with optional filtering
async function getCategories(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { parentId, includeChildren = 'false' } = req.query;

    // Build filters
    const filters: any = {};
    
    if (parentId === 'null') {
      filters.parentId = null;
    } else if (parentId) {
      filters.parentId = parentId as string;
    }

    const categories = await prisma.contentCategory.findMany({
      where: filters,
      orderBy: {
        name: 'asc',
      },
      ...(includeChildren === 'true' && {
        include: {
          children: true,
        },
      }),
    });

    return res.status(200).json({ categories });
  } catch (error) {
    console.error('Error getting content categories:', error);
    return res.status(500).json({ error: 'Failed to get content categories' });
  }
}

// Create a new content category
async function createCategory(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { name, description, parentId } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Generate slug
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Check if slug exists
    const existingCategory = await prisma.contentCategory.findUnique({
      where: { slug },
    });

    if (existingCategory) {
      return res.status(400).json({ error: 'A category with this name already exists' });
    }

    // Create the category
    const category = await prisma.contentCategory.create({
      data: {
        name,
        slug,
        description,
        parentId: parentId || null,
      },
    });

    return res.status(201).json({ category });
  } catch (error) {
    console.error('Error creating content category:', error);
    return res.status(500).json({ error: 'Failed to create content category' });
  }
}
