import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { 
  initializeKnowledgeGraph, 
  getModerationInsights,
  getRelatedModerationItems
} from '@/lib/moderation/knowledge-graph';
import { 
  fetchModerationGraph, 
  searchModerationItems, 
  getModerationItem
} from '@/lib/moderation/memory-mesh-client';

/**
 * POST /api/admin/moderation/graph/initialize
 * Initialize the moderation knowledge graph with data from the database
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authorization
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Initialize the knowledge graph
    await initializeKnowledgeGraph();

    return NextResponse.json(
      { success: true, message: 'Knowledge graph initialized successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error initializing knowledge graph:', error);
    return NextResponse.json(
      { error: 'Failed to initialize knowledge graph', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/moderation/graph
 * Get the complete moderation knowledge graph
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authorization
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the knowledge graph
    const graph = await fetchModerationGraph();

    return NextResponse.json(graph, { status: 200 });
  } catch (error) {
    console.error('Error fetching knowledge graph:', error);
    return NextResponse.json(
      { error: 'Failed to fetch knowledge graph', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/moderation/graph/insights
 * Get insights from the moderation knowledge graph
 */
export async function GET_insights(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authorization
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get insights
    const insights = await getModerationInsights();

    return NextResponse.json(insights, { status: 200 });
  } catch (error) {
    console.error('Error getting moderation insights:', error);
    return NextResponse.json(
      { error: 'Failed to get moderation insights', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/moderation/graph/search?query=...
 * Search for nodes in the moderation knowledge graph
 */
export async function GET_search(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authorization
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the query parameter
    const url = new URL(request.url);
    const query = url.searchParams.get('query');

    if (!query) {
      return NextResponse.json(
        { error: 'Missing query parameter' },
        { status: 400 }
      );
    }

    // Search for nodes
    const nodes = await searchModerationItems(query);

    return NextResponse.json({ nodes }, { status: 200 });
  } catch (error) {
    console.error('Error searching knowledge graph:', error);
    return NextResponse.json(
      { error: 'Failed to search knowledge graph', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/moderation/graph/item/:id
 * Get a specific item from the moderation knowledge graph
 */
export async function GET_item(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    // Check authorization
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the item
    const item = await getModerationItem(params.id);

    // Get related items from database
    const relatedItems = await getRelatedModerationItems(params.id);

    return NextResponse.json({ 
      ...item, 
      relatedItems 
    }, { status: 200 });
  } catch (error) {
    console.error('Error getting moderation item:', error);
    return NextResponse.json(
      { error: 'Failed to get moderation item', details: (error as Error).message },
      { status: 500 }
    );
  }
}
