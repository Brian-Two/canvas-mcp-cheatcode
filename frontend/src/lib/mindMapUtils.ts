import dagre from 'dagre';
import { Node, Edge } from 'reactflow';
import { ConceptNode } from '@/components/KnowledgeGraphFlow';

export interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
  data?: any;
}

/**
 * Convert flat concept array to tree structure
 */
export function conceptsToTree(concepts: ConceptNode[]): TreeNode {
  if (concepts.length === 0) {
    return { id: 'root', label: 'Root', children: [] };
  }

  // Find root nodes (those with no incoming connections or depth 0)
  const rootNodes = concepts.filter(c => c.depth === 0 || c.connections.length === 0);
  
  // If no explicit roots, use the first concept
  if (rootNodes.length === 0) {
    rootNodes.push(concepts[0]);
  }

  // Build tree from first root
  const root = rootNodes[0];
  
  return {
    id: root.id,
    label: root.label,
    children: buildChildren(root, concepts),
    data: root,
  };
}

function buildChildren(parent: ConceptNode, allConcepts: ConceptNode[]): TreeNode[] {
  const children: TreeNode[] = [];
  const visited = new Set<string>();

  parent.connections.forEach(connId => {
    if (visited.has(connId)) return;
    
    const child = allConcepts.find(c => c.id === connId);
    if (child && child.id !== parent.id) {
      visited.add(connId);
      children.push({
        id: child.id,
        label: child.label,
        children: [], // Simplified: don't recurse to avoid cycles
        data: child,
      });
    }
  });

  return children;
}

/**
 * Convert tree structure to ReactFlow graph using Dagre layout
 */
export function treeToGraph(tree: TreeNode): [Node[], Edge[]] | null {
  if (!tree) return null;

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ 
    rankdir: 'LR', // Left to right
    nodesep: 100,
    ranksep: 150,
  });

  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const visited = new Set<string>();

  // Traverse tree and add nodes/edges
  function traverse(node: TreeNode, parentId?: string) {
    if (visited.has(node.id)) return;
    visited.add(node.id);

    // Add node to dagre graph
    dagreGraph.setNode(node.id, { 
      width: 150, 
      height: 60,
    });

    // Create ReactFlow node
    nodes.push({
      id: node.id,
      type: 'concept',
      position: { x: 0, y: 0 }, // Will be set by dagre
      data: { 
        label: node.label,
        ...node.data,
      },
    });

    // Add edge if there's a parent
    if (parentId) {
      const edgeId = `e${parentId}-${node.id}`;
      dagreGraph.setEdge(parentId, node.id);
      
      edges.push({
        id: edgeId,
        source: parentId,
        target: node.id,
        type: 'smoothstep',
      });
    }

    // Recurse to children
    if (node.children) {
      node.children.forEach(child => traverse(child, node.id));
    }
  }

  traverse(tree);

  // Calculate layout
  dagre.layout(dagreGraph);

  // Apply layout positions to nodes
  nodes.forEach(node => {
    const dagreNode = dagreGraph.node(node.id);
    if (dagreNode) {
      node.position = {
        x: dagreNode.x - 75, // Center the node (width/2)
        y: dagreNode.y - 30, // Center the node (height/2)
      };
    }
  });

  return [nodes, edges];
}


