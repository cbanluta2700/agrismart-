import { PrismaClient } from '@prisma/client'

let prisma: PrismaClient

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient()
} else {
  // In development, use a global variable to prevent multiple instances
  const globalForPrisma = global as unknown as { prisma: PrismaClient }
  
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    })
  }
  prisma = globalForPrisma.prisma
}

export const db = prisma

// Export type definitions
export type * from '@prisma/client'
