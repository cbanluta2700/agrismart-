import client from 'prom-client';

// Initialize prometheus registry
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Define common metrics
const httpRequestsTotal = new client.Counter({
  name: 'agrismart_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register]
});

const httpRequestDuration = new client.Histogram({
  name: 'agrismart_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2.5, 5, 10],
  registers: [register]
});

const serviceCallDuration = new client.Histogram({
  name: 'agrismart_service_call_duration_seconds',
  help: 'Service-to-service call duration in seconds',
  labelNames: ['service', 'endpoint', 'method'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2.5, 5, 10],
  registers: [register]
});

const databaseQueryDuration = new client.Histogram({
  name: 'agrismart_db_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['operation', 'entity'],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.5, 1, 2.5],
  registers: [register]
});

const circuitBreakerState = new client.Gauge({
  name: 'agrismart_circuit_breaker_state',
  help: 'Circuit breaker state (0=closed, 1=open)',
  labelNames: ['service'],
  registers: [register]
});

const cacheHitRatio = new client.Gauge({
  name: 'agrismart_cache_hit_ratio',
  help: 'Cache hit ratio',
  labelNames: ['cache'],
  registers: [register]
});

// Export metrics class
export const metrics = {
  register,
  
  recordApiRequest: (path: string, method: string, status: number, duration: number) => {
    httpRequestsTotal.labels(method, path, status.toString()).inc();
    httpRequestDuration.labels(method, path, status.toString()).observe(duration / 1000);
  },
  
  recordServiceCall: (service: string, endpoint: string, method: string, duration: number) => {
    serviceCallDuration.labels(service, endpoint, method).observe(duration / 1000);
  },
  
  recordDatabaseQuery: (operation: string, entity: string, duration: number) => {
    databaseQueryDuration.labels(operation, entity).observe(duration / 1000);
  },
  
  recordCircuitBreakerState: (service: string, state: 'open' | 'closed') => {
    circuitBreakerState.labels(service).set(state === 'open' ? 1 : 0);
  },
  
  updateCacheHitRatio: (cache: string, ratio: number) => {
    cacheHitRatio.labels(cache).set(ratio);
  },
  
  getMetricsHandler: async (req: any, res: any) => {
    res.setHeader('Content-Type', register.contentType);
    res.end(await register.metrics());
  }
};
