import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { analyticsMiddleware } from './middleware/analyticsMiddleware'
import { moderationMiddleware } from './middleware/moderationMiddleware'
import { aiModerationMiddleware } from './middleware/aiModerationMiddleware'

// Security headers configuration
const securityHeaders = {
  // HSTS
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://api.agrismart.com",
    "frame-ancestors 'none'",
  ].join('; '),
  // XSS Protection
  'X-XSS-Protection': '1; mode=block',
  // Content Type Options
  'X-Content-Type-Options': 'nosniff',
  // Frame Options
  'X-Frame-Options': 'DENY',
  // Referrer Policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Permissions Policy
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'interest-cohort=()',
  ].join(', '),
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Process AI moderation middleware for AI moderation routes
  if (pathname.startsWith('/api/moderation/ai-check') || pathname.startsWith('/api/admin/moderation/ai')) {
    const aiModerationResponse = await aiModerationMiddleware(request)
    if (aiModerationResponse && aiModerationResponse.status !== 200) {
      return aiModerationResponse
    }
  }
  
  // Process moderation middleware for moderation-related API routes
  if (pathname.startsWith('/api/moderation') || pathname.startsWith('/api/admin/moderation')) {
    const moderationResponse = await moderationMiddleware(request)
    if (moderationResponse.status !== 200) {
      return moderationResponse
    }
  }
  
  // First, process analytics middleware
  const analyticsResponse = await analyticsMiddleware(request)
  
  // Get headers from analytics middleware if they exist
  const response = analyticsResponse || NextResponse.next()

  // Apply security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // CORS headers for API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    )
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization'
    )
  }

  return response
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}