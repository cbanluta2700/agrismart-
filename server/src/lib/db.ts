import { PrismaClient } from '@prisma/client';

// Initialize Prisma client with custom logging
export const db = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error'] 
    : ['error'],
});

// Export a global db client for easier imports
export default db;
