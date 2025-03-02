import { NextApiRequest, NextApiResponse } from 'next';
import { unstable_getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { ResourceContentType } from '@/types/resources';

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

  const { type, id } = req.query;
  
  if (!type || !id || typeof type !== 'string' || typeof id !== 'string') {
    return res.status(400).json({ message: 'Invalid resource type or ID' });
  }

  // Validate resource type
  const validTypes: ResourceContentType[] = ['article', 'guide', 'video', 'glossary'];
  if (!validTypes.includes(type as ResourceContentType)) {
    return res.status(400).json({ message: 'Invalid resource type' });
  }

  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getResource(req, res, type as ResourceContentType, id);
    case 'DELETE':
      return deleteResource(req, res, type as ResourceContentType, id);
    default:
      res.setHeader('Allow', ['GET', 'DELETE']);
      return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }
}

// Get a specific resource
async function getResource(
  req: NextApiRequest,
  res: NextApiResponse,
  type: ResourceContentType,
  id: string
) {
  try {
    let resource;

    // Get the resource based on type
    switch (type) {
      case 'article':
        resource = await prisma.article.findUnique({
          where: { id },
          include: {
            author: { select: { id: true, name: true, email: true } }
          }
        });
        break;
      case 'guide':
        resource = await prisma.guide.findUnique({
          where: { id },
          include: {
            author: { select: { id: true, name: true, email: true } }
          }
        });
        break;
      case 'video':
        resource = await prisma.video.findUnique({
          where: { id },
          include: {
            author: { select: { id: true, name: true, email: true } }
          }
        });
        break;
      case 'glossary':
        resource = await prisma.glossaryTerm.findUnique({
          where: { id },
          include: {
            author: { select: { id: true, name: true, email: true } }
          }
        });
        break;
    }

    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    return res.status(200).json(resource);
  } catch (error) {
    console.error(`Error fetching ${type}:`, error);
    return res.status(500).json({ message: `Error fetching ${type}` });
  }
}

// Delete a resource
async function deleteResource(
  req: NextApiRequest,
  res: NextApiResponse,
  type: ResourceContentType,
  id: string
) {
  try {
    // Verify the resource exists
    const resourceExists = await prisma[type].findUnique({
      where: { id },
      select: { id: true }
    });

    if (!resourceExists) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    // Start a transaction to delete the resource and any associated records
    await prisma.$transaction(async (tx) => {
      // Delete moderation logs
      await tx.resourceModerationLog.deleteMany({
        where: { resourceId: id }
      });

      // Delete the resource from the Resource tracking table
      await tx.resource.delete({
        where: { id }
      });

      // Delete the actual content based on type
      switch (type) {
        case 'article':
          await tx.article.delete({
            where: { id }
          });
          break;
        case 'guide':
          await tx.guide.delete({
            where: { id }
          });
          break;
        case 'video':
          await tx.video.delete({
            where: { id }
          });
          break;
        case 'glossary':
          await tx.glossaryTerm.delete({
            where: { id }
          });
          break;
      }
    });

    return res.status(200).json({ message: 'Resource deleted successfully' });
  } catch (error) {
    console.error(`Error deleting ${type}:`, error);
    return res.status(500).json({ message: `Error deleting ${type}` });
  }
}
