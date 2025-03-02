import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// List of paths to track
const TRACKABLE_PATHS = [
  '/forum',
  '/forum/groups',
  '/market',
  '/learn',
  '/profile',
];

// Check if a path should be tracked
const shouldTrackPath = (path: string) => {
  return TRACKABLE_PATHS.some(trackablePath => 
    path === trackablePath || path.startsWith(`${trackablePath}/`)
  );
};

/**
 * Middleware for tracking page views
 * This runs on the edge and drops a cookie to avoid double-counting views
 */
export async function analyticsMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip tracking for API routes, static files, etc.
  if (
    pathname.startsWith('/api/') || 
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    !shouldTrackPath(pathname)
  ) {
    return NextResponse.next();
  }

  // Get session token to identify user
  const token = await getToken({ req: request as any });
  const userId = token?.sub;

  // Prepare response
  const response = NextResponse.next();

  // Check if this page view was already tracked in this session
  const viewedKey = `viewed_${pathname}`;
  if (request.cookies.has(viewedKey)) {
    return response;
  }

  // Set a temporary cookie to avoid double-counting views
  // This cookie will expire after 5 minutes
  response.cookies.set(viewedKey, '1', { 
    maxAge: 300, // 5 minutes
    path: '/',
    sameSite: 'strict',
  });

  // Extract group ID if present in the path
  let groupId: string | undefined;
  const groupMatch = pathname.match(/\/forum\/groups\/([^\/]+)/);
  if (groupMatch && groupMatch[1]) {
    groupId = groupMatch[1];
  }

  // Add a header that the server-side code will use to track the view
  const eventData = JSON.stringify({
    type: 'PAGE_VIEW',
    entityType: 'page',
    entityId: pathname,
    userId,
    groupId,
    metadata: {
      userAgent: request.headers.get('user-agent'),
      referrer: request.headers.get('referer'),
    },
  });

  response.headers.set('X-Track-Analytics', eventData);
  
  return response;
}
