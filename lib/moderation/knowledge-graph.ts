/**
 * Integration layer between our Prisma DB moderation system and the MemoryMesh knowledge graph
 */

import { prisma } from '@/lib/prisma';
import { 
  ModerationAction, 
  ModerationQueue, 
  ModerationHistory,
  ContentType,
  ModerationStatus,
  ModerationPriority,
  Prisma
} from '@prisma/client';
import { 
  addModerationItem, 
  addModerationHistory,
  fetchModerationGraph,
  getModerationItem,
  searchModerationItems,
  initializeModerationSystem
} from './memory-mesh-client';

/**
 * Synchronize a moderation queue item with the knowledge graph
 */
export async function syncModerationItemToGraph(
  item: ModerationQueue & { 
    history?: ModerationHistory[];
  }
): Promise<void> {
  try {
    // Add or update the moderation item in the knowledge graph
    await addModerationItem({
      id: item.id,
      contentId: item.contentId,
      contentType: item.contentType,
      status: item.status,
      priority: item.priority as ModerationPriority,
      reporterId: item.reporterId || undefined,
      reportReason: item.reportReason || undefined,
      contentSnapshot: JSON.stringify(item.contentSnapshot),
      autoFlagged: item.autoFlagged,
      aiConfidenceScore: item.aiConfidenceScore || undefined,
      createdAt: item.createdAt,
      assignedModeratorId: item.assignedModeratorId || undefined,
    });

    // If history is provided, sync each history entry
    if (item.history && item.history.length > 0) {
      for (const historyEntry of item.history) {
        await syncModerationHistoryToGraph(historyEntry);
      }
    }
  } catch (error) {
    console.error('Error syncing moderation item to graph:', error);
    throw error;
  }
}

/**
 * Synchronize a moderation history entry with the knowledge graph
 */
export async function syncModerationHistoryToGraph(
  history: ModerationHistory
): Promise<void> {
  try {
    await addModerationHistory({
      id: history.id,
      moderationItemId: history.moderationQueueId,
      action: history.action,
      fromStatus: history.fromStatus,
      toStatus: history.toStatus,
      moderatorId: history.moderatorId || undefined,
      moderatorName: history.moderatorName || undefined,
      notes: history.notes || undefined,
      contentEdits: history.contentEdits as Record<string, any> || undefined,
      createdAt: history.createdAt,
      aiAssisted: history.aiAssisted,
      timeTakenMs: history.timeTakenMs || undefined,
    });
  } catch (error) {
    console.error('Error syncing moderation history to graph:', error);
    throw error;
  }
}

/**
 * Initialize the knowledge graph with existing moderation data from the database
 */
export async function initializeKnowledgeGraph(): Promise<void> {
  try {
    // Initialize the schema-defined entities (content types, statuses, actions)
    await initializeModerationSystem();
    
    // Sync all existing moderation queue items
    const moderationItems = await prisma.moderationQueue.findMany({
      include: {
        history: true,
      },
    });
    
    console.log(`Syncing ${moderationItems.length} moderation items to knowledge graph...`);
    
    for (const item of moderationItems) {
      await syncModerationItemToGraph(item);
    }
    
    console.log('Knowledge graph initialization complete');
  } catch (error) {
    console.error('Error initializing knowledge graph:', error);
    throw error;
  }
}

/**
 * Get moderation insights from the knowledge graph
 */
export async function getModerationInsights(): Promise<{
  contentTypeDistribution: Record<string, number>;
  statusDistribution: Record<string, number>;
  actionDistribution: Record<string, number>;
  averageResolutionTimeMs: number;
  totalItems: number;
  topModerators: Array<{ id: string, name: string, count: number }>;
}> {
  try {
    // Fetch the complete graph
    const graph = await fetchModerationGraph();
    
    // Extract nodes by type
    const itemNodes = graph.nodes.filter(node => node.nodeType === 'moderation_item');
    const historyNodes = graph.nodes.filter(node => node.nodeType === 'moderation_history');
    
    // Calculate distributions
    const contentTypeDistribution: Record<string, number> = {};
    const statusDistribution: Record<string, number> = {};
    const actionDistribution: Record<string, number> = {};
    
    // Process moderation items
    for (const item of itemNodes) {
      // Extract content type from metadata or relationships
      const contentTypeEdge = graph.edges.find(
        edge => edge.from === item.name && edge.edgeType === 'has_type'
      );
      
      if (contentTypeEdge) {
        const contentType = contentTypeEdge.to;
        contentTypeDistribution[contentType] = (contentTypeDistribution[contentType] || 0) + 1;
      }
      
      // Extract status from metadata or relationships
      const statusEdge = graph.edges.find(
        edge => edge.from === item.name && edge.edgeType === 'has_status'
      );
      
      if (statusEdge) {
        const status = statusEdge.to;
        statusDistribution[status] = (statusDistribution[status] || 0) + 1;
      }
    }
    
    // Process history nodes for action distribution and moderator stats
    const moderatorCounts: Record<string, { id: string; name: string; count: number }> = {};
    let totalResolutionTimeMs = 0;
    let resolutionTimeCount = 0;
    
    for (const history of historyNodes) {
      // Extract action from metadata or relationships
      const actionEdge = graph.edges.find(
        edge => edge.from === history.name && edge.edgeType === 'took_action'
      );
      
      if (actionEdge) {
        const action = actionEdge.to;
        actionDistribution[action] = (actionDistribution[action] || 0) + 1;
      }
      
      // Extract moderator info and resolution time from metadata
      const moderatorIdMeta = history.metadata.find(m => m.startsWith('moderatorId:'));
      const moderatorNameMeta = history.metadata.find(m => m.startsWith('moderatorName:'));
      const timeTakenMsMeta = history.metadata.find(m => m.startsWith('timeTakenMs:'));
      
      if (moderatorIdMeta && moderatorNameMeta) {
        const moderatorId = moderatorIdMeta.split(':')[1].trim();
        const moderatorName = moderatorNameMeta.split(':')[1].trim();
        
        if (moderatorId) {
          if (!moderatorCounts[moderatorId]) {
            moderatorCounts[moderatorId] = { id: moderatorId, name: moderatorName || moderatorId, count: 0 };
          }
          moderatorCounts[moderatorId].count += 1;
        }
      }
      
      if (timeTakenMsMeta) {
        const timeTakenMs = parseInt(timeTakenMsMeta.split(':')[1].trim(), 10);
        if (!isNaN(timeTakenMs)) {
          totalResolutionTimeMs += timeTakenMs;
          resolutionTimeCount += 1;
        }
      }
    }
    
    // Calculate average resolution time
    const averageResolutionTimeMs = resolutionTimeCount > 0 
      ? totalResolutionTimeMs / resolutionTimeCount 
      : 0;
    
    // Get top moderators
    const topModerators = Object.values(moderatorCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    return {
      contentTypeDistribution,
      statusDistribution,
      actionDistribution,
      averageResolutionTimeMs,
      totalItems: itemNodes.length,
      topModerators,
    };
  } catch (error) {
    console.error('Error getting moderation insights:', error);
    throw error;
  }
}

/**
 * Get related items for a moderation item (similar content, same user, etc.)
 */
export async function getRelatedModerationItems(
  itemId: string
): Promise<ModerationQueue[]> {
  try {
    // Get the item and its relationships
    const { node, relatedNodes } = await getModerationItem(itemId);
    
    // Extract content and user information from metadata
    const contentIdMeta = node.metadata.find(m => m.startsWith('contentId:'));
    const reporterIdMeta = node.metadata.find(m => m.startsWith('reporterId:'));
    
    if (!contentIdMeta) {
      return [];
    }
    
    const contentId = contentIdMeta.split(':')[1].trim();
    const reporterId = reporterIdMeta ? reporterIdMeta.split(':')[1].trim() : null;
    
    // Search for similar items
    let similar: string[] = [];
    
    if (reporterId) {
      // Find items from the same reporter
      const reporterItems = await searchModerationItems(`reporterId:${reporterId}`);
      similar = [...similar, ...reporterItems.map(item => item.name)];
    }
    
    // Get content with same content ID or similar content
    const contentItems = await searchModerationItems(`contentId:${contentId}`);
    similar = [...similar, ...contentItems.map(item => item.name)];
    
    // Remove duplicates and the original item
    similar = [...new Set(similar)].filter(id => id !== itemId);
    
    // Get the actual items from the database
    if (similar.length > 0) {
      return await prisma.moderationQueue.findMany({
        where: {
          id: {
            in: similar,
          },
        },
        take: 5, // Limit to 5 related items
      });
    }
    
    return [];
  } catch (error) {
    console.error('Error getting related moderation items:', error);
    return [];
  }
}

/**
 * Hook to sync database changes to the knowledge graph
 */
export async function setupModerationGraphHooks(): Promise<void> {
  // This function would be called at application startup
  
  // Set up database hooks to keep the knowledge graph in sync
  // This is a simplified example - in a real application, you might use
  // middleware, event listeners, or transaction hooks
  
  // Example: intercept Prisma middleware for ModerationQueue
  const originalCreate = prisma.moderationQueue.create;
  prisma.moderationQueue.create = async (args) => {
    // Call the original method
    const result = await originalCreate.call(prisma.moderationQueue, args);
    
    // Sync to knowledge graph
    await syncModerationItemToGraph(result);
    
    return result;
  };
  
  // Similar hooks could be added for update, delete operations
  // And for ModerationHistory, etc.
  
  console.log('Moderation graph hooks initialized');
}
