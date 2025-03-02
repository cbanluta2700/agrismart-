import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import analyticsService from '@/server/src/lib/services/analyticsService';

/**
 * Process analytics tracking from the middleware or client-side events
 * This endpoint handles tracking data sent by the middleware via headers
 * or directly from the client via POST requests
 * 
 * POST /api/analytics/track
 */
export async function POST(request: NextRequest) {
  try {
    // Check for tracking data in headers (from middleware)
    const trackHeader = request.headers.get('X-Track-Analytics');
    let eventData;
    
    if (trackHeader) {
      // Parse tracking data from middleware
      try {
        eventData = JSON.parse(trackHeader);
      } catch (e) {
        console.error('Failed to parse analytics header:', e);
        return NextResponse.json(
          { error: 'Invalid analytics data format' },
          { status: 400 }
        );
      }
    } else {
      // Parse tracking data from request body (client-side)
      eventData = await request.json();
    }

    // Get user session for tracking if not already in event data
    if (!eventData.userId) {
      const session = await getServerSession(authOptions);
      if (session?.user?.id) {
        eventData.userId = session.user.id;
      }
    }

    // Validate required fields
    if (!eventData.type || !eventData.entityType) {
      return NextResponse.json(
        { error: 'Missing required fields: type, entityType' },
        { status: 400 }
      );
    }

    // Track the event
    await analyticsService.trackEvent(eventData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking analytics:', error);
    return NextResponse.json(
      { error: 'Failed to track analytics' },
      { status: 500 }
    );
  }
}
