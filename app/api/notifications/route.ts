import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// Schema for fetching notifications with pagination
const getNotificationsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
  unreadOnly: z.coerce.boolean().default(false),
});

// Schema for creating a notification
const createNotificationSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum([
    'POST_CREATED', 
    'COMMENT_CREATED', 
    'GROUP_INVITATION', 
    'GROUP_JOIN_REQUEST',
    'GROUP_ROLE_UPDATED',
    'POST_MODERATED',
    'COMMENT_MODERATED',
    'MENTION'
  ]),
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(500),
  linkUrl: z.string().url().optional(),
  sourceId: z.string().optional(),
  sourceType: z.enum(['POST', 'COMMENT', 'GROUP', 'USER']).optional(),
});

// GET notifications for the authenticated user
export async function GET(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const params = getNotificationsSchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      unreadOnly: searchParams.get('unreadOnly'),
    });
    
    // Calculate pagination values
    const skip = (params.page - 1) * params.limit;
    
    // Build the query
    const where = {
      userId: session.user.id,
      ...(params.unreadOnly ? { read: false } : {}),
    };
    
    // Fetch notifications with pagination
    const [notifications, totalCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: params.limit,
      }),
      prisma.notification.count({ where }),
    ]);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / params.limit);
    
    return NextResponse.json({
      notifications,
      pagination: {
        page: params.page,
        limit: params.limit,
        totalItems: totalCount,
        totalPages,
        hasNextPage: params.page < totalPages,
        hasPrevPage: params.page > 1,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// POST create a new notification
export async function POST(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Only allow admins and the system to create notifications
  const isAdmin = session.user.roles?.includes('ADMIN');
  const isSystem = session.user.id === 'system';
  
  if (!isAdmin && !isSystem) {
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 }
    );
  }
  
  try {
    const json = await request.json();
    const validatedData = createNotificationSchema.parse(json);
    
    // Create the notification
    const notification = await prisma.notification.create({
      data: {
        userId: validatedData.userId,
        type: validatedData.type,
        title: validatedData.title,
        content: validatedData.content,
        linkUrl: validatedData.linkUrl,
        sourceId: validatedData.sourceId,
        sourceType: validatedData.sourceType,
        read: false,
      },
    });
    
    return NextResponse.json(notification);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

// PATCH mark all notifications as read
export async function PATCH(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Mark all notifications as read for the user
    await prisma.notification.updateMany({
      where: { userId: session.user.id, read: false },
      data: { read: true },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to mark notifications as read' },
      { status: 500 }
    );
  }
}
