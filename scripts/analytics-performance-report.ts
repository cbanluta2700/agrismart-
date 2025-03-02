import { analyticsService } from '../server/src/lib/services/analyticsService';
import { analyticsPerformanceMonitor } from '../utils/monitoring/analyticsPerformanceMonitor';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script to generate an analytics performance report
 * Run with: npx ts-node scripts/analytics-performance-report.ts
 */

const NUM_ITERATIONS = 5;
const REPORT_PATH = path.join(process.cwd(), 'analytics-performance-report.html');

async function runPerformanceTests() {
  console.log('Running analytics performance tests...');
  analyticsPerformanceMonitor.reset();

  const periods = ['day', 'week', 'month', 'year'] as const;

  // Test engagement metrics
  for (let i = 0; i < NUM_ITERATIONS; i++) {
    for (const period of periods) {
      await analyticsPerformanceMonitor.measure(
        `getEngagementMetrics-${period}`,
        () => analyticsService.getEngagementMetrics(period)
      );
      
      // Second call should hit cache
      await analyticsPerformanceMonitor.measure(
        `getEngagementMetrics-${period}-cached`,
        () => analyticsService.getEngagementMetrics(period)
      );
    }
  }

  // Test activity time series
  for (let i = 0; i < NUM_ITERATIONS; i++) {
    for (const period of periods) {
      await analyticsPerformanceMonitor.measure(
        `getActivityTimeSeries-${period}`,
        () => analyticsService.getActivityTimeSeries(period)
      );
      
      // Second call should hit cache
      await analyticsPerformanceMonitor.measure(
        `getActivityTimeSeries-${period}-cached`,
        () => analyticsService.getActivityTimeSeries(period)
      );
    }
  }

  // Test top content
  for (let i = 0; i < NUM_ITERATIONS; i++) {
    for (const period of periods) {
      await analyticsPerformanceMonitor.measure(
        `getTopContent-${period}`,
        () => analyticsService.getTopContent(period)
      );
      
      // Second call should hit cache
      await analyticsPerformanceMonitor.measure(
        `getTopContent-${period}-cached`,
        () => analyticsService.getTopContent(period)
      );
    }
  }

  // Test export functions
  for (const period of periods) {
    await analyticsPerformanceMonitor.measure(
      `getEventsExport-${period}`,
      () => analyticsService.getEventsExport(period)
    );
    
    await analyticsPerformanceMonitor.measure(
      `getUserActivityExport-${period}`,
      () => analyticsService.getUserActivityExport(period)
    );
    
    await analyticsPerformanceMonitor.measure(
      `getContentPerformanceExport-${period}`,
      () => analyticsService.getContentPerformanceExport(period)
    );
  }

  return analyticsPerformanceMonitor.getMetrics();
}

function generateHtmlReport(metrics: any) {
  const { queries, summary } = metrics;
  
  // Sort queries by average time (slowest first)
  const sortedQueries = Object.entries(queries)
    .sort(([, a]: any, [, b]: any) => b.averageTime - a.averageTime);
  
  // Generate HTML
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Analytics Performance Report</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 {
      color: #2c3e50;
    }
    .summary {
      background-color: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
    }
    .summary-item {
      padding: 10px;
      border-radius: 4px;
      background-color: #fff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .summary-item h3 {
      margin-top: 0;
      font-size: 16px;
      color: #7f8c8d;
    }
    .summary-item p {
      margin-bottom: 0;
      font-size: 24px;
      font-weight: bold;
      color: #2980b9;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    th, td {
      padding: 12px 15px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #f2f2f2;
      font-weight: 600;
    }
    tr:hover {
      background-color: #f5f5f5;
    }
    .cache-hit-rate {
      display: inline-block;
      min-width: 60px;
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: bold;
      text-align: center;
    }
    .excellent {
      background-color: #d4edda;
      color: #155724;
    }
    .good {
      background-color: #fff3cd;
      color: #856404;
    }
    .poor {
      background-color: #f8d7da;
      color: #721c24;
    }
    .time-bar {
      height: 8px;
      background-color: #3498db;
      border-radius: 4px;
    }
    .timestamp {
      font-size: 14px;
      color: #7f8c8d;
      margin-top: 50px;
    }
  </style>
</head>
<body>
  <h1>Analytics Performance Report</h1>
  <p>Generated on ${new Date().toLocaleString()}</p>
  
  <h2>Summary</h2>
  <div class="summary">
    <div class="summary-grid">
      <div class="summary-item">
        <h3>Total Queries</h3>
        <p>${summary.totalQueries}</p>
      </div>
      <div class="summary-item">
        <h3>Avg. Query Time</h3>
        <p>${summary.averageQueryTime.toFixed(2)} ms</p>
      </div>
      <div class="summary-item">
        <h3>Cache Hit Rate</h3>
        <p>${summary.cacheHitRate.toFixed(1)}%</p>
      </div>
      <div class="summary-item">
        <h3>Total Time</h3>
        <p>${(summary.totalTime / 1000).toFixed(2)} s</p>
      </div>
    </div>
  </div>
  
  <h2>Query Performance</h2>
  <table>
    <thead>
      <tr>
        <th>Query</th>
        <th>Count</th>
        <th>Avg. Time (ms)</th>
        <th>Max Time (ms)</th>
        <th>Cache Hit Rate</th>
        <th>Performance</th>
      </tr>
    </thead>
    <tbody>
      ${sortedQueries.map(([name, stats]: [string, any]) => {
        const hitRate = stats.count > 0 ? (stats.hits / stats.count) * 100 : 0;
        let hitRateClass = 'poor';
        if (hitRate >= 80) hitRateClass = 'excellent';
        else if (hitRate >= 50) hitRateClass = 'good';
        
        // Calculate width as percentage of slowest query
        const maxAvgTime = sortedQueries[0][1].averageTime;
        const widthPercentage = Math.max(5, (stats.averageTime / maxAvgTime) * 100);
        
        return `
        <tr>
          <td>${name}</td>
          <td>${stats.count}</td>
          <td>${stats.averageTime.toFixed(2)}</td>
          <td>${stats.maxTime.toFixed(2)}</td>
          <td><span class="cache-hit-rate ${hitRateClass}">${hitRate.toFixed(1)}%</span></td>
          <td><div class="time-bar" style="width: ${widthPercentage}%"></div></td>
        </tr>
        `;
      }).join('')}
    </tbody>
  </table>
  
  <h2>Recommendations</h2>
  <ul>
    ${sortedQueries
      .filter(([, stats]: [string, any]) => stats.averageTime > 100)
      .map(([name]: [string, any]) => `<li>Optimize the <strong>${name}</strong> query for better performance</li>`)
      .join('')}
    ${summary.cacheHitRate < 50 ? '<li>Increase cache TTL to improve hit rate</li>' : ''}
    ${sortedQueries
      .filter(([, stats]: [string, any]) => stats.count > 0 && (stats.hits / stats.count) < 0.3)
      .map(([name]: [string, any]) => `<li>Improve cache usage for <strong>${name}</strong></li>`)
      .join('')}
  </ul>
  
  <p class="timestamp">Report generated: ${new Date().toISOString()}</p>
</body>
</html>
  `;
  
  return html;
}

async function main() {
  try {
    console.log('Starting analytics performance tests...');
    const metrics = await runPerformanceTests();
    
    console.log('Generating HTML report...');
    const html = generateHtmlReport(metrics);
    
    fs.writeFileSync(REPORT_PATH, html);
    console.log(`Performance report generated at: ${REPORT_PATH}`);
    
    // Print summary to console
    console.log('\nPerformance Summary:');
    console.log('-------------------');
    console.log(`Total Queries: ${metrics.summary.totalQueries}`);
    console.log(`Average Query Time: ${metrics.summary.averageQueryTime.toFixed(2)} ms`);
    console.log(`Cache Hit Rate: ${metrics.summary.cacheHitRate.toFixed(1)}%`);
    console.log(`Total Time: ${(metrics.summary.totalTime / 1000).toFixed(2)} s`);
    
  } catch (error) {
    console.error('Error running performance tests:', error);
  }
}

main().catch(console.error);
