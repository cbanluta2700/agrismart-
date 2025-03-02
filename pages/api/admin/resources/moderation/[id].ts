import { NextApiRequest, NextApiResponse } from 'next';
import { unstable_getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { ResourceModerationAction, ResourceStatus } from '@/types/resources';

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

  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Invalid resource ID' });
  }

  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getModerationDetails(req, res, id);
    case 'PATCH':
      return updateModerationStatus(req, res, id);
    default:
      res.setHeader('Allow', ['GET', 'PATCH']);
      return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }
}

// Get moderation details for a specific resource
async function getModerationDetails(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string
) {
  try {
    // First, check if the resource exists and get its content type
    const resourceType = await prisma.resource.findUnique({
      where: { id },
      select: { contentType: true }
    });

    if (!resourceType) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    let resource;

    // Retrieve the resource with appropriate details based on its type
    switch (resourceType.contentType) {
      case 'article':
        resource = await prisma.article.findUnique({
          where: { id },
          include: {
            author: { select: { id: true, name: true } },
            moderationLog: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: { moderator: { select: { id: true, name: true } } }
            }
          }
        });
        break;
      case 'guide':
        resource = await prisma.guide.findUnique({
          where: { id },
          include: {
            author: { select: { id: true, name: true } },
            moderationLog: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: { moderator: { select: { id: true, name: true } } }
            }
          }
        });
        break;
      case 'video':
        resource = await prisma.video.findUnique({
          where: { id },
          include: {
            author: { select: { id: true, name: true } },
            moderationLog: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: { moderator: { select: { id: true, name: true } } }
            }
          }
        });
        break;
      case 'glossary':
        resource = await prisma.glossaryTerm.findUnique({
          where: { id },
          include: {
            author: { select: { id: true, name: true } },
            moderationLog: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: { moderator: { select: { id: true, name: true } } }
            }
          }
        });
        break;
      default:
        return res.status(400).json({ message: 'Invalid content type' });
    }

    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    return res.status(200).json(resource);
  } catch (error) {
    console.error('Error fetching moderation details:', error);
    return res.status(500).json({ message: 'Error fetching moderation details' });
  }
}

// Update the moderation status of a resource
async function updateModerationStatus(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string
) {
  try {
    const { action, contentType, reason } = req.body as ResourceModerationAction;
    
    if (!action || !contentType) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({ message: 'Invalid action' });
    }

    if (action === 'reject' && !reason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const session = await unstable_getServerSession(req, res, authOptions);
    const moderatorId = session!.user!.id;

    // Update resource status based on content type
    let updatedResource;
    const newStatus: ResourceStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';

    // Start a transaction to update both the resource and create a moderation log
    await prisma.$transaction(async (tx) => {
      // Update the resource status based on content type
      switch (contentType) {
        case 'article':
          updatedResource = await tx.article.update({
            where: { id },
            data: { 
              status: newStatus,
              ...(action === 'approve' && !await tx.article.findUnique({ where: { id }, select: { publishedAt: true } }).publishedAt
                ? { publishedAt: new Date() }
                : {})
            }
          });
          break;
        case 'guide':
          updatedResource = await tx.guide.update({
            where: { id },
            data: { 
              status: newStatus,
              ...(action === 'approve' && !await tx.guide.findUnique({ where: { id }, select: { publishedAt: true } }).publishedAt
                ? { publishedAt: new Date() }
                : {})
            }
          });
          break;
        case 'video':
          updatedResource = await tx.video.update({
            where: { id },
            data: { 
              status: newStatus,
              ...(action === 'approve' && !await tx.video.findUnique({ where: { id }, select: { publishedAt: true } }).publishedAt
                ? { publishedAt: new Date() }
                : {})
            }
          });
          break;
        case 'glossary':
          updatedResource = await tx.glossaryTerm.update({
            where: { id },
            data: { 
              status: newStatus,
              ...(action === 'approve' && !await tx.glossaryTerm.findUnique({ where: { id }, select: { publishedAt: true } }).publishedAt
                ? { publishedAt: new Date() }
                : {})
            }
          });
          break;
        default:
          throw new Error('Invalid content type');
      }

      // Create a moderation log entry
      await tx.resourceModerationLog.create({
        data: {
          resourceId: id,
          contentType,
          action,
          status: newStatus,
          reason: action === 'reject' ? reason : null,
          moderatorId
        }
      });
    });

    return res.status(200).json({ 
      message: `Content has been ${action === 'approve' ? 'approved' : 'rejected'} successfully`, 
      status: newStatus 
    });
  } catch (error) {
    console.error('Error updating moderation status:', error);
    return res.status(500).json({ message: 'Error updating moderation status' });
  }
}
