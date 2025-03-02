import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Performance Monitoring
  tracesSampleRate: 1.0, // Capture 100% of transactions in development
  
  // Session Replay
  replaysSessionSampleRate: 0.1, // Sample rate for all sessions
  replaysOnErrorSampleRate: 1.0, // Sample rate for sessions with errors

  // Enable source maps in development
  includeLocalVariables: true,
  
  // Environment
  environment: process.env.NODE_ENV,
  
  // Adjust this value in production
  debug: process.env.NODE_ENV === 'development',
  
  beforeSend(event) {
    // Check if it is an exception, and if so, show it on the console
    if (event.exception) {
      console.error('[Sentry] Captured exception:', event);
    }
    return event;
  },
});
