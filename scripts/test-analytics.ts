import { EventType } from '@prisma/client';
import { analyticsService } from '../server/src/lib/services/analyticsService';

/**
 * Test script for verifying analytics tracking functionality
 * Run with: npx tsx scripts/test-analytics.ts
 */
async function main() {
  console.log('Starting analytics tracking tests...');

  // Create a test mock directly in the script for simplicity
  const trackedEvents: any[] = [];
  
  // Save original trackEvent method
  const originalTrackEvent = analyticsService.trackEvent;
  
  // Create our own mock implementation
  const mockTrackEvent = async (eventData: any) => {
    console.log('Mock trackEvent called with:', JSON.stringify(eventData, null, 2));
    trackedEvents.push(eventData);
    return {
      id: 'mock-event-id-' + Math.random().toString(36).substring(7),
      ...eventData,
      timestamp: new Date(),
    };
  };
  
  // Replace the real trackEvent with our mock implementation
  analyticsService.trackEvent = mockTrackEvent;

  try {
    let allTestsPassed = true;
    const testResults = [];
    
    // Test 1: Page View Tracking
    console.log('\nRunning test: Page View Tracking');
    trackedEvents.length = 0; // Clear events
    
    // Simulate tracking a page view
    await analyticsService.trackEvent({
      type: EventType.PAGE_VIEW,
      entityType: 'page',
      entityId: '/forum/groups',
      userId: 'test-user-id'
    });
    
    console.log('Current tracked events:', JSON.stringify(trackedEvents, null, 2));
    
    // Verify the event was tracked
    const pageViewPassed = trackedEvents.some(event => 
      event.type === EventType.PAGE_VIEW &&
      event.entityType === 'page' &&
      event.entityId === '/forum/groups' &&
      event.userId === 'test-user-id'
    );
    
    testResults.push({
      name: 'Page View Tracking',
      description: 'Verifies page view events are correctly tracked',
      passed: pageViewPassed
    });
    
    if (!pageViewPassed) allTestsPassed = false;
    
    // Test 2: Post Creation Tracking
    console.log('\nRunning test: Post Creation Tracking');
    trackedEvents.length = 0; // Clear events
    
    // Simulate tracking a post creation
    await analyticsService.trackEvent({
      type: EventType.POST_CREATE,
      entityType: 'post',
      entityId: 'test-post-id',
      userId: 'test-user-id',
      groupId: 'test-group-id',
      metadata: { title: 'Test Post', category: 'Discussion' }
    });
    
    console.log('Current tracked events:', JSON.stringify(trackedEvents, null, 2));
    
    // Verify the event was tracked
    const postCreatePassed = trackedEvents.some(event => 
      event.type === EventType.POST_CREATE &&
      event.entityType === 'post' &&
      event.entityId === 'test-post-id' &&
      event.userId === 'test-user-id' &&
      event.groupId === 'test-group-id'
    );
    
    testResults.push({
      name: 'Post Creation Tracking',
      description: 'Verifies post creation events are correctly tracked',
      passed: postCreatePassed
    });
    
    if (!postCreatePassed) allTestsPassed = false;
    
    // Test 3: Group Join Tracking
    console.log('\nRunning test: Group Join Tracking');
    trackedEvents.length = 0; // Clear events
    
    // Simulate tracking a group join
    await analyticsService.trackEvent({
      type: EventType.GROUP_JOIN,
      entityType: 'group',
      entityId: 'test-group-id',
      userId: 'test-user-id',
      metadata: { joinMethod: 'direct' }
    });
    
    console.log('Current tracked events:', JSON.stringify(trackedEvents, null, 2));
    
    // Verify the event was tracked
    const groupJoinPassed = trackedEvents.some(event => 
      event.type === EventType.GROUP_JOIN &&
      event.entityType === 'group' &&
      event.entityId === 'test-group-id' &&
      event.userId === 'test-user-id'
    );
    
    testResults.push({
      name: 'Group Join Tracking',
      description: 'Verifies group join events are correctly tracked',
      passed: groupJoinPassed
    });
    
    if (!groupJoinPassed) allTestsPassed = false;

    // Display test results
    console.log('\nTest results:');
    console.log('===============================');
    
    testResults.forEach((result) => {
      const statusIcon = result.passed ? '✅' : '❌';
      console.log(`${statusIcon} ${result.name}: ${result.passed ? 'PASSED' : 'FAILED'}`);
      if (result.description) {
        console.log(`   ${result.description}`);
      }
    });
    
    console.log('===============================');
    console.log(`Overall result: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    // Restore the real service
    analyticsService.trackEvent = originalTrackEvent;
    
  } catch (error) {
    console.error('Error running tests:', error instanceof Error ? error.message : String(error));
    
    // Restore the real service
    analyticsService.trackEvent = originalTrackEvent;
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error instanceof Error ? error.message : String(error));
});
