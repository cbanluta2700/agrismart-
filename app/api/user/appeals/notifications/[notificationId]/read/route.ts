import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export async function POST(
  req: NextRequest,
  { params }: { params: { notificationId: string } }
) {
  try {
    // Get the user session
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const { notificationId } = params;
    
    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      );
    }
    
    // Verify the notification belongs to this user
    const notification = await prisma.moderationAppealNotification.findUnique({
      where: {
        id: notificationId,
      },
    });
    
    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }
    
    if (notification.userId !== userId) {
      return NextResponse.json(
        { error: 'You do not have permission to update this notification' },
        { status: 403 }
      );
    }
    
    // Mark the notification as read
    const updatedNotification = await prisma.moderationAppealNotification.update({
      where: {
        id: notificationId,
      },
      data: {
        read: true,
      },
    });
    
    return NextResponse.json({
      success: true,
      notification: {
        id: updatedNotification.id,
        read: updatedNotification.read,
      },
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark notification as read' },
      { status: 500 }
    );
  }
}
