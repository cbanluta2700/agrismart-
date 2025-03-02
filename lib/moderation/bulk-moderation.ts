import { ResourceStatus, ResourceType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import { sendBatchModerationNotifications } from '@/lib/notifications/moderation-notifications';

/**
 * Interface for bulk moderation action parameters
 */
export interface BulkModerationParams {
  resourceIds: string[];
  action: 'approve' | 'reject' | 'archive' | 'feature' | 'unfeature';
  reason?: string;
  moderatorId: string;
  sendNotifications?: boolean;
}

/**
 * Interface for bulk moderation result
 */
export interface BulkModerationResult {
  success: boolean;
  processed: number;
  failed: number;
  failedIds?: string[];
  error?: string;
  batchId: string;
  notificationsSent?: {
    authors: number;
    admins: number;
  };
}

/**
 * Maps moderation actions to resource statuses
 */
const actionToStatusMap = {
  approve: ResourceStatus.PUBLISHED,
  reject: ResourceStatus.REJECTED,
  archive: ResourceStatus.ARCHIVED,
  feature: ResourceStatus.FEATURED,
  unfeature: ResourceStatus.PUBLISHED,
};

/**
 * Perform bulk moderation action on multiple resources
 */
export async function performBulkModeration(
  params: BulkModerationParams
): Promise<BulkModerationResult> {
  const { resourceIds, action, reason, moderatorId, sendNotifications = true } = params;
  
  if (!resourceIds.length) {
    return {
      success: false,
      processed: 0,
      failed: 0,
      error: 'No resource IDs provided',
      batchId: '',
    };
  }

  // Generate a batch ID for tracking
  const batchId = uuidv4();
  
  // Get the target status based on the action
  const targetStatus = actionToStatusMap[action];
  
  try {
    // Begin transaction to ensure all operations succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      const failedIds: string[] = [];
      let processed = 0;
      
      // Process each resource
      for (const resourceId of resourceIds) {
        try {
          // Get current resource status for the log
          const resource = await tx.resource.findUnique({
            where: { id: resourceId },
            select: { status: true },
          });
          
          if (!resource) {
            failedIds.push(resourceId);
            continue;
          }
          
          // Update the resource status
          await tx.resource.update({
            where: { id: resourceId },
            data: { 
              status: targetStatus,
              // For featured/unfeatured items
              featured: action === 'feature' ? true : (action === 'unfeature' ? false : undefined),
            },
          });
          
          // Create moderation log entry with batch ID
          await tx.resourceModerationLog.create({
            data: {
              resourceId,
              moderatorId,
              action,
              reason: reason || `Bulk ${action} action`,
              previousStatus: resource.status,
              batchId,
            },
          });
          
          processed++;
        } catch (error) {
          failedIds.push(resourceId);
          console.error(`Failed to process resource ${resourceId}:`, error);
        }
      }
      
      return {
        processed,
        failed: failedIds.length,
        failedIds: failedIds.length > 0 ? failedIds : undefined,
        batchId,
      };
    });
    
    // Send notifications after successful transaction if enabled
    let notificationsSent = undefined;
    
    if (sendNotifications && result.processed > 0) {
      notificationsSent = await sendBatchModerationNotifications(
        result.batchId,
        action,
        moderatorId,
        reason
      );
    }
    
    return {
      success: result.processed > 0,
      ...result,
      notificationsSent,
    };
  } catch (error) {
    console.error('Bulk moderation failed:', error);
    return {
      success: false,
      processed: 0,
      failed: resourceIds.length,
      error: error.message || 'Unknown error during bulk moderation',
      batchId,
    };
  }
}

/**
 * Get resources eligible for bulk moderation based on filters
 */
export async function getResourcesForBulkModeration(filters: {
  types?: ResourceType[];
  statuses?: ResourceStatus[];
  fromDate?: Date;
  toDate?: Date;
  searchTerm?: string;
  authorId?: string;
  limit?: number;
}) {
  const {
    types,
    statuses,
    fromDate,
    toDate,
    searchTerm,
    authorId,
    limit = 100,
  } = filters;

  // Build the where clause based on filters
  const where: any = {};
  
  if (types && types.length > 0) {
    where.type = { in: types };
  }
  
  if (statuses && statuses.length > 0) {
    where.status = { in: statuses };
  }
  
  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) where.createdAt.gte = fromDate;
    if (toDate) where.createdAt.lte = toDate;
  }
  
  if (searchTerm) {
    where.OR = [
      { title: { contains: searchTerm, mode: 'insensitive' } },
      { description: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }
  
  if (authorId) {
    where.authorId = authorId;
  }

  // Query the database
  return prisma.resource.findMany({
    where,
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
