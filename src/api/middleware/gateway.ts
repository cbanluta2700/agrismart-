import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from './rate-limit';
import { authenticate } from './auth';
import { validate } from './validation';
import { metrics } from '../../lib/metrics';
import { Logger } from '../../lib/logger';

// Service routing configuration
const SERVICE_ROUTES = {
  '/api/auth': 'auth-service',
  '/api/farms': 'farm-management-service',
  '/api/crops': 'crop-management-service',
  '/api/marketplace': 'marketplace-service',
  '/api/sensors': 'sensor-data-service',
  '/api/chat': 'chat-service'
};

export async function apiGateway(req: NextRequest) {
  const startTime = Date.now();
  const url = new URL(req.url);
  const path = url.pathname;
  
  try {
    // 1. Apply rate limiting
    const rateLimitResult = await rateLimit(req);
    if (rateLimitResult.status !== 200) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }
    
    // 2. Authentication check
    const authResult = await authenticate(req);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // 3. Request validation
    const validationResult = await validate(req);
    if (!validationResult.valid) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.errors },
        { status: 400 }
      );
    }
    
    // 4. Route to appropriate service
    const targetService = determineTargetService(path);
    if (!targetService) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }
    
    // 5. Forward request to service
    const serviceResponse = await forwardRequest(req, targetService);
    
    // 6. Record metrics
    const duration = Date.now() - startTime;
    metrics.recordApiRequest(path, req.method, serviceResponse.status, duration);
    
    return serviceResponse;
  } catch (error) {
    Logger.error('API Gateway error', { path, error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function determineTargetService(path: string): string | null {
  for (const [routePrefix, service] of Object.entries(SERVICE_ROUTES)) {
    if (path.startsWith(routePrefix)) {
      return service;
    }
  }
  return null;
}

async function forwardRequest(req: NextRequest, service: string) {
  // Implementation to forward request to the target service
  // and return the response
  // ...
}
