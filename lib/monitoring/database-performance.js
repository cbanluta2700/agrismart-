// Database performance monitoring utility
const { performance } = require('perf_hooks');

// Simple in-memory metrics storage
const metrics = {
  mongodb: {
    operations: {},
    lastUpdated: new Date(),
    slowQueries: []
  },
  postgres: {
    operations: {},
    lastUpdated: new Date(),
    slowQueries: []
  }
};

// Configuration
const config = {
  // Threshold in ms to consider a query "slow"
  slowQueryThreshold: 500, 
  // Maximum number of slow queries to keep in memory
  maxSlowQueries: 100,
  // Whether to enable detailed logging
  verbose: process.env.NODE_ENV !== 'production',
};

/**
 * Tracks the performance of a database operation
 * 
 * @param {string} database - The database type ('mongodb' or 'postgres')
 * @param {string} operation - The operation being performed (e.g., 'find', 'insert', 'update')
 * @param {string} collection - The collection or table being accessed
 * @param {function} callback - The function to execute and measure
 * @returns {Promise<any>} - The result of the callback function
 */
async function trackOperation(database, operation, collection, callback) {
  if (!['mongodb', 'postgres'].includes(database)) {
    throw new Error(`Unsupported database type: ${database}`);
  }
  
  const startTime = performance.now();
  
  try {
    // Execute the operation
    const result = await callback();
    
    // Calculate execution time
    const executionTime = performance.now() - startTime;
    
    // Update metrics
    const operationKey = `${operation}:${collection}`;
    
    if (!metrics[database].operations[operationKey]) {
      metrics[database].operations[operationKey] = {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        minTime: Infinity,
        maxTime: 0
      };
    }
    
    const stats = metrics[database].operations[operationKey];
    stats.count++;
    stats.totalTime += executionTime;
    stats.avgTime = stats.totalTime / stats.count;
    stats.minTime = Math.min(stats.minTime, executionTime);
    stats.maxTime = Math.max(stats.maxTime, executionTime);
    
    // Update last updated timestamp
    metrics[database].lastUpdated = new Date();
    
    // Track slow queries
    if (executionTime > config.slowQueryThreshold) {
      const slowQuery = {
        database,
        operation,
        collection,
        executionTime,
        timestamp: new Date(),
      };
      
      metrics[database].slowQueries.unshift(slowQuery);
      // Keep only the most recent slow queries
      if (metrics[database].slowQueries.length > config.maxSlowQueries) {
        metrics[database].slowQueries.pop();
      }
      
      if (config.verbose) {
        console.warn(`[DB MONITOR] Slow ${database} ${operation} on ${collection}: ${executionTime.toFixed(2)}ms`);
      }
    }
    
    return result;
  } catch (error) {
    // Record error in metrics
    const executionTime = performance.now() - startTime;
    const operationKey = `${operation}:${collection}:error`;
    
    if (!metrics[database].operations[operationKey]) {
      metrics[database].operations[operationKey] = {
        count: 0,
        totalTime: 0,
        errors: []
      };
    }
    
    metrics[database].operations[operationKey].count++;
    metrics[database].operations[operationKey].totalTime += executionTime;
    
    if (config.verbose) {
      console.error(`[DB MONITOR] Error in ${database} ${operation} on ${collection}: ${error.message}`);
    }
    
    // Re-throw the error for handling by the caller
    throw error;
  }
}

/**
 * Gets the current performance metrics for database operations
 * 
 * @param {string} database - Optional database type to filter results
 * @returns {Object} - The metrics data
 */
function getMetrics(database = null) {
  if (database) {
    if (!metrics[database]) {
      throw new Error(`Unknown database: ${database}`);
    }
    return { ...metrics[database] };
  }
  
  return { ...metrics };
}

/**
 * Resets all metrics data
 * 
 * @param {string} database - Optional database type to reset
 */
function resetMetrics(database = null) {
  if (database) {
    if (!metrics[database]) {
      throw new Error(`Unknown database: ${database}`);
    }
    
    metrics[database] = {
      operations: {},
      lastUpdated: new Date(),
      slowQueries: []
    };
    
    return;
  }
  
  // Reset all databases
  Object.keys(metrics).forEach(db => {
    metrics[db] = {
      operations: {},
      lastUpdated: new Date(),
      slowQueries: []
    };
  });
}

/**
 * Wrapper for MongoDB operations
 * 
 * @param {string} operation - The operation being performed
 * @param {string} collection - The collection being accessed
 * @param {function} callback - The function to execute and measure
 * @returns {Promise<any>} - The result of the callback function
 */
async function trackMongoOperation(operation, collection, callback) {
  return trackOperation('mongodb', operation, collection, callback);
}

/**
 * Wrapper for PostgreSQL operations
 * 
 * @param {string} operation - The operation being performed
 * @param {string} table - The table being accessed
 * @param {function} callback - The function to execute and measure
 * @returns {Promise<any>} - The result of the callback function
 */
async function trackPrismaOperation(operation, table, callback) {
  return trackOperation('postgres', operation, table, callback);
}

/**
 * Gets the slow queries for a specific database
 * 
 * @param {string} database - The database type
 * @returns {Array} - The slow queries
 */
function getSlowQueries(database) {
  if (!metrics[database]) {
    throw new Error(`Unknown database: ${database}`);
  }
  
  return [...metrics[database].slowQueries];
}

/**
 * Updates the configuration for the monitoring system
 * 
 * @param {Object} newConfig - The new configuration values
 */
function updateConfig(newConfig) {
  Object.assign(config, newConfig);
}

module.exports = {
  trackMongoOperation,
  trackPrismaOperation,
  getMetrics,
  resetMetrics,
  getSlowQueries,
  updateConfig
};
