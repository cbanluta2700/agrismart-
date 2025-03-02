/**
 * Analytics Configuration
 * 
 * Central configuration for the analytics system
 */

export const analyticsConfig = {
  // Cache settings
  cache: {
    stdTTL: 300, // Time to live in seconds (5 minutes)
    checkperiod: 60, // Check for expired keys every 60 seconds
    useClones: false, // Don't clone objects (better performance)
    debugMode: process.env.NODE_ENV === 'development', // Enable debug mode in development
  },
  
  // Performance monitoring
  performance: {
    enabled: true,
    logSlowQueries: true, // Log queries that take longer than slowQueryThreshold
    slowQueryThreshold: 200, // Time in ms to consider a query as slow
    sampleRate: 0.1, // Sample 10% of queries for detailed performance tracking
  },
  
  // Data export settings
  export: {
    maxRecords: 10000, // Maximum number of records to export
    defaultFormat: 'csv', // Default export format (csv, json, excel)
    allowedFormats: ['csv', 'json', 'excel'],
    batchSize: 1000, // Number of records to process in each batch
  },
  
  // Time series settings
  timeSeries: {
    maxDataPoints: {
      day: 24,
      week: 7,
      month: 30,
      year: 12,
    },
    formats: {
      day: '%Y-%m-%d %H:00:00',
      week: '%Y-%m-%d',
      month: '%Y-%m-%d',
      year: '%Y-%m',
    },
    labels: {
      day: 'Hour',
      week: 'Day',
      month: 'Day',
      year: 'Month',
    }
  },
  
  // Event tracking settings
  tracking: {
    // List of events that should be tracked synchronously (blocking)
    synchronousEvents: [
      'POST_CREATE',
      'GROUP_CREATE',
      'REPORT_SUBMIT',
    ],
    // Events that can be tracked asynchronously (non-blocking)
    asynchronousEvents: [
      'PAGE_VIEW',
      'POST_VIEW',
      'POST_LIKE',
      'COMMENT_CREATE',
      'COMMENT_LIKE',
      'GROUP_JOIN',
      'SEARCH_PERFORM',
    ],
    // Sampling rates for high-volume events (to reduce database load)
    samplingRates: {
      'PAGE_VIEW': 0.5, // Track 50% of page views
      'POST_VIEW': 0.8, // Track 80% of post views
    }
  },
};

export default analyticsConfig;
