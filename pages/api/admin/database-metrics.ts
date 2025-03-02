import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { PrismaClient } from '@prisma/client';

const dbMonitor = require('../../../lib/monitoring/database-performance');

// Validate admin API key
const validateAdminApiKey = (req: NextApiRequest): boolean => {
  const apiKey = req.headers['x-api-key'];
  return apiKey === process.env.ADMIN_API_KEY;
};

// Check if user is admin
const isUserAdmin = async (userId: string): Promise<boolean> => {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return user?.role === 'ADMIN';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
};

// Format metrics data for frontend consumption
const formatMetricsForUI = (rawMetrics: any) => {
  // Initialize an array to store time series data
  const timeSeriesData = Array(10).fill(null).map((_, index) => {
    const timestamp = new Date();
    timestamp.setMinutes(timestamp.getMinutes() - (9 - index) * 5);
    return {
      timestamp: timestamp.toLocaleTimeString(),
      mongodbAvgTime: Math.random() * 20 + 10, // Placeholder for demo
      postgresqlAvgTime: Math.random() * 10 + 5, // Placeholder for demo
      mongodbOpCount: Math.floor(Math.random() * 100) + 50, // Placeholder for demo
      postgresqlOpCount: Math.floor(Math.random() * 80) + 20, // Placeholder for demo
    };
  });

  // Process MongoDB metrics
  const mongoOperations = [];
  let mongoTotalOperations = 0;
  let mongoTotalTime = 0;
  let mongoSlowOperations = 0;

  // Process PostgreSQL metrics  
  const postgresOperations = [];
  let postgresTotalOperations = 0;
  let postgresTotalTime = 0;
  let postgresSlowOperations = 0;

  // Process MongoDB operations
  if (rawMetrics.mongodb && rawMetrics.mongodb.operations) {
    for (const [key, stats] of Object.entries(rawMetrics.mongodb.operations)) {
      const [operation, collection] = key.split(':');
      const operationData = stats as any;
      
      mongoTotalOperations += operationData.count || 0;
      mongoTotalTime += operationData.totalTime || 0;
      
      mongoOperations.push({
        operation,
        collection,
        count: operationData.count || 0,
        totalTime: operationData.totalTime || 0,
        avgTime: operationData.avgTime || 0,
        slowCount: 0 // Will be updated if we have slow queries data
      });
    }
  }

  // Process slow MongoDB queries
  if (rawMetrics.mongodb && rawMetrics.mongodb.slowQueries) {
    // Group slow queries by collection and operation
    const slowQueryMap = new Map();
    
    for (const query of rawMetrics.mongodb.slowQueries) {
      const key = `${query.operation}:${query.collection}`;
      if (!slowQueryMap.has(key)) {
        slowQueryMap.set(key, 0);
      }
      slowQueryMap.set(key, slowQueryMap.get(key) + 1);
    }
    
    // Update operation slow counts
    for (const operation of mongoOperations) {
      const key = `${operation.operation}:${operation.collection}`;
      operation.slowCount = slowQueryMap.get(key) || 0;
      mongoSlowOperations += operation.slowCount;
    }
  }

  // Process PostgreSQL operations
  if (rawMetrics.postgres && rawMetrics.postgres.operations) {
    for (const [key, stats] of Object.entries(rawMetrics.postgres.operations)) {
      const [operation, table] = key.split(':');
      const operationData = stats as any;
      
      postgresTotalOperations += operationData.count || 0;
      postgresTotalTime += operationData.totalTime || 0;
      
      postgresOperations.push({
        operation,
        collection: table, // Use consistent property name with MongoDB
        count: operationData.count || 0,
        totalTime: operationData.totalTime || 0,
        avgTime: operationData.avgTime || 0,
        slowCount: 0 // Will be updated if we have slow queries data
      });
    }
  }

  // Process slow PostgreSQL queries
  if (rawMetrics.postgres && rawMetrics.postgres.slowQueries) {
    // Group slow queries by table and operation
    const slowQueryMap = new Map();
    
    for (const query of rawMetrics.postgres.slowQueries) {
      const key = `${query.operation}:${query.collection}`;
      if (!slowQueryMap.has(key)) {
        slowQueryMap.set(key, 0);
      }
      slowQueryMap.set(key, slowQueryMap.get(key) + 1);
    }
    
    // Update operation slow counts
    for (const operation of postgresOperations) {
      const key = `${operation.operation}:${operation.collection}`;
      operation.slowCount = slowQueryMap.get(key) || 0;
      postgresSlowOperations += operation.slowCount;
    }
  }

  // Calculate averages
  const mongodbAverageResponseTime = mongoTotalOperations > 0 
    ? mongoTotalTime / mongoTotalOperations 
    : 0;
    
  const postgresqlAverageResponseTime = postgresTotalOperations > 0
    ? postgresTotalTime / postgresTotalOperations
    : 0;

  return {
    mongodb: {
      operations: mongoOperations,
      totalOperations: mongoTotalOperations,
      averageResponseTime: mongodbAverageResponseTime,
      slowOperations: mongoSlowOperations
    },
    postgresql: {
      operations: postgresOperations,
      totalOperations: postgresTotalOperations,
      averageResponseTime: postgresqlAverageResponseTime,
      slowOperations: postgresSlowOperations
    },
    timeSeriesData
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET and POST methods
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authenticate request - must be admin user or have admin API key
  let isAuthenticated = validateAdminApiKey(req);

  if (!isAuthenticated) {
    const session = await getSession({ req });
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    isAuthenticated = await isUserAdmin(session.user.id);
    if (!isAuthenticated) {
      return res.status(403).json({ error: 'Forbidden - Admin access required' });
    }
  }

  // Handle different methods
  if (req.method === 'GET') {
    try {
      // Get metrics for specific database or all databases
      const database = req.query.database as string | undefined;
      const rawMetrics = database ? dbMonitor.getMetrics(database) : dbMonitor.getMetrics();
      
      // Include slow queries?
      const includeSlowQueries = req.query.includeSlowQueries === 'true';
      if (!includeSlowQueries && database) {
        // Remove slowQueries array to reduce payload size if not requested
        delete rawMetrics.slowQueries;
      }
      
      // Format metrics for UI consumption
      const formattedMetrics = formatMetricsForUI(rawMetrics);
      
      return res.status(200).json(formattedMetrics);
    } catch (error: any) {
      return res.status(500).json({
        error: 'Failed to retrieve database metrics',
        message: error.message
      });
    }
  } else if (req.method === 'POST') {
    try {
      // Handle different POST actions
      const { action, database, config } = req.body;
      
      if (action === 'reset') {
        // Reset metrics for specific database or all
        dbMonitor.resetMetrics(database);
        return res.status(200).json({
          success: true,
          message: database 
            ? `Metrics for ${database} have been reset`
            : 'All database metrics have been reset'
        });
      } else if (action === 'config' && config) {
        // Update monitoring configuration
        dbMonitor.updateConfig(config);
        return res.status(200).json({
          success: true,
          message: 'Monitoring configuration updated',
          config
        });
      } else {
        return res.status(400).json({
          error: 'Invalid action',
          message: 'Supported actions: reset, config'
        });
      }
    } catch (error: any) {
      return res.status(500).json({
        error: 'Failed to process request',
        message: error.message
      });
    }
  }
}
