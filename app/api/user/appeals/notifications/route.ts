import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // Get the user session
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Fetch appeal notifications for this user
    const notifications = await prisma.moderationAppealNotification.findMany({
      where: {
        userId,
      },
      include: {
        appeal: {
          include: {
            comment: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    // Transform the data for the frontend
    const formattedNotifications = notifications.map(notification => ({
      id: notification.id,
      appealId: notification.appealId,
      commentId: notification.appeal.commentId,
      commentPreview: notification.appeal.comment.content,
      status: notification.appeal.status,
      createdAt: notification.createdAt,
      moderatorNotes: notification.appeal.moderatorNotes,
      read: notification.read,
    }));
    
    return NextResponse.json({ 
      notifications: formattedNotifications,
    });
  } catch (error) {
    console.error('Error fetching appeal notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appeal notifications' }, 
      { status: 500 }
    );
  }
}
