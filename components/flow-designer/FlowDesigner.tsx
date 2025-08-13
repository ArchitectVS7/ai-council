"use client"

import { useState, useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Connection,
  NodeTypes,
} from '@xyflow/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { FlowDesign, FlowNode, FlowEdge, PersonaTemplate } from '../../types/flow-designer';
import { validateFlow } from '../../lib/flow-designer/validation';
import PersonaNode from './PersonaNode';
import DecisionNode from './DecisionNode';
import SynthesisNode from './SynthesisNode';
import PersonaLibrary from './PersonaLibrary';
import FlowCanvas from './FlowCanvas';

const nodeTypes: NodeTypes = {
  persona: PersonaNode,
  decision: DecisionNode,
  synthesis: SynthesisNode,
};

interface FlowDesignerProps {
  initialFlow?: FlowDesign;
  onSave?: (flow: FlowDesign) => void;
  onValidate?: (isValid: boolean, errors: string[]) => void;
  personas?: PersonaTemplate[];
  className?: string;
}

export default function FlowDesigner({
  initialFlow,
  onSave,
  onValidate,
  personas = [],
  className = '',
}: FlowDesignerProps) {
  const [flowName, setFlowName] = useState(initialFlow?.name || '');
  const [flowDescription, setFlowDescription] = useState(initialFlow?.description || '');
  const [flowCategory, setFlowCategory] = useState<'creative' | 'business' | 'research'>(
    initialFlow?.category || 'creative'
  );
  const [selectedCategory, setSelectedCategory] = useState<'creative' | 'business' | 'research' | undefined>();

  // Convert FlowDesign to ReactFlow format
  const initialNodes: Node[] = useMemo(() => 
    initialFlow?.nodes.map(node => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: node.data,
    })) || [], [initialFlow]
  );

  const initialEdges: Edge[] = useMemo(() => 
    initialFlow?.edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
    })) || [], [initialFlow]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handlePersonaDrop = useCallback((persona: PersonaTemplate, position: { x: number; y: number }) => {
    const newNode: Node = {
      id: `persona-${Date.now()}`,
      type: 'persona',
      position,
      data: {
        label: persona.name,
        personaId: persona.id,
        role: persona.role,
        expertise: persona.expertise,
      },
    };

    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  const addDecisionNode = useCallback((position: { x: number; y: number }) => {
    const newNode: Node = {
      id: `decision-${Date.now()}`,
      type: 'decision',
      position,
      data: {
        label: 'Decision Point',
        role: 'Decision Maker',
      },
    };

    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  const addSynthesisNode = useCallback((position: { x: number; y: number }) => {
    const newNode: Node = {
      id: `synthesis-${Date.now()}`,
      type: 'synthesis',
      position,
      data: {
        label: 'Synthesis',
        role: 'Synthesizer',
      },
    };

    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  const handleSave = useCallback(() => {
    if (!flowName.trim()) {
      alert('Please enter a flow name');
      return;
    }

    // Convert ReactFlow format back to FlowDesign format
    const flowNodes: FlowNode[] = nodes.map(node => ({
      id: node.id,
      type: node.type as 'persona' | 'decision' | 'synthesis',
      position: node.position,
      data: node.data,
    }));

    const flowEdges: FlowEdge[] = edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type as 'default' | 'stepwise',
    }));

    const flow: FlowDesign = {
      id: initialFlow?.id || `flow-${Date.now()}`,
      name: flowName,
      description: flowDescription,
      nodes: flowNodes,
      edges: flowEdges,
      category: flowCategory,
      createdAt: initialFlow?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    // Validate flow
    const validation = validateFlow(flow);
    if (onValidate) {
      onValidate(validation.isValid, validation.errors);
    }

    if (!validation.isValid) {
      alert(`Flow validation failed:\n${validation.errors.join('\n')}`);
      return;
    }

    if (onSave) {
      onSave(flow);
    }
  }, [flowName, flowDescription, flowCategory, nodes, edges, initialFlow, onSave, onValidate]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={`flex h-full ${className}`}>
        <PersonaLibrary 
          personas={personas} 
          category={selectedCategory}
        />
        
        <div className="flex-1 flex flex-col">
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="flex items-center space-x-4 mb-4">
              <input
                type="text"
                placeholder="Flow Name"
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={flowCategory}
                onChange={(e) => setFlowCategory(e.target.value as 'creative' | 'business' | 'research')}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="creative">Creative</option>
                <option value="business">Business</option>
                <option value="research">Research</option>
              </select>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Save Flow
              </button>
            </div>
            
            <textarea
              placeholder="Flow Description (optional)"
              value={flowDescription}
              onChange={(e) => setFlowDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>

          <div className="flex-1 relative">
            <FlowCanvas onPersonaDrop={handlePersonaDrop}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
              >
                <Controls />
                <Background />
              </ReactFlow>
            </FlowCanvas>

            <div className="absolute top-4 right-4 flex space-x-2">
              <button
                onClick={() => addDecisionNode({ x: 100, y: 100 })}
                className="px-3 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors text-sm"
              >
                Add Decision
              </button>
              <button
                onClick={() => addSynthesisNode({ x: 200, y: 200 })}
                className="px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm"
              >
                Add Synthesis
              </button>
            </div>
          </div>
        </div>
      </div>
    </DndProvider>
  );
}
