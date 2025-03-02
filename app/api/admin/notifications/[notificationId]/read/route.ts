import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { markNotificationAsRead } from '@/lib/vercel/notification-service';
import { trackModerationActivity } from '@/lib/vercel/moderation-analytics';
import { isAdminOrModerator } from '@/lib/auth/role-check';

export async function POST(
  req: NextRequest,
  { params }: { params: { notificationId: string } }
) {
  try {
    // Check authentication and authorization
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!await isAdminOrModerator(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { notificationId } = params;
    
    // Mark notification as read
    const result = await markNotificationAsRead(notificationId);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to mark notification as read' },
        { status: 400 }
      );
    }

    // Track analytics in background
    trackModerationActivity('notification_marked_read', {
      userId: session.user.email,
      notificationId,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark notification as read' },
      { status: 500 }
    );
  }
}
