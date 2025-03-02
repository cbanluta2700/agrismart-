import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { 
  CONTENT_TYPES, 
  createContentVersion, 
  deployContent,
  invalidateCache
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
  
  if (!session && req.method !== 'GET') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // For non-GET methods, check if user has permission to manage content
  if (req.method !== 'GET') {
    const user = await prisma.user.findUnique({
      where: { email: session?.user?.email as string },
      select: { roles: true },
    });

    const canManageContent = user?.roles.some(role => 
      ['ADMIN', 'SELLER'].includes(role)
    );

    if (!canManageContent) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid article ID' });
  }

  switch (req.method) {
    case 'GET':
      return getArticle(req, res, id);
    case 'PUT':
      return updateArticle(req, res, id);
    case 'DELETE':
      return deleteArticle(req, res, id);
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

// Get a single article by ID
async function getArticle(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    // Track view if this isn't an admin/editor view
    const isTrackView = req.query.track === 'true';
    
    const article = await prisma.article.findUnique({
      where: { id },
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
    });

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Increment view count if tracking is enabled
    if (isTrackView) {
      await prisma.article.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      });
    }

    return res.status(200).json({ article });
  } catch (error) {
    console.error('Error getting article:', error);
    return res.status(500).json({ error: 'Failed to get article' });
  }
}

// Update an existing article
async function updateArticle(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const session = await getServerSession(req, res, authOptions);
    const userId = session?.user?.email ? 
      (await prisma.user.findUnique({ where: { email: session.user.email } }))?.id : 
      undefined;

    // Check if article exists
    const existingArticle = await prisma.article.findUnique({
      where: { id },
    });

    if (!existingArticle) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const {
      title,
      slug,
      summary,
      content,
      featuredImage,
      categoryId,
      tags,
      status,
      metadata,
    } = req.body;

    // If slug is changed, check if it's available
    if (slug && slug !== existingArticle.slug) {
      const slugExists = await prisma.article.findUnique({
        where: { slug },
      });

      if (slugExists) {
        return res.status(400).json({ error: 'Slug already exists' });
      }
    }

    // Prepare update data
    const updateData: any = {};
    
    if (title !== undefined) updateData.title = title;
    if (slug !== undefined) updateData.slug = slug;
    if (summary !== undefined) updateData.summary = summary;
    if (content !== undefined) {
      updateData.content = content;
      updateData.readTime = calculateReadTime(content);
    }
    if (featuredImage !== undefined) updateData.featuredImage = featuredImage;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (tags !== undefined) updateData.tags = tags;
    if (status !== undefined) updateData.status = status;
    if (metadata !== undefined) updateData.metadata = metadata;

    // If status is changing to published, set publishedAt
    if (status === 'published' && existingArticle.status !== 'published') {
      updateData.publishedAt = new Date();
    }

    // Update the article
    const updatedArticle = await prisma.article.update({
      where: { id },
      data: updateData,
    });

    // Create a content version
    const versionData = {
      title: updatedArticle.title,
      slug: updatedArticle.slug,
      summary: updatedArticle.summary,
      content: updatedArticle.content,
      featuredImage: updatedArticle.featuredImage,
      categoryId: updatedArticle.categoryId,
      tags: updatedArticle.tags,
      metadata: updatedArticle.metadata,
    };

    await createContentVersion(
      prisma,
      CONTENT_TYPES.ARTICLE,
      id,
      versionData,
      userId
    );

    // If published, deploy to edge and invalidate cache
    if (status === 'published') {
      await deployContent(CONTENT_TYPES.ARTICLE, id, updatedArticle);
    } else if (existingArticle.status === 'published' && status !== 'published') {
      // If unpublishing, invalidate cache
      await invalidateCache(CONTENT_TYPES.ARTICLE, id);
    }

    return res.status(200).json({ article: updatedArticle });
  } catch (error) {
    console.error('Error updating article:', error);
    return res.status(500).json({ error: 'Failed to update article' });
  }
}

// Delete an article
async function deleteArticle(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    // Check if article exists
    const article = await prisma.article.findUnique({
      where: { id },
    });

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Delete the article
    await prisma.article.delete({
      where: { id },
    });

    // Invalidate cache if it was published
    if (article.status === 'published') {
      await invalidateCache(CONTENT_TYPES.ARTICLE, id);
    }

    return res.status(200).json({ message: 'Article deleted successfully' });
  } catch (error) {
    console.error('Error deleting article:', error);
    return res.status(500).json({ error: 'Failed to delete article' });
  }
}

// Helper function to calculate read time in minutes
function calculateReadTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}
