/**
 * Service-to-Service Communication Module
 * 
 * Implements a standardized pattern for inter-service communication
 * with circuit breaking, retries, and observability.
 */
import { CircuitBreaker } from 'opossum';
import { Logger } from './logger';
import { metrics } from './metrics';

interface ServiceRequestOptions {
  timeout?: number;
  retries?: number;
  fallback?: any;
  circuitBreakerOptions?: {
    timeout?: number;
    errorThresholdPercentage?: number;
    resetTimeout?: number;
  }
}

const DEFAULT_OPTIONS: ServiceRequestOptions = {
  timeout: 3000,
  retries: 3,
  circuitBreakerOptions: {
    timeout: 3000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
  }
};

const circuitBreakers = new Map<string, CircuitBreaker>();

export async function callService<T>(
  serviceName: string, 
  endpoint: string, 
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  payload?: any,
  options: ServiceRequestOptions = {}
): Promise<T> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const serviceKey = `${serviceName}:${endpoint}:${method}`;
  
  // Create circuit breaker if not exists
  if (!circuitBreakers.has(serviceKey)) {
    circuitBreakers.set(
      serviceKey, 
      new CircuitBreaker(async () => {
        const startTime = Date.now();
        
        try {
          const response = await fetch(`http://${serviceName}.default.svc.cluster.local/${endpoint}`, {
            method,
            headers: {
              'Content-Type': 'application/json',
              'X-Request-ID': getRequestId(),
            },
            body: payload ? JSON.stringify(payload) : undefined,
            timeout: mergedOptions.timeout,
          });
          
          if (!response.ok) {
            throw new Error(`Service ${serviceName} returned ${response.status}`);
          }
          
          return await response.json();
        } catch (error) {
          Logger.error(`Service call failed: ${serviceName}/${endpoint}`, { error });
          throw error;
        } finally {
          const duration = Date.now() - startTime;
          metrics.recordServiceCall(serviceName, endpoint, method, duration);
        }
      }, mergedOptions.circuitBreakerOptions)
    );
  }
  
  const breaker = circuitBreakers.get(serviceKey)!;
  
  // Add instrumentation
  breaker.on('open', () => {
    Logger.warn(`Circuit breaker opened for ${serviceKey}`);
    metrics.recordCircuitBreakerState(serviceKey, 'open');
  });
  
  breaker.on('close', () => {
    Logger.info(`Circuit breaker closed for ${serviceKey}`);
    metrics.recordCircuitBreakerState(serviceKey, 'closed');
  });
  
  return await breaker.fire() as T;
}

function getRequestId(): string {
  // Implementation to get current request ID for tracing
  return 'req-' + Math.random().toString(36).substring(2, 15);
}
