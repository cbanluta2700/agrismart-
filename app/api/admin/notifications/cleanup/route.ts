import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { clearOldNotifications } from '@/lib/vercel/notification-service';
import { isAdminOrModerator } from '@/lib/auth/role-check';

export async function POST(req: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!await isAdminOrModerator(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse days from request body
    const body = await req.json();
    const daysOlder = Math.min(Math.max(parseInt(body.days) || 30, 1), 90);
    
    // Clear old notifications
    const count = await clearOldNotifications(daysOlder);
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully cleared ${count} old notifications older than ${daysOlder} days` 
    });
  } catch (error) {
    console.error('Error clearing old notifications:', error);
    return NextResponse.json(
      { error: 'Failed to clear old notifications' },
      { status: 500 }
    );
  }
}
