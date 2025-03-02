'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button, Card, Typography, Box, Tab, Tabs, CircularProgress, Alert } from '@mui/material';
import { Analytics } from '@vercel/analytics/react';
import ForceGraph2D from 'react-force-graph-2d';
import AdminLayout from '@/components/admin/AdminLayout';

interface Node {
  id: string;
  name: string;
  nodeType: string;
  metadata: string[];
  color?: string;
  size?: number;
}

interface Edge {
  id: string;
  source: string;
  target: string;
  edgeType: string;
}

interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

// Color map for different node types
const nodeColorMap: Record<string, string> = {
  content_type: '#4CAF50',      // Green
  moderation_status: '#2196F3', // Blue
  moderation_action: '#FFC107', // Amber
  moderation_item: '#9C27B0',   // Purple
  moderation_history: '#FF5722' // Deep Orange
};

// Size map for different node types
const nodeSizeMap: Record<string, number> = {
  content_type: 10,
  moderation_status: 10,
  moderation_action: 10,
  moderation_item: 7,
  moderation_history: 5
};

export default function ModerationGraphPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [initializeSuccess, setInitializeSuccess] = useState(false);

  // Check if user is authorized
  useEffect(() => {
    if (status === 'authenticated') {
      if (session?.user?.role !== 'ADMIN') {
        router.push('/');
      }
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [session, status, router]);

  // Fetch the graph data
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'ADMIN') {
      fetchGraphData();
    }
  }, [status, session]);

  const fetchGraphData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/moderation/graph');
      if (!response.ok) {
        throw new Error(`Failed to fetch graph data: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Transform data for the force graph library
      const nodes = data.nodes.map((node: any) => ({
        id: node.name,
        name: node.name,
        nodeType: node.nodeType,
        metadata: node.metadata,
        color: nodeColorMap[node.nodeType] || '#999999',
        size: nodeSizeMap[node.nodeType] || 5
      }));
      
      const edges = data.edges.map((edge: any, index: number) => ({
        id: `edge-${index}`,
        source: edge.from,
        target: edge.to,
        edgeType: edge.edgeType
      }));
      
      setGraphData({ nodes, edges });
    } catch (error) {
      setError(`Error fetching graph data: ${(error as Error).message}`);
      console.error('Error fetching graph data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeGraph = async () => {
    try {
      setInitializing(true);
      setError(null);
      
      const response = await fetch('/api/admin/moderation/graph/initialize', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to initialize graph: ${response.statusText}`);
      }
      
      setInitializeSuccess(true);
      
      // Refetch the graph data after initialization
      fetchGraphData();
    } catch (error) {
      setError(`Error initializing graph: ${(error as Error).message}`);
      console.error('Error initializing graph:', error);
    } finally {
      setInitializing(false);
    }
  };

  const handleNodeClick = (node: Node) => {
    setSelectedNode(node);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // If loading or not authenticated
  if (status === 'loading' || !session) {
    return (
      <AdminLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 2 }}>
          Moderation Knowledge Graph
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
          <Button 
            variant="contained" 
            color="primary"
            onClick={fetchGraphData}
            disabled={loading}
          >
            Refresh Graph
          </Button>
          
          <Button 
            variant="outlined" 
            color="secondary"
            onClick={handleInitializeGraph}
            disabled={initializing}
          >
            {initializing ? 'Initializing...' : 'Initialize Graph'}
          </Button>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
        )}
        
        {initializeSuccess && (
          <Alert severity="success" sx={{ mb: 4 }}>
            Knowledge graph initialized successfully!
          </Alert>
        )}
        
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 4 }}>
          <Tab label="Graph Visualization" />
          <Tab label="Node Details" />
          <Tab label="Legend" />
        </Tabs>
        
        {activeTab === 0 && (
          <Card sx={{ height: '70vh', p: 2 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            ) : graphData.nodes.length > 0 ? (
              <ForceGraph2D
                graphData={graphData}
                nodeLabel="name"
                nodeColor="color"
                nodeVal="size"
                linkLabel="edgeType"
                onNodeClick={handleNodeClick}
                linkDirectionalArrowLength={3.5}
                linkDirectionalArrowRelPos={1}
                linkCurvature={0.25}
                linkWidth={1}
                cooldownTicks={100}
                linkDirectionalParticles={2}
                linkDirectionalParticleSpeed={0.01}
                d3AlphaDecay={0.02}
                width={800}
                height={600}
              />
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Typography variant="body1">No graph data available. Try initializing the graph.</Typography>
              </Box>
            )}
          </Card>
        )}
        
        {activeTab === 1 && (
          <Card sx={{ p: 3 }}>
            {selectedNode ? (
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>Node Details</Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1">ID: {selectedNode.id}</Typography>
                  <Typography variant="subtitle1">Type: {selectedNode.nodeType}</Typography>
                </Box>
                
                <Typography variant="h6" sx={{ mb: 1 }}>Metadata</Typography>
                <Box sx={{ mb: 3, pl: 2 }}>
                  {selectedNode.metadata.map((meta, index) => (
                    <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                      {meta}
                    </Typography>
                  ))}
                </Box>
                
                <Typography variant="h6" sx={{ mb: 1 }}>Related Edges</Typography>
                <Box sx={{ pl: 2 }}>
                  {graphData.edges
                    .filter(edge => edge.source === selectedNode.id || edge.target === selectedNode.id)
                    .map((edge, index) => (
                      <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                        {edge.source === selectedNode.id ? 
                          `${selectedNode.id} --[${edge.edgeType}]--> ${edge.target}` : 
                          `${edge.source} --[${edge.edgeType}]--> ${selectedNode.id}`
                        }
                      </Typography>
                    ))
                  }
                </Box>
              </Box>
            ) : (
              <Typography variant="body1">Select a node from the graph to view details.</Typography>
            )}
          </Card>
        )}
        
        {activeTab === 2 && (
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Node Types</Typography>
            <Box sx={{ mb: 4 }}>
              {Object.entries(nodeColorMap).map(([type, color]) => (
                <Box key={type} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Box 
                    sx={{ 
                      width: 20, 
                      height: 20, 
                      borderRadius: '50%', 
                      bgcolor: color,
                      mr: 2
                    }} 
                  />
                  <Typography variant="body1">
                    {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Typography>
                </Box>
              ))}
            </Box>
            
            <Typography variant="h6" sx={{ mb: 2 }}>Edge Types</Typography>
            <Box>
              {Array.from(new Set(graphData.edges.map(edge => edge.edgeType))).map(edgeType => (
                <Typography key={edgeType} variant="body1" sx={{ mb: 0.5 }}>
                  {edgeType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Typography>
              ))}
            </Box>
          </Card>
        )}
      </Box>
      <Analytics />
    </AdminLayout>
  );
}
