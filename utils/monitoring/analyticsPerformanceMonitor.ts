/**
 * Analytics Performance Monitoring Utility
 * 
 * Tracks execution time and cache performance for analytics queries
 */

class AnalyticsPerformanceMonitor {
  private queryTimings: Record<string, {
    count: number;
    totalTime: number;
    hits: number;
    misses: number;
    averageTime: number;
    maxTime: number;
  }> = {};

  /**
   * Record the execution time for a query
   * @param queryName Name of the query
   * @param executionTime Time in milliseconds
   * @param cacheHit Whether the result was served from cache
   */
  recordQueryExecution(queryName: string, executionTime: number, cacheHit: boolean = false) {
    if (!this.queryTimings[queryName]) {
      this.queryTimings[queryName] = {
        count: 0,
        totalTime: 0,
        hits: 0,
        misses: 0,
        averageTime: 0,
        maxTime: 0
      };
    }

    const stats = this.queryTimings[queryName];
    stats.count += 1;
    stats.totalTime += executionTime;
    
    if (cacheHit) {
      stats.hits += 1;
    } else {
      stats.misses += 1;
    }

    stats.averageTime = stats.totalTime / stats.count;
    stats.maxTime = Math.max(stats.maxTime, executionTime);
  }

  /**
   * Get performance metrics for all queries
   */
  getMetrics() {
    return {
      queries: this.queryTimings,
      summary: this.getSummary()
    };
  }

  /**
   * Get a summary of performance metrics
   */
  getSummary() {
    const totalQueries = Object.values(this.queryTimings).reduce((sum, stat) => sum + stat.count, 0);
    const totalTime = Object.values(this.queryTimings).reduce((sum, stat) => sum + stat.totalTime, 0);
    const totalHits = Object.values(this.queryTimings).reduce((sum, stat) => sum + stat.hits, 0);
    const totalMisses = Object.values(this.queryTimings).reduce((sum, stat) => sum + stat.misses, 0);
    
    const cacheHitRate = totalQueries > 0 ? (totalHits / totalQueries) * 100 : 0;
    const averageQueryTime = totalQueries > 0 ? totalTime / totalQueries : 0;

    return {
      totalQueries,
      totalTime,
      totalHits,
      totalMisses,
      cacheHitRate,
      averageQueryTime
    };
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.queryTimings = {};
  }

  /**
   * Create a timer function that automatically records execution time
   */
  createTimer(queryName: string) {
    const startTime = performance.now();
    
    return (cacheHit: boolean = false) => {
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      this.recordQueryExecution(queryName, executionTime, cacheHit);
      return executionTime;
    };
  }

  /**
   * Measure the execution time of an async function
   */
  async measure<T>(
    queryName: string, 
    fn: () => Promise<T>, 
    options: { 
      cacheKey?: string 
    } = {}
  ): Promise<T> {
    const timer = this.createTimer(queryName);
    let result: T;
    let cacheHit = false;
    
    try {
      result = await fn();
      if (options.cacheKey) {
        cacheHit = true;
      }
    } catch (error) {
      timer(false);
      throw error;
    }
    
    timer(cacheHit);
    return result;
  }
}

// Export singleton instance
export const analyticsPerformanceMonitor = new AnalyticsPerformanceMonitor();
export default analyticsPerformanceMonitor;
