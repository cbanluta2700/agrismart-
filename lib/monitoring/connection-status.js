// Database connection health monitoring utility
const { MongoClient } = require('mongodb');
const { PrismaClient } = require('@prisma/client');
const { performance } = require('perf_hooks');
const { isMongoDBConnected, getMongoDBConnectionStats } = require('../chat/mongodb');

// In-memory connection status storage
const connectionStatus = {
  mongodb: {
    status: 'unknown',
    lastChecked: null,
    responseTime: null,
    error: null,
    poolStats: {
      connected: false,
      poolSize: 0,
      availableConnections: 0,
      maxPoolSize: 10,
      minPoolSize: 5
    }
  },
  postgresql: {
    status: 'unknown',
    lastChecked: null,
    responseTime: null,
    error: null
  }
};

// Configuration
const config = {
  // How often to check connections (in milliseconds)
  checkInterval: 60000,
  // Connection timeout (in milliseconds)
  connectionTimeout: 5000,
  // Whether to enable automatic periodic checks
  enableAutomaticChecks: false
};

// Reference to interval timer
let checkIntervalTimer = null;

/**
 * Check MongoDB connection status
 */
async function checkMongoDbStatus() {
  const startTime = performance.now();
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const client = new MongoClient(uri, { 
    serverSelectionTimeoutMS: config.connectionTimeout 
  });
  
  try {
    await client.connect();
    const database = client.db(process.env.MONGODB_DB_NAME || 'agrismart_chat');
    
    // Simple command to check connection
    await database.command({ ping: 1 });
    
    const responseTime = performance.now() - startTime;
    
    // Get connection pool stats if available
    const isConnected = await isMongoDBConnected();
    const poolStats = await getMongoDBConnectionStats();
    
    connectionStatus.mongodb = {
      status: 'connected',
      lastChecked: new Date(),
      responseTime,
      error: null,
      poolStats: {
        connected: isConnected,
        poolSize: poolStats?.totalConnectionCount || 0,
        availableConnections: poolStats?.availableConnectionCount || 0,
        maxPoolSize: poolStats?.maxPoolSize || 10,
        minPoolSize: poolStats?.minPoolSize || 5
      }
    };
    
  } catch (error) {
    const responseTime = performance.now() - startTime;
    
    connectionStatus.mongodb = {
      status: 'error',
      lastChecked: new Date(),
      responseTime,
      error: error.message,
      poolStats: connectionStatus.mongodb.poolStats || {
        connected: false,
        poolSize: 0,
        availableConnections: 0,
        maxPoolSize: 10,
        minPoolSize: 5
      }
    };
    
    console.error('[Connection Monitor] MongoDB connection check failed:', error.message);
  } finally {
    await client.close();
  }
}

/**
 * Check PostgreSQL connection status
 */
async function checkPostgresStatus() {
  const startTime = performance.now();
  const prisma = new PrismaClient();
  
  try {
    // Simple query to test connection
    await prisma.$queryRaw`SELECT 1 as result`;
    
    const responseTime = performance.now() - startTime;
    
    connectionStatus.postgresql = {
      status: 'connected',
      lastChecked: new Date(),
      responseTime,
      error: null
    };
    
  } catch (error) {
    const responseTime = performance.now() - startTime;
    
    connectionStatus.postgresql = {
      status: 'error',
      lastChecked: new Date(),
      responseTime,
      error: error.message
    };
    
    console.error('[Connection Monitor] PostgreSQL connection check failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Check the status of all database connections
 */
async function checkAllConnections() {
  try {
    await Promise.all([
      checkMongoDbStatus(),
      checkPostgresStatus()
    ]);
    
    return getConnectionStatus();
  } catch (error) {
    console.error('[Connection Monitor] Error checking connections:', error);
    throw error;
  }
}

/**
 * Start automatic periodic connection checks
 */
function startAutomaticChecks() {
  if (checkIntervalTimer) {
    clearInterval(checkIntervalTimer);
  }
  
  config.enableAutomaticChecks = true;
  
  // Perform initial check
  checkAllConnections().catch(console.error);
  
  // Set up interval for periodic checks
  checkIntervalTimer = setInterval(() => {
    checkAllConnections().catch(console.error);
  }, config.checkInterval);
  
  console.log(`[Connection Monitor] Automatic checks started (every ${config.checkInterval / 1000}s)`);
}

/**
 * Stop automatic periodic connection checks
 */
function stopAutomaticChecks() {
  if (checkIntervalTimer) {
    clearInterval(checkIntervalTimer);
    checkIntervalTimer = null;
  }
  
  config.enableAutomaticChecks = false;
  console.log('[Connection Monitor] Automatic checks stopped');
}

/**
 * Get the current status of database connections
 */
function getConnectionStatus() {
  return { 
    mongodb: connectionStatus.mongodb,
    postgresql: connectionStatus.postgresql,
    monitoringEnabled: config.enableAutomaticChecks,
    checkInterval: config.checkInterval,
    timestamp: new Date(),
  };
}

/**
 * Update the configuration
 */
function updateConfig(newConfig) {
  // Update configuration
  Object.assign(config, newConfig);
  
  // If automatic checks are enabled and the interval changed, restart the timer
  if (config.enableAutomaticChecks && checkIntervalTimer) {
    stopAutomaticChecks();
    startAutomaticChecks();
  }
  
  return { ...config };
}

module.exports = {
  checkMongoDbStatus,
  checkPostgresStatus,
  checkAllConnections,
  startAutomaticChecks,
  stopAutomaticChecks,
  getConnectionStatus,
  updateConfig
};
