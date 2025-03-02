import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { ModerationAction, ModerationStatus } from '@prisma/client';
import { performModeratorAction } from '@/lib/moderation/actions';

// Schema for moderation actions
const moderationActionSchema = z.object({
  status: z.nativeEnum(ModerationStatus),
  action: z.nativeEnum(ModerationAction).optional(),
  notes: z.string().optional(),
  contentEdits: z.record(z.any()).optional(), // For storing edited content if applicable
});

// GET - Fetch a specific moderation queue item
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has moderation permissions
    const userPermissions = await prisma.userPermission.findMany({
      where: {
        userId: session.user.id,
        permission: {
          in: ['ADMIN', 'MODERATOR']
        }
      }
    });
    
    const isModerator = userPermissions.length > 0;
    
    if (!isModerator) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const { id } = params;
    
    // Fetch the queue item with history
    const queueItem = await prisma.moderationQueue.findUnique({
      where: { id },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            image: true,
          }
        },
        moderator: {
          select: {
            id: true,
            name: true,
            image: true,
          }
        },
        history: {
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            moderator: {
              select: {
                id: true,
                name: true,
                image: true,
              }
            }
          }
        }
      }
    });
    
    if (!queueItem) {
      return NextResponse.json({ error: 'Moderation queue item not found' }, { status: 404 });
    }
    
    // If not assigned and status is PENDING, assign to current moderator 
    // and update status to IN_REVIEW
    if (!queueItem.moderatorId && queueItem.status === 'PENDING') {
      const updatedQueueItem = await prisma.moderationQueue.update({
        where: { id },
        data: {
          moderatorId: session.user.id,
          status: 'IN_REVIEW',
          assignedAt: new Date(),
        }
      });
      
      // Create history record for assignment
      await prisma.moderationHistory.create({
        data: {
          queueItemId: id,
          status: 'IN_REVIEW',
          moderatorId: session.user.id,
          notes: 'Item assigned for review',
        }
      });
      
      // Return updated item with content
      return NextResponse.json({
        ...updatedQueueItem,
        content: await fetchContentDetails(queueItem.contentType, queueItem.contentId)
      });
    }
    
    // Return queue item with content
    return NextResponse.json({
      ...queueItem,
      content: await fetchContentDetails(queueItem.contentType, queueItem.contentId)
    });
    
  } catch (error) {
    console.error('Error fetching moderation queue item:', error);
    return NextResponse.json({ error: 'Failed to fetch moderation queue item' }, { status: 500 });
  }
}

// PUT - Update a moderation queue item with a decision
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has moderation permissions
    const userPermissions = await prisma.userPermission.findMany({
      where: {
        userId: session.user.id,
        permission: {
          in: ['ADMIN', 'MODERATOR']
        }
      }
    });
    
    const isModerator = userPermissions.length > 0;
    
    if (!isModerator) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const { id } = params;
    const data = await request.json();
    const { status, action, notes, contentEdits } = moderationActionSchema.parse(data);
    
    // Fetch the queue item
    const queueItem = await prisma.moderationQueue.findUnique({
      where: { id }
    });
    
    if (!queueItem) {
      return NextResponse.json({ error: 'Moderation queue item not found' }, { status: 404 });
    }
    
    // Make sure we're not updating an already resolved item
    if (['APPROVED', 'REJECTED', 'AUTO_APPROVED', 'AUTO_REJECTED'].includes(queueItem.status)) {
      return NextResponse.json({ error: 'Cannot update a resolved moderation item' }, { status: 400 });
    }
    
    // Update the queue item
    const updatedQueueItem = await prisma.moderationQueue.update({
      where: { id },
      data: {
        status,
        moderatorId: session.user.id,
        assignedAt: queueItem.assignedAt || new Date(),
        resolvedAt: ['APPROVED', 'REJECTED'].includes(status) ? new Date() : null,
        actionTaken: action,
        notes,
      }
    });
    
    // Create history record
    await prisma.moderationHistory.create({
      data: {
        queueItemId: id,
        status,
        actionTaken: action,
        moderatorId: session.user.id,
        notes,
      }
    });
    
    // Perform any necessary actions based on the decision
    await performModeratorAction(
      queueItem.contentType,
      queueItem.contentId,
      action,
      contentEdits,
      session.user.id
    );
    
    return NextResponse.json({
      id: updatedQueueItem.id,
      status: updatedQueueItem.status,
      actionTaken: updatedQueueItem.actionTaken
    });
    
  } catch (error) {
    console.error('Error updating moderation queue item:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Failed to update moderation queue item' }, { status: 500 });
  }
}

// Helper function to fetch content details based on content type and ID
async function fetchContentDetails(contentType: string, contentId: string) {
  switch (contentType) {
    case 'POST':
      return prisma.post.findUnique({
        where: { id: contentId },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              image: true,
            }
          }
        }
      });
      
    case 'COMMENT':
      return prisma.comment.findUnique({
        where: { id: contentId },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              image: true,
            }
          },
          post: {
            select: {
              id: true,
              title: true,
            }
          }
        }
      });
      
    case 'PRODUCT':
      return prisma.marketplaceProduct.findUnique({
        where: { id: contentId },
        include: {
          seller: {
            select: {
              id: true,
              name: true,
              image: true,
            }
          },
          category: true
        }
      });
      
    case 'RESOURCE':
      return prisma.resource.findUnique({
        where: { id: contentId },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              image: true,
            }
          },
          categories: {
            include: {
              category: true
            }
          }
        }
      });
      
    case 'GROUP':
      return prisma.group.findUnique({
        where: { id: contentId },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              image: true,
            }
          }
        }
      });
      
    case 'EVENT':
      return prisma.event.findUnique({
        where: { id: contentId },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              image: true,
            }
          },
          group: true
        }
      });
      
    case 'PROFILE':
      return prisma.user.findUnique({
        where: { id: contentId },
        select: {
          id: true,
          name: true,
          image: true,
          bio: true,
          location: true,
          website: true,
          email: true,
        }
      });
      
    case 'MESSAGE':
      return prisma.message.findUnique({
        where: { id: contentId },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              image: true,
            }
          },
          receiver: {
            select: {
              id: true,
              name: true,
              image: true,
            }
          }
        }
      });
      
    default:
      return null;
  }
}
