# AgriSmart Scripts

This directory contains utility scripts for testing and maintaining the AgriSmart platform.

## Analytics Testing

### Overview
The analytics testing system provides a way to verify that events are being properly tracked through the analytics service. 

### Running the Tests
To run the analytics tests:

```bash
npx tsx scripts/test-analytics.ts
```

### Test Coverage
The analytics tests currently cover the following events:
- Page View tracking
- Post Creation tracking
- Group Join tracking

### How It Works
The test script temporarily replaces the `trackEvent` method in the analytics service with a mock implementation that records events without actually sending them to the database. This allows the tests to run quickly and without modifying any production data.

### Extending the Tests
To add new tests:
1. Add a new test case in the `test-analytics.ts` file
2. Clear the tracked events array before your test
3. Call the analytics service with your test event
4. Verify the event was recorded properly

## Other Scripts
More utility scripts will be added here as they are developed.
