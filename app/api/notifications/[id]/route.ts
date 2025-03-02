import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET a single notification by ID
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = params;
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const notification = await prisma.notification.findUnique({
      where: { id },
    });
    
    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    
    // Ensure the user can only access their own notifications
    if (notification.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    return NextResponse.json(notification);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to fetch notification' },
      { status: 500 }
    );
  }
}

// PATCH update a notification (mark as read)
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = params;
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Find the notification
    const notification = await prisma.notification.findUnique({
      where: { id },
    });
    
    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    
    // Ensure the user can only update their own notifications
    if (notification.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Mark the notification as read
    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    
    return NextResponse.json(updatedNotification);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}

// DELETE a notification
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = params;
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Find the notification
    const notification = await prisma.notification.findUnique({
      where: { id },
    });
    
    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    
    // Ensure the user can only delete their own notifications
    if (notification.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Delete the notification
    await prisma.notification.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}
