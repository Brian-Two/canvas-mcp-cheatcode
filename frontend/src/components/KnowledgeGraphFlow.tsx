import React, { useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
  MarkerType,
  Panel,
  MiniMap,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Check, Lock, Sparkles, Circle, Brain } from 'lucide-react';
import { treeToGraph, conceptsToTree, TreeNode } from '@/lib/mindMapUtils';

export interface ConceptNode {
  id: string;
  label: string;
  status: 'mastered' | 'in-progress' | 'mentioned' | 'locked';
  x: number;
  y: number;
  depth: number;
  connections: string[]; // IDs of connected nodes
}

interface KnowledgeGraphFlowProps {
  concepts: ConceptNode[];
  currentConcept?: string;
  onConceptClick?: (conceptId: string) => void;
  className?: string;
}

const getStatusColor = (status: ConceptNode['status']) => {
  switch (status) {
    case 'mastered':
      return {
        bg: '#3fad93',
        border: '#3fad93',
        text: '#ffffff',
      };
    case 'in-progress':
      return {
        bg: '#FCD34D',
        border: '#F59E0B',
        text: '#78350F',
      };
    case 'mentioned':
      return {
        bg: '#6B7280',
        border: '#4B5563',
        text: '#ffffff',
      };
    case 'locked':
      return {
        bg: '#374151',
        border: '#1F2937',
        text: '#9CA3AF',
      };
    default:
      return {
        bg: '#6B7280',
        border: '#4B5563',
        text: '#ffffff',
      };
  }
};

const getStatusIcon = (status: ConceptNode['status']) => {
  switch (status) {
    case 'mastered':
      return Check;
    case 'in-progress':
      return Sparkles;
    case 'locked':
      return Lock;
    case 'mentioned':
    default:
      return Circle;
  }
};

// Custom node component
const ConceptNodeComponent = ({ data }: any) => {
  const Icon = getStatusIcon(data.status);
  const colors = getStatusColor(data.status);
  
  return (
    <div
      className="px-4 py-3 rounded-xl shadow-lg border-2 transition-all duration-200 hover:scale-105 cursor-pointer"
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
        color: colors.text,
        minWidth: '120px',
        textAlign: 'center',
      }}
      onClick={() => data.onClick?.(data.id)}
    >
      <div className="flex items-center justify-center gap-2 mb-1">
        <Icon className="w-4 h-4" />
      </div>
      <div className="font-semibold text-sm">{data.label}</div>
    </div>
  );
};

const nodeTypes = {
  concept: ConceptNodeComponent,
};

const KnowledgeGraphFlow: React.FC<KnowledgeGraphFlowProps> = ({
  concepts,
  currentConcept,
  onConceptClick,
  className = '',
}) => {
  // Convert concepts to tree structure, then to graph using bisonbytes25 algorithm
  const { initialNodes, initialEdges } = useMemo(() => {
    if (concepts.length === 0) {
      return { initialNodes: [], initialEdges: [] };
    }

    // Convert concepts to tree format
    const treeData = conceptsToTree(concepts);
    
    // Convert tree to graph using horizontal layout
    const graphResult = treeToGraph(treeData);
    
    if (!graphResult) {
      return { initialNodes: [], initialEdges: [] };
    }

    const [graphNodes, graphEdges] = graphResult;

    // Enhance nodes with concept data
    const enhancedNodes: Node[] = graphNodes.map((node, idx) => {
      // Map back to concept by index (simple mapping for now)
      const concept = concepts[idx] || concepts[0];
      
      return {
        id: node.id,
        type: 'concept',
        position: node.position,
        data: {
          label: node.data.label,
          status: concept.status,
          id: node.id,
          onClick: onConceptClick,
        },
        style: {
          background: 'transparent',
          border: 'none',
        },
      };
    });

    // Enhance edges with styling
    const enhancedEdges: Edge[] = graphEdges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
      animated: false,
      style: {
        stroke: '#4B5563',
        strokeWidth: 2,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#4B5563',
      },
    }));

    return { initialNodes: enhancedNodes, initialEdges: enhancedEdges };
  }, [concepts, onConceptClick]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Update nodes and edges when concepts change
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [concepts, initialNodes, initialEdges, setNodes, setEdges]);

  // Update edge animation based on current concept
  useEffect(() => {
    if (currentConcept) {
      setEdges((eds) =>
        eds.map((edge) => {
          const isActive = edge.source === currentConcept || edge.target === currentConcept;
          return {
            ...edge,
            animated: isActive,
            style: {
              ...edge.style,
              stroke: isActive ? '#3fad93' : '#4B5563',
              strokeWidth: isActive ? 3 : 2,
            },
            markerEnd: {
              ...edge.markerEnd,
              color: isActive ? '#3fad93' : '#4B5563',
            },
          };
        })
      );
    }
  }, [currentConcept, setEdges]);

  if (concepts.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-full bg-background/50 rounded-lg border border-border ${className}`}>
        <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow mb-4">
          <Brain className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Your Knowledge Map</h3>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          As you learn, concepts will appear here and connect together, showing how your understanding grows!
        </p>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full bg-background/50 rounded-lg border border-border overflow-hidden ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        className="bg-background"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} color="#374151" />
        <Controls className="bg-card border border-border rounded-lg" />
        <MiniMap
          nodeColor={(node: any) => {
            const colors = getStatusColor(node.data.status);
            return colors.bg;
          }}
          className="bg-card border border-border rounded-lg"
        />
        
        {/* Header Panel */}
        <Panel position="top-left" className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 m-2 min-w-[250px]">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-sm">Knowledge Map</h3>
            <span className="ml-auto text-xs text-muted-foreground">
              {concepts.filter(c => c.status === 'mastered').length} mastered
            </span>
          </div>
        </Panel>

        {/* Legend Panel */}
        <Panel position="bottom-right" className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-2 m-2">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <Check className="w-3 h-3 text-primary" />
              <span className="text-muted-foreground">Mastered</span>
            </div>
            <div className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-yellow-500" />
              <span className="text-muted-foreground">Learning</span>
            </div>
            <div className="flex items-center gap-1">
              <Circle className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">Mentioned</span>
            </div>
            <div className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">Locked</span>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default KnowledgeGraphFlow;

