import { EventType } from '@prisma/client';

/**
 * Utility functions for testing analytics tracking functionality
 */

/**
 * Mocks the analytics service for testing
 * @returns Mock analytics service with tracking and validation methods
 */
export const createAnalyticsMock = () => {
  const trackedEvents: Array<{
    type: EventType;
    entityType: string;
    entityId?: string;
    userId?: string;
    groupId?: string;
    metadata?: any;
  }> = [];

  return {
    /**
     * Tracks an event in the mock service
     */
    trackEvent: function(eventData: {
      type: EventType;
      entityType: string;
      entityId?: string;
      userId?: string;
      groupId?: string;
      metadata?: any;
    }) {
      console.log('Mock trackEvent called with:', JSON.stringify(eventData, null, 2));
      trackedEvents.push(eventData);
      return Promise.resolve({
        id: 'mock-event-id-' + Math.random().toString(36).substring(7),
        ...eventData,
        timestamp: new Date(),
      });
    },

    /**
     * Gets all tracked events
     */
    getTrackedEvents: function() {
      console.log('Current tracked events:', JSON.stringify(trackedEvents, null, 2));
      return [...trackedEvents];
    },

    /**
     * Clears all tracked events
     */
    clearEvents: function() {
      console.log('Clearing tracked events');
      trackedEvents.length = 0;
    },

    /**
     * Verifies events were tracked as expected
     * @param expectedEvents List of expected events
     * @returns Object with verification results
     */
    verifyEvents: function(expectedEvents: Array<{
      type: EventType;
      entityType: string;
      entityId?: string;
      userId?: string;
      groupId?: string;
      metadata?: any;
    }>) {
      console.log('Verifying events. Expected:', JSON.stringify(expectedEvents, null, 2));
      console.log('Actual:', JSON.stringify(trackedEvents, null, 2));
      
      const results = expectedEvents.map(expected => {
        const found = trackedEvents.some(actual => {
          return (
            actual.type === expected.type &&
            actual.entityType === expected.entityType &&
            (expected.entityId === undefined || actual.entityId === expected.entityId) &&
            (expected.userId === undefined || actual.userId === expected.userId) &&
            (expected.groupId === undefined || actual.groupId === expected.groupId)
          );
        });
        return { expected, found };
      });

      const allFound = results.every(r => r.found);
      const notFound = results.filter(r => !r.found).map(r => r.expected);
      
      console.log('Verification result:', allFound ? 'ALL FOUND' : 'SOME NOT FOUND');
      if (!allFound) {
        console.log('Not found events:', JSON.stringify(notFound, null, 2));
      }

      return {
        results,
        allFound,
        notFound,
      };
    }
  };
};

/**
 * Run a series of analytics tests to verify tracking functionality
 * @param tests Array of test functions to run
 * @returns Test results
 */
export const runAnalyticsTests = async (
  tests: Array<{ 
    name: string; 
    test: (mock: ReturnType<typeof createAnalyticsMock>) => Promise<boolean>;
    description?: string;
  }>
) => {
  const results = [];
  const mock = createAnalyticsMock();

  for (const testCase of tests) {
    console.log(`\nRunning test: ${testCase.name}`);
    let passed = false;
    let error = null;

    try {
      passed = await testCase.test(mock);
      console.log(`Test ${testCase.name} result: ${passed ? 'PASSED' : 'FAILED'}`);
    } catch (err) {
      error = err;
      passed = false;
      console.error(`Test ${testCase.name} error:`, err);
    }

    const result = {
      name: testCase.name,
      description: testCase.description,
      passed,
      error
    };

    results.push(result);
  }

  const allTestsPassed = results.every(r => r.passed);
  return { results, allTestsPassed };
};
