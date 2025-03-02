/**
 * Middleware for the AgriSmart Platform
 * 
 * This middleware intercepts API requests and routes them to the mock API server
 * when running in demo mode.
 */

import { NextResponse } from 'next/server';

const MOCK_API_URL = process.env.NEXT_PUBLIC_MOCK_API_URL;

export function middleware(request) {
  // Only intercept admin API requests in development/demo mode
  if (MOCK_API_URL && request.nextUrl.pathname.startsWith('/api/admin/')) {
    // Create a new URL object with the mock API URL as the base
    const url = new URL(request.nextUrl.pathname, MOCK_API_URL);
    
    // Copy query parameters
    const searchParams = request.nextUrl.searchParams;
    searchParams.forEach((value, key) => {
      url.searchParams.append(key, value);
    });
    
    // Create a Request object to forward
    const options = {
      method: request.method,
      headers: request.headers
    };
    
    // Add body for POST requests
    if (request.method === 'POST') {
      return request.blob()
        .then(blob => {
          options.body = blob;
          return fetch(url, options);
        })
        .then(response => {
          return NextResponse.rewrite(response);
        });
    }
    
    // Rewrite the request to point to the mock API
    return NextResponse.rewrite(url);
  }
  
  // For all other requests, proceed as normal
  return NextResponse.next();
}

// Configure middleware to run only for API routes
export const config = {
  matcher: '/api/:path*',
};
