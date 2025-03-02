import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { getAllNotifications, getUnreadNotifications } from '@/lib/vercel/notification-service';
import { trackModerationActivity } from '@/lib/vercel/moderation-analytics';
import { isAdminOrModerator } from '@/lib/auth/role-check';

// Schema for GET request query parameters
const GetNotificationsSchema = z.object({
  unreadOnly: z.string().optional().transform(val => val === 'true'),
  page: z.string().optional().transform(val => parseInt(val || '1')),
  pageSize: z.string().optional().transform(val => parseInt(val || '20')),
});

export async function GET(req: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!await isAdminOrModerator(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse and validate query parameters
    const url = new URL(req.url);
    const rawParams = {
      unreadOnly: url.searchParams.get('unreadOnly'),
      page: url.searchParams.get('page'),
      pageSize: url.searchParams.get('pageSize'),
    };

    const params = GetNotificationsSchema.parse(rawParams);

    // Get notifications based on parameters
    let result;
    if (params.unreadOnly) {
      const limit = params.pageSize || 50;
      const notifications = await getUnreadNotifications(limit);
      result = { 
        notifications, 
        total: notifications.length,
        page: 1,
        pageSize: limit,
        totalPages: 1,
      };
    } else {
      result = await getAllNotifications(params.page, params.pageSize);
    }

    // Track analytics in background
    trackModerationActivity('notifications_viewed', {
      userId: session.user.email,
      unreadOnly: params.unreadOnly,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
