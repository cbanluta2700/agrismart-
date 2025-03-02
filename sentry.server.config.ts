import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  // Performance Monitoring
  tracesSampleRate: 1.0,
  
  // Enable source maps
  includeLocalVariables: true,
  
  // Environment
  environment: process.env.NODE_ENV,
  
  // Set sampling rates for transactions
  // This sets the sample rate at 100% for development/testing
  // Adjust this value for production use
  tracesSampler: (samplingContext) => {
    // Adjust sampling rates based on transaction name or other context
    if (samplingContext.transactionContext.name?.includes('/api/auth')) {
      // Sample all auth-related transactions
      return 1.0;
    }
    if (samplingContext.transactionContext.name?.includes('/api/')) {
      // Sample 50% of other API calls
      return 0.5;
    }
    // Default sample rate for other transactions
    return 0.2;
  },
  
  beforeSend(event) {
    // Check if it is an exception
    if (event.exception) {
      // Log server-side exceptions
      console.error('[Sentry Server] Captured exception:', event);
    }
    return event;
  },

  // Integrations
  integrations: [
    new Sentry.Integrations.Http({ breadcrumbs: true, tracing: true }),
    new Sentry.Integrations.Prisma({ client: true }),
    new Sentry.Integrations.Express(),
    new Sentry.Integrations.OnUncaughtException(),
    new Sentry.Integrations.OnUnhandledRejection(),
  ],
});
