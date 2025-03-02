/**
 * Client for interacting with the MemoryMesh MCP server for moderation data
 */

// This client provides type-safe access to the MemoryMesh MCP server
// It leverages the schema definitions we've created to ensure data consistency

import { ContentType, ModerationStatus, ModerationAction, ModerationPriority } from '@prisma/client';

// Interface for a node in the knowledge graph
interface Node {
  name: string;
  nodeType: string;
  metadata: string[];
}

// Interface for an edge in the knowledge graph
interface Edge {
  from: string;
  to: string;
  edgeType: string;
}

// Interface for the complete graph
interface Graph {
  nodes: Node[];
  edges: Edge[];
}

// Interface for content type nodes
interface ContentTypeNode extends Node {
  nodeType: 'content_type';
  // Additional content type specific properties would be extracted from metadata
}

// Interface for moderation status nodes
interface ModerationStatusNode extends Node {
  nodeType: 'moderation_status';
  // Additional status specific properties would be extracted from metadata
}

// Interface for moderation action nodes
interface ModerationActionNode extends Node {
  nodeType: 'moderation_action';
  // Additional action specific properties would be extracted from metadata
}

// Interface for moderation item nodes
interface ModerationItemNode extends Node {
  nodeType: 'moderation_item';
  // Additional item specific properties would be extracted from metadata
}

// Interface for moderation history nodes
interface ModerationHistoryNode extends Node {
  nodeType: 'moderation_history';
  // Additional history specific properties would be extracted from metadata
}

/**
 * Helper function to fetch the complete knowledge graph from MemoryMesh
 */
export async function fetchModerationGraph(): Promise<Graph> {
  try {
    // The 'moderation' is the MCP server name we configured in mcp_config.json
    const response = await fetch('http://localhost:3000/mcp/moderation/read_graph', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch moderation graph: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching moderation graph:', error);
    throw error;
  }
}

/**
 * Add a content type to the knowledge graph
 */
export async function addContentType(contentType: {
  name: string;
  displayName: string;
  description: string;
  contentFields: string[];
  priority: ModerationPriority;
  autoModeration: 'ALWAYS' | 'WHEN_FLAGGED' | 'NEVER';
}): Promise<void> {
  try {
    const response = await fetch('http://localhost:3000/mcp/moderation/add_content_type', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: contentType.name,
        displayName: contentType.displayName,
        description: contentType.description,
        contentFields: JSON.stringify(contentType.contentFields),
        priority: contentType.priority,
        autoModeration: contentType.autoModeration,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to add content type: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error adding content type:', error);
    throw error;
  }
}

/**
 * Add a moderation status to the knowledge graph
 */
export async function addModerationStatus(status: {
  name: string;
  displayName: string;
  description: string;
  color: string;
  isTerminal: boolean;
  visibilityImpact: 'VISIBLE' | 'HIDDEN' | 'RESTRICTED';
  notifyUser: boolean;
}): Promise<void> {
  try {
    const response = await fetch('http://localhost:3000/mcp/moderation/add_moderation_status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: status.name,
        displayName: status.displayName,
        description: status.description,
        color: status.color,
        isTerminal: status.isTerminal.toString(),
        visibilityImpact: status.visibilityImpact,
        notifyUser: status.notifyUser.toString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to add moderation status: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error adding moderation status:', error);
    throw error;
  }
}

/**
 * Add a moderation action to the knowledge graph
 */
export async function addModerationAction(action: {
  name: string;
  displayName: string;
  description: string;
  icon: string;
  resultingStatus: string;
  userImpact: 'NONE' | 'WARNING' | 'TEMPORARY_RESTRICTION' | 'PERMANENT_RESTRICTION' | 'SUSPENSION' | 'BAN';
  requiresNote: boolean;
  allowContentEdit: boolean;
}): Promise<void> {
  try {
    const response = await fetch('http://localhost:3000/mcp/moderation/add_moderation_action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: action.name,
        displayName: action.displayName,
        description: action.description,
        icon: action.icon,
        resultingStatus: action.resultingStatus,
        userImpact: action.userImpact,
        requiresNote: action.requiresNote.toString(),
        allowContentEdit: action.allowContentEdit.toString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to add moderation action: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error adding moderation action:', error);
    throw error;
  }
}

/**
 * Add a moderation item to the knowledge graph
 */
export async function addModerationItem(item: {
  id: string;
  contentId: string;
  contentType: string;
  status: string;
  priority: ModerationPriority;
  reporterId?: string;
  reportReason?: string;
  contentSnapshot: string;
  autoFlagged: boolean;
  aiConfidenceScore?: number;
  createdAt: Date;
  assignedModeratorId?: string;
}): Promise<void> {
  try {
    const response = await fetch('http://localhost:3000/mcp/moderation/add_moderation_item', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: item.id,
        contentId: item.contentId,
        contentType: item.contentType,
        status: item.status,
        priority: item.priority,
        reporterId: item.reporterId || '',
        reportReason: item.reportReason || '',
        contentSnapshot: item.contentSnapshot,
        autoFlagged: item.autoFlagged.toString(),
        aiConfidenceScore: item.aiConfidenceScore?.toString() || '',
        createdAt: item.createdAt.toISOString(),
        assignedModeratorId: item.assignedModeratorId || '',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to add moderation item: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error adding moderation item:', error);
    throw error;
  }
}

/**
 * Add a moderation history entry to the knowledge graph
 */
export async function addModerationHistory(history: {
  id: string;
  moderationItemId: string;
  action: string;
  fromStatus: string;
  toStatus: string;
  moderatorId?: string;
  moderatorName?: string;
  notes?: string;
  contentEdits?: Record<string, any>;
  createdAt: Date;
  aiAssisted: boolean;
  timeTakenMs?: number;
}): Promise<void> {
  try {
    const response = await fetch('http://localhost:3000/mcp/moderation/add_moderation_history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: history.id,
        moderationItemId: history.moderationItemId,
        action: history.action,
        fromStatus: history.fromStatus,
        toStatus: history.toStatus,
        moderatorId: history.moderatorId || '',
        moderatorName: history.moderatorName || '',
        notes: history.notes || '',
        contentEdits: history.contentEdits ? JSON.stringify(history.contentEdits) : '',
        createdAt: history.createdAt.toISOString(),
        aiAssisted: history.aiAssisted.toString(),
        timeTakenMs: history.timeTakenMs?.toString() || '',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to add moderation history: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error adding moderation history:', error);
    throw error;
  }
}

/**
 * Search for moderation items in the knowledge graph
 */
export async function searchModerationItems(query: string): Promise<Node[]> {
  try {
    const response = await fetch('http://localhost:3000/mcp/moderation/search_nodes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to search moderation items: ${response.statusText}`);
    }

    const result = await response.json();
    return result.nodes || [];
  } catch (error) {
    console.error('Error searching moderation items:', error);
    throw error;
  }
}

/**
 * Get a specific moderation item and its relationships
 */
export async function getModerationItem(id: string): Promise<{
  node: Node;
  relatedNodes: Node[];
  edges: Edge[];
}> {
  try {
    const response = await fetch('http://localhost:3000/mcp/moderation/open_nodes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        names: [id],
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get moderation item: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Find the requested node
    const node = result.nodes.find((n: Node) => n.name === id);
    
    if (!node) {
      throw new Error(`Node with ID ${id} not found`);
    }
    
    // Get edges connected to this node
    const connectedEdges = result.edges.filter(
      (e: Edge) => e.from === id || e.to === id
    );
    
    // Get related nodes
    const relatedNodeNames = connectedEdges.map((e: Edge) => 
      e.from === id ? e.to : e.from
    );
    
    const relatedNodes = result.nodes.filter((n: Node) => 
      relatedNodeNames.includes(n.name)
    );
    
    return {
      node,
      relatedNodes,
      edges: connectedEdges,
    };
  } catch (error) {
    console.error('Error getting moderation item:', error);
    throw error;
  }
}

/**
 * Delete a moderation item and its history
 */
export async function deleteModerationItem(id: string): Promise<void> {
  try {
    // First get the item to find related history entries
    const { relatedNodes } = await getModerationItem(id);
    
    // Find history nodes related to this item
    const historyNodes = relatedNodes.filter(
      (n: Node) => n.nodeType === 'moderation_history'
    );
    
    // Delete history nodes
    if (historyNodes.length > 0) {
      const historyNames = historyNodes.map((n: Node) => n.name);
      await fetch('http://localhost:3000/mcp/moderation/delete_entities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entityNames: historyNames,
        }),
      });
    }
    
    // Delete the moderation item
    await fetch('http://localhost:3000/mcp/moderation/delete_entities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        entityNames: [id],
      }),
    });
  } catch (error) {
    console.error('Error deleting moderation item:', error);
    throw error;
  }
}

/**
 * Initialize the moderation system with default values
 */
export async function initializeModerationSystem(): Promise<void> {
  try {
    // Add content types
    await addContentType({
      name: 'POST',
      displayName: 'Post',
      description: 'User-created posts in feeds or on group pages',
      contentFields: ['text', 'images', 'links'],
      priority: 'NORMAL',
      autoModeration: 'WHEN_FLAGGED',
    });
    
    await addContentType({
      name: 'COMMENT',
      displayName: 'Comment',
      description: 'User responses to posts, resources, or other content',
      contentFields: ['text', 'images'],
      priority: 'NORMAL',
      autoModeration: 'WHEN_FLAGGED',
    });
    
    await addContentType({
      name: 'PRODUCT',
      displayName: 'Product',
      description: 'Items listed for sale in the marketplace',
      contentFields: ['title', 'description', 'price', 'images'],
      priority: 'HIGH',
      autoModeration: 'ALWAYS',
    });
    
    // Add moderation statuses
    await addModerationStatus({
      name: 'PENDING',
      displayName: 'Pending',
      description: 'Content waiting for moderation review',
      color: '#FFA500', // Orange
      isTerminal: false,
      visibilityImpact: 'HIDDEN',
      notifyUser: false,
    });
    
    await addModerationStatus({
      name: 'IN_REVIEW',
      displayName: 'In Review',
      description: 'Content currently being reviewed by a moderator',
      color: '#3498DB', // Blue
      isTerminal: false,
      visibilityImpact: 'HIDDEN',
      notifyUser: false,
    });
    
    await addModerationStatus({
      name: 'APPROVED',
      displayName: 'Approved',
      description: 'Content that has been reviewed and approved',
      color: '#2ECC71', // Green
      isTerminal: true,
      visibilityImpact: 'VISIBLE',
      notifyUser: true,
    });
    
    await addModerationStatus({
      name: 'REJECTED',
      displayName: 'Rejected',
      description: 'Content that has been reviewed and rejected',
      color: '#E74C3C', // Red
      isTerminal: true,
      visibilityImpact: 'HIDDEN',
      notifyUser: true,
    });
    
    // Add moderation actions
    await addModerationAction({
      name: 'APPROVE',
      displayName: 'Approve',
      description: 'Approve the content without changes',
      icon: 'check_circle',
      resultingStatus: 'APPROVED',
      userImpact: 'NONE',
      requiresNote: false,
      allowContentEdit: false,
    });
    
    await addModerationAction({
      name: 'REJECT',
      displayName: 'Reject',
      description: 'Reject the content as it violates community guidelines',
      icon: 'cancel',
      resultingStatus: 'REJECTED',
      userImpact: 'NONE',
      requiresNote: true,
      allowContentEdit: false,
    });
    
    await addModerationAction({
      name: 'EDIT_AND_APPROVE',
      displayName: 'Edit & Approve',
      description: 'Make edits to the content and then approve it',
      icon: 'edit',
      resultingStatus: 'APPROVED',
      userImpact: 'WARNING',
      requiresNote: true,
      allowContentEdit: true,
    });
    
    await addModerationAction({
      name: 'WARN_USER',
      displayName: 'Warn User',
      description: 'Approve but issue a warning to the content creator',
      icon: 'warning',
      resultingStatus: 'APPROVED',
      userImpact: 'WARNING',
      requiresNote: true,
      allowContentEdit: false,
    });
    
    console.log('Moderation system initialized successfully');
  } catch (error) {
    console.error('Error initializing moderation system:', error);
    throw error;
  }
}
