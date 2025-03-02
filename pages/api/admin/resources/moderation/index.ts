import { NextApiRequest, NextApiResponse } from 'next';
import { unstable_getServerSession } from 'next-auth/next';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { ResourceModerationItem } from '@/types/resources';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check authentication
  const session = await unstable_getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  // Check admin role
  const isAdmin = session.user?.role === 'ADMIN' || session.user?.role === 'SUPER_ADMIN';
  if (!isAdmin) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getModerationItems(req, res);
    default:
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }
}

// Get moderation items with filtering and pagination
async function getModerationItems(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const {
      query = '',
      contentType = '',
      status = '',
      page = '1',
      pageSize = '20'
    } = req.query;

    // Parse pagination parameters
    const pageNumber = parseInt(page as string, 10) || 1;
    const itemsPerPage = parseInt(pageSize as string, 10) || 20;
    const skip = (pageNumber - 1) * itemsPerPage;

    // Build base filter
    const baseFilter: Prisma.ResourceWhereInput = {};

    // Add content type filter if provided
    if (contentType && contentType !== 'all') {
      baseFilter.contentType = contentType as string;
    }

    // Add status filter if provided
    if (status && status !== 'all') {
      baseFilter.status = status.toUpperCase() as any;
    }

    // Add search query filter if provided
    if (query) {
      const searchQuery = query as string;
      baseFilter.OR = [
        { title: { contains: searchQuery, mode: 'insensitive' as Prisma.QueryMode } },
        { 
          author: { 
            name: { contains: searchQuery, mode: 'insensitive' as Prisma.QueryMode } 
          } 
        }
      ];
    }

    // Get total count of filtered items
    const totalItems = await prisma.resource.count({
      where: baseFilter
    });

    // Calculate total pages
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Get resources matching the filters
    const resources = await prisma.resource.findMany({
      where: baseFilter,
      orderBy: [
        { status: 'asc' },
        { updatedAt: 'desc' }
      ],
      skip,
      take: itemsPerPage,
      include: {
        author: {
          select: {
            id: true,
            name: true
          }
        },
        moderationLog: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            moderator: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    // Transform resources to ModerationItems
    const items: ResourceModerationItem[] = await Promise.all(resources.map(async (resource) => {
      // Get detailed resource info based on content type
      let detailedResource;
      switch (resource.contentType) {
        case 'article':
          detailedResource = await prisma.article.findUnique({
            where: { id: resource.id },
            select: { title: true, slug: true }
          });
          break;
        case 'guide':
          detailedResource = await prisma.guide.findUnique({
            where: { id: resource.id },
            select: { title: true, slug: true }
          });
          break;
        case 'video':
          detailedResource = await prisma.video.findUnique({
            where: { id: resource.id },
            select: { title: true, slug: true }
          });
          break;
        case 'glossary':
          detailedResource = await prisma.glossaryTerm.findUnique({
            where: { id: resource.id },
            select: { term: true, slug: true }
          });
          break;
      }

      const recentModeration = resource.moderationLog && resource.moderationLog.length > 0
        ? resource.moderationLog[0]
        : null;

      return {
        id: resource.id,
        title: detailedResource?.title || detailedResource?.term || 'Untitled',
        slug: detailedResource?.slug,
        contentType: resource.contentType as any,
        authorId: resource.authorId,
        authorName: resource.author.name,
        status: resource.status as any,
        createdAt: resource.createdAt.toISOString(),
        updatedAt: resource.updatedAt.toISOString(),
        rejectionReason: recentModeration?.reason || undefined,
        moderatedBy: recentModeration?.moderator?.name,
        moderatedAt: recentModeration?.createdAt.toISOString(),
      };
    }));

    return res.status(200).json({
      items,
      totalItems,
      totalPages,
      page: pageNumber
    });
  } catch (error) {
    console.error('Error fetching moderation items:', error);
    return res.status(500).json({ message: 'Error fetching moderation items' });
  }
}
