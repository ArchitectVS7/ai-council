# Phase 1 Implementation Checklist
## Critical Infrastructure Development

**Phase:** 1 of 5  
**Timeline:** Week 1-2  
**Priority:** HIGH - Blocking User Experience  
**Status:** Ready to Start

---

## 1.1 Visual Flow Designer Implementation

### Setup & Foundation (Day 1-2)

#### Environment Setup
- [ ] **Install React Flow Library**
  ```bash
  npm install @xyflow/react @xyflow/core
  npm install @types/react-flow-renderer --save-dev
  ```

- [ ] **Create Directory Structure**
  ```bash
  mkdir -p components/flow-designer
  mkdir -p lib/flow-designer
  mkdir -p types/flow-designer
  ```

- [ ] **Setup TypeScript Types**
  ```typescript
  // types/flow-designer/index.ts
  export interface FlowNode {
    id: string;
    type: 'persona' | 'decision' | 'synthesis';
    position: { x: number; y: number };
    data: {
      label: string;
      personaId?: string;
      role?: string;
      expertise?: string;
    };
  }

  export interface FlowEdge {
    id: string;
    source: string;
    target: string;
    type: 'default' | 'stepwise';
  }

  export interface FlowDesign {
    id: string;
    name: string;
    description: string;
    nodes: FlowNode[];
    edges: FlowEdge[];
    category: 'creative' | 'business' | 'research';
    createdAt: Date;
    updatedAt: Date;
  }
  ```

#### Core Components Development (Day 3-5)

- [ ] **FlowDesigner Component**
  ```typescript
  // components/flow-designer/FlowDesigner.tsx
  import React, { useState, useCallback } from 'react';
  import ReactFlow, { 
    Node, 
    Edge, 
    Controls, 
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    EdgeChange,
    NodeChange
  } from 'reactflow';
  import 'reactflow/dist/style.css';

  interface FlowDesignerProps {
    initialFlow?: FlowDesign;
    onSave?: (flow: FlowDesign) => void;
    onValidate?: (flow: FlowDesign) => boolean;
  }

  export const FlowDesigner: React.FC<FlowDesignerProps> = ({
    initialFlow,
    onSave,
    onValidate
  }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState(
      initialFlow?.nodes || []
    );
    const [edges, setEdges, onEdgesChange] = useEdgesState(
      initialFlow?.edges || []
    );

    const onConnect = useCallback(
      (params: Connection) => setEdges((eds) => addEdge(params, eds)),
      [setEdges]
    );

    const handleSave = useCallback(() => {
      const flow: FlowDesign = {
        id: initialFlow?.id || generateId(),
        name: initialFlow?.name || 'New Flow',
        description: initialFlow?.description || '',
        nodes,
        edges,
        category: initialFlow?.category || 'creative',
        createdAt: initialFlow?.createdAt || new Date(),
        updatedAt: new Date()
      };
      
      if (onValidate && !onValidate(flow)) {
        alert('Flow validation failed');
        return;
      }
      
      onSave?.(flow);
    }, [nodes, edges, initialFlow, onSave, onValidate]);

    return (
      <div className="h-[600px] w-full border rounded-lg">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
        >
          <Controls />
          <Background />
        </ReactFlow>
        <div className="p-4 border-t">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save Flow
          </button>
        </div>
      </div>
    );
  };
  ```

- [ ] **PersonaNode Component**
  ```typescript
  // components/flow-designer/PersonaNode.tsx
  import React, { memo } from 'react';
  import { Handle, Position, NodeProps } from 'reactflow';

  interface PersonaNodeData {
    label: string;
    personaId?: string;
    role?: string;
    expertise?: string;
    avatar?: string;
  }

  export const PersonaNode = memo(({ data }: NodeProps<PersonaNodeData>) => {
    return (
      <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-blue-200">
        <Handle type="target" position={Position.Top} className="w-2 h-2" />
        <div className="flex items-center">
          {data.avatar && (
            <img
              src={data.avatar}
              alt={data.label}
              className="w-8 h-8 rounded-full mr-2"
            />
          )}
          <div>
            <div className="text-sm font-bold">{data.label}</div>
            {data.role && (
              <div className="text-xs text-gray-600">{data.role}</div>
            )}
            {data.expertise && (
              <div className="text-xs text-blue-600">{data.expertise}</div>
            )}
          </div>
        </div>
        <Handle type="source" position={Position.Bottom} className="w-2 h-2" />
      </div>
    );
  });
  ```

- [ ] **DecisionNode Component**
  ```typescript
  // components/flow-designer/DecisionNode.tsx
  import React, { memo } from 'react';
  import { Handle, Position, NodeProps } from 'reactflow';

  interface DecisionNodeData {
    label: string;
    question?: string;
    options?: string[];
  }

  export const DecisionNode = memo(({ data }: NodeProps<DecisionNodeData>) => {
    return (
      <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-green-200">
        <Handle type="target" position={Position.Top} className="w-2 h-2" />
        <div className="text-center">
          <div className="text-sm font-bold text-green-700">{data.label}</div>
          {data.question && (
            <div className="text-xs text-gray-600 mt-1">{data.question}</div>
          )}
        </div>
        <Handle type="source" position={Position.Bottom} className="w-2 h-2" />
      </div>
    );
  });
  ```

- [ ] **SynthesisNode Component**
  ```typescript
  // components/flow-designer/SynthesisNode.tsx
  import React, { memo } from 'react';
  import { Handle, Position, NodeProps } from 'reactflow';

  interface SynthesisNodeData {
    label: string;
    type?: 'summary' | 'deliverable' | 'action-plan';
  }

  export const SynthesisNode = memo(({ data }: NodeProps<SynthesisNodeData>) => {
    return (
      <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-purple-200">
        <Handle type="target" position={Position.Top} className="w-2 h-2" />
        <div className="text-center">
          <div className="text-sm font-bold text-purple-700">{data.label}</div>
          {data.type && (
            <div className="text-xs text-gray-600 mt-1 capitalize">
              {data.type.replace('-', ' ')}
            </div>
          )}
        </div>
        <Handle type="source" position={Position.Bottom} className="w-2 h-2" />
      </div>
    );
  });
  ```

#### Drag-and-Drop Functionality (Day 6-7)

- [ ] **Persona Library Sidebar**
  ```typescript
  // components/flow-designer/PersonaLibrary.tsx
  import React from 'react';
  import { useDrag } from 'react-dnd';

  interface PersonaTemplate {
    id: string;
    name: string;
    role: string;
    expertise: string;
    avatar?: string;
  }

  interface PersonaLibraryProps {
    personas: PersonaTemplate[];
    onPersonaSelect: (persona: PersonaTemplate) => void;
  }

  export const PersonaLibrary: React.FC<PersonaLibraryProps> = ({
    personas,
    onPersonaSelect
  }) => {
    return (
      <div className="w-64 bg-gray-50 p-4 border-r">
        <h3 className="text-lg font-semibold mb-4">Expert Personas</h3>
        <div className="space-y-2">
          {personas.map((persona) => (
            <DraggablePersona
              key={persona.id}
              persona={persona}
              onSelect={onPersonaSelect}
            />
          ))}
        </div>
      </div>
    );
  };

  const DraggablePersona: React.FC<{
    persona: PersonaTemplate;
    onSelect: (persona: PersonaTemplate) => void;
  }> = ({ persona, onSelect }) => {
    const [{ isDragging }, drag] = useDrag({
      type: 'PERSONA',
      item: persona,
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    });

    return (
      <div
        ref={drag}
        className={`p-2 bg-white rounded border cursor-move hover:shadow-md transition-shadow ${
          isDragging ? 'opacity-50' : ''
        }`}
        onClick={() => onSelect(persona)}
      >
        <div className="flex items-center">
          {persona.avatar && (
            <img
              src={persona.avatar}
              alt={persona.name}
              className="w-6 h-6 rounded-full mr-2"
            />
          )}
          <div>
            <div className="text-sm font-medium">{persona.name}</div>
            <div className="text-xs text-gray-600">{persona.role}</div>
          </div>
        </div>
      </div>
    );
  };
  ```

- [ ] **Flow Canvas with Drop Zones**
  ```typescript
  // components/flow-designer/FlowCanvas.tsx
  import React, { useCallback } from 'react';
  import { useDrop } from 'react-dnd';
  import ReactFlow, { Node, Edge } from 'reactflow';

  interface FlowCanvasProps {
    nodes: Node[];
    edges: Edge[];
    onNodesChange: (changes: NodeChange[]) => void;
    onEdgesChange: (changes: EdgeChange[]) => void;
    onConnect: (connection: Connection) => void;
    onPersonaDrop: (persona: PersonaTemplate, position: { x: number; y: number }) => void;
  }

  export const FlowCanvas: React.FC<FlowCanvasProps> = ({
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onPersonaDrop
  }) => {
    const [{ isOver }, drop] = useDrop({
      accept: 'PERSONA',
      drop: (item: PersonaTemplate, monitor) => {
        const offset = monitor.getClientOffset();
        if (offset) {
          // Convert screen coordinates to flow coordinates
          const position = { x: offset.x, y: offset.y };
          onPersonaDrop(item, position);
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    });

    return (
      <div
        ref={drop}
        className={`flex-1 h-full ${
          isOver ? 'bg-blue-50 border-2 border-blue-300' : ''
        }`}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
        >
          <Controls />
          <Background />
        </ReactFlow>
      </div>
    );
  };
  ```

#### Flow Validation & Preview (Day 8-9)

- [ ] **Flow Validation Logic**
  ```typescript
  // lib/flow-designer/validation.ts
  export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }

  export const validateFlow = (flow: FlowDesign): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for disconnected nodes
    const connectedNodeIds = new Set<string>();
    flow.edges.forEach(edge => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });

    flow.nodes.forEach(node => {
      if (!connectedNodeIds.has(node.id)) {
        warnings.push(`Node "${node.data.label}" is not connected`);
      }
    });

    // Check for cycles
    if (hasCycle(flow.nodes, flow.edges)) {
      errors.push('Flow contains cycles which are not allowed');
    }

    // Check for multiple synthesis nodes
    const synthesisNodes = flow.nodes.filter(node => node.type === 'synthesis');
    if (synthesisNodes.length > 1) {
      warnings.push('Multiple synthesis nodes detected');
    }

    // Check for empty flow
    if (flow.nodes.length === 0) {
      errors.push('Flow must contain at least one node');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  };

  const hasCycle = (nodes: FlowNode[], edges: FlowEdge[]): boolean => {
    // Implement cycle detection using DFS
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      if (recStack.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;

      visited.add(nodeId);
      recStack.add(nodeId);

      const outgoingEdges = edges.filter(edge => edge.source === nodeId);
      for (const edge of outgoingEdges) {
        if (dfs(edge.target)) return true;
      }

      recStack.delete(nodeId);
      return false;
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (dfs(node.id)) return true;
      }
    }

    return false;
  };
  ```

- [ ] **Flow Preview Component**
  ```typescript
  // components/flow-designer/FlowPreview.tsx
  import React from 'react';
  import { FlowDesign } from '@/types/flow-designer';

  interface FlowPreviewProps {
    flow: FlowDesign;
    onEdit: () => void;
    onExecute: () => void;
  }

  export const FlowPreview: React.FC<FlowPreviewProps> = ({
    flow,
    onEdit,
    onExecute
  }) => {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{flow.name}</h3>
          <div className="flex space-x-2">
            <button
              onClick={onEdit}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Edit
            </button>
            <button
              onClick={onExecute}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Execute
            </button>
          </div>
        </div>
        
        <div className="mb-4">
          <p className="text-gray-600">{flow.description}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {flow.nodes.length}
            </div>
            <div className="text-sm text-gray-600">Nodes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {flow.edges.length}
            </div>
            <div className="text-sm text-gray-600">Connections</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {flow.category}
            </div>
            <div className="text-sm text-gray-600">Category</div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium mb-2">Flow Steps:</h4>
          <div className="space-y-1">
            {flow.nodes.map((node, index) => (
              <div key={node.id} className="flex items-center text-sm">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-2">
                  {index + 1}
                </span>
                <span>{node.data.label}</span>
                <span className="ml-2 text-xs text-gray-500 capitalize">
                  ({node.type})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };
  ```

### Integration with Existing System (Day 10-12)

- [ ] **API Integration**
  ```typescript
  // lib/api/flows.ts
  export const createFlow = async (flow: FlowDesign): Promise<FlowDesign> => {
    const response = await fetch('/api/flows', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(flow),
    });

    if (!response.ok) {
      throw new Error('Failed to create flow');
    }

    return response.json();
  };

  export const updateFlow = async (id: string, flow: Partial<FlowDesign>): Promise<FlowDesign> => {
    const response = await fetch(`/api/flows/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(flow),
    });

    if (!response.ok) {
      throw new Error('Failed to update flow');
    }

    return response.json();
  };

  export const getFlow = async (id: string): Promise<FlowDesign> => {
    const response = await fetch(`/api/flows/${id}`);

    if (!response.ok) {
      throw new Error('Failed to fetch flow');
    }

    return response.json();
  };

  export const listFlows = async (): Promise<FlowDesign[]> => {
    const response = await fetch('/api/flows');

    if (!response.ok) {
      throw new Error('Failed to fetch flows');
    }

    return response.json();
  };
  ```

- [ ] **Database Schema Updates**
  ```sql
  -- Add flows table to existing schema
  CREATE TABLE IF NOT EXISTS flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    nodes JSONB NOT NULL,
    edges JSONB NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'creative',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Add indexes for performance
  CREATE INDEX idx_flows_category ON flows(category);
  CREATE INDEX idx_flows_created_at ON flows(created_at);
  ```

- [ ] **API Route Implementation**
  ```typescript
  // app/api/flows/route.ts
  import { NextRequest, NextResponse } from 'next/server';
  import { db } from '@/lib/db';
  import { flows } from '@/lib/db/schema';
  import { validateFlow } from '@/lib/flow-designer/validation';

  export async function POST(request: NextRequest) {
    try {
      const body = await request.json();
      
      // Validate flow structure
      const validation = validateFlow(body);
      if (!validation.isValid) {
        return NextResponse.json(
          { error: 'Invalid flow', details: validation.errors },
          { status: 400 }
        );
      }

      const [flow] = await db.insert(flows).values({
        name: body.name,
        description: body.description,
        nodes: body.nodes,
        edges: body.edges,
        category: body.category,
      }).returning();

      return NextResponse.json(flow);
    } catch (error) {
      console.error('Error creating flow:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }

  export async function GET() {
    try {
      const allFlows = await db.select().from(flows).orderBy(flows.createdAt);
      return NextResponse.json(allFlows);
    } catch (error) {
      console.error('Error fetching flows:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
  ```

### Testing Implementation (Day 13-14)

- [ ] **Unit Tests**
  ```typescript
  // __tests__/flow-designer/validation.test.ts
  import { validateFlow } from '@/lib/flow-designer/validation';
  import { FlowDesign } from '@/types/flow-designer';

  describe('Flow Validation', () => {
    it('should validate a simple valid flow', () => {
      const flow: FlowDesign = {
        id: '1',
        name: 'Test Flow',
        description: 'A test flow',
        nodes: [
          {
            id: '1',
            type: 'persona',
            position: { x: 0, y: 0 },
            data: { label: 'Expert 1' }
          },
          {
            id: '2',
            type: 'synthesis',
            position: { x: 200, y: 0 },
            data: { label: 'Synthesis' }
          }
        ],
        edges: [
          {
            id: '1',
            source: '1',
            target: '2',
            type: 'default'
          }
        ],
        category: 'creative',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = validateFlow(flow);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect cycles in flow', () => {
      const flow: FlowDesign = {
        id: '1',
        name: 'Cyclic Flow',
        description: 'A flow with cycles',
        nodes: [
          { id: '1', type: 'persona', position: { x: 0, y: 0 }, data: { label: 'A' } },
          { id: '2', type: 'persona', position: { x: 200, y: 0 }, data: { label: 'B' } }
        ],
        edges: [
          { id: '1', source: '1', target: '2', type: 'default' },
          { id: '2', source: '2', target: '1', type: 'default' }
        ],
        category: 'creative',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = validateFlow(flow);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Flow contains cycles which are not allowed');
    });
  });
  ```

- [ ] **Integration Tests**
  ```typescript
  // __tests__/flow-designer/integration.test.ts
  import { render, screen, fireEvent, waitFor } from '@testing-library/react';
  import { FlowDesigner } from '@/components/flow-designer/FlowDesigner';

  describe('Flow Designer Integration', () => {
    it('should render flow designer with empty state', () => {
      render(<FlowDesigner />);
      
      expect(screen.getByText('Save Flow')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save Flow' })).toBeInTheDocument();
    });

    it('should allow adding nodes via drag and drop', async () => {
      render(<FlowDesigner />);
      
      // Simulate drag and drop
      const personaLibrary = screen.getByText('Expert Personas');
      const flowCanvas = screen.getByTestId('flow-canvas');
      
      fireEvent.dragStart(personaLibrary);
      fireEvent.drop(flowCanvas);
      
      await waitFor(() => {
        expect(screen.getByText('Expert 1')).toBeInTheDocument();
      });
    });

    it('should validate flow before saving', async () => {
      const mockOnSave = jest.fn();
      const mockOnValidate = jest.fn().mockReturnValue(false);
      
      render(
        <FlowDesigner 
          onSave={mockOnSave}
          onValidate={mockOnValidate}
        />
      );
      
      const saveButton = screen.getByRole('button', { name: 'Save Flow' });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Flow validation failed')).toBeInTheDocument();
      });
      
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });
  ```

---

## 1.2 Enhanced Professional Deliverables

### Deliverable Generation Engine (Day 1-3)

- [ ] **Setup Deliverable Infrastructure**
  ```bash
  npm install puppeteer docx marked
  npm install @types/marked --save-dev
  ```

- [ ] **Create Deliverable Types**
  ```typescript
  // types/deliverables.ts
  export type DeliverableType = 
    | 'creative-brief'
    | 'strategic-plan'
    | 'research-summary'
    | 'implementation-roadmap';

  export type DeliverableFormat = 
    | 'pdf'
    | 'docx'
    | 'markdown'
    | 'json';

  export type StakeholderType = 
    | 'executive'
    | 'technical'
    | 'creative'
    | 'general';

  export interface DeliverableConfig {
    type: DeliverableType;
    format: DeliverableFormat;
    stakeholder: StakeholderType;
    sessionId: string;
    customizations?: {
      includeCharts?: boolean;
      includeAppendices?: boolean;
      branding?: {
        logo?: string;
        colors?: string[];
        font?: string;
      };
    };
  }

  export interface DeliverableContent {
    title: string;
    executiveSummary: string;
    mainContent: string;
    recommendations: string[];
    appendices?: string[];
    metadata: {
      generatedAt: Date;
      sessionDuration: number;
      participants: string[];
      tags: string[];
    };
  }
  ```

- [ ] **Deliverable Templates**
  ```typescript
  // lib/deliverables/templates.ts
  export const deliverableTemplates = {
    'creative-brief': {
      title: 'Creative Brief',
      sections: [
        'Project Overview',
        'Creative Direction',
        'Target Audience',
        'Key Messages',
        'Deliverables',
        'Timeline',
        'Success Metrics'
      ],
      stakeholderVersions: {
        executive: {
          includeCharts: true,
          includeAppendices: false,
          focusOn: ['Project Overview', 'Success Metrics']
        },
        creative: {
          includeCharts: false,
          includeAppendices: true,
          focusOn: ['Creative Direction', 'Deliverables']
        },
        technical: {
          includeCharts: true,
          includeAppendices: true,
          focusOn: ['Deliverables', 'Timeline']
        }
      }
    },
    'strategic-plan': {
      title: 'Strategic Plan',
      sections: [
        'Executive Summary',
        'Market Analysis',
        'Strategic Objectives',
        'Implementation Plan',
        'Risk Assessment',
        'Financial Projections',
        'Success Metrics'
      ],
      stakeholderVersions: {
        executive: {
          includeCharts: true,
          includeAppendices: false,
          focusOn: ['Executive Summary', 'Strategic Objectives', 'Financial Projections']
        },
        technical: {
          includeCharts: true,
          includeAppendices: true,
          focusOn: ['Implementation Plan', 'Risk Assessment']
        }
      }
    }
  };
  ```

### PDF Generation (Day 4-5)

- [ ] **PDF Generator**
  ```typescript
  // lib/deliverables/pdf-generator.ts
  import puppeteer from 'puppeteer';
  import { DeliverableContent, DeliverableConfig } from '@/types/deliverables';

  export class PDFGenerator {
    private browser: puppeteer.Browser | null = null;

    async initialize() {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }

    async generatePDF(
      content: DeliverableContent,
      config: DeliverableConfig
    ): Promise<Buffer> {
      if (!this.browser) {
        await this.initialize();
      }

      const page = await this.browser!.newPage();
      
      // Generate HTML content
      const html = this.generateHTML(content, config);
      await page.setContent(html);
      
      // Generate PDF
      const pdf = await page.pdf({
        format: 'A4',
        margin: {
          top: '1in',
          right: '1in',
          bottom: '1in',
          left: '1in'
        },
        printBackground: true
      });

      await page.close();
      return pdf;
    }

    private generateHTML(content: DeliverableContent, config: DeliverableConfig): string {
      const template = deliverableTemplates[config.type];
      const stakeholderConfig = template.stakeholderVersions[config.stakeholder];

      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${content.title}</title>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #007bff;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .section {
              margin-bottom: 25px;
            }
            .section h2 {
              color: #007bff;
              border-bottom: 1px solid #eee;
              padding-bottom: 5px;
            }
            .executive-summary {
              background-color: #f8f9fa;
              padding: 15px;
              border-left: 4px solid #007bff;
              margin-bottom: 30px;
            }
            .recommendations {
              background-color: #e7f3ff;
              padding: 15px;
              border-radius: 5px;
            }
            .recommendations ul {
              margin: 10px 0;
            }
            .metadata {
              font-size: 12px;
              color: #666;
              border-top: 1px solid #eee;
              padding-top: 15px;
              margin-top: 30px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${content.title}</h1>
            <p>Generated on ${content.metadata.generatedAt.toLocaleDateString()}</p>
          </div>

          <div class="executive-summary">
            <h2>Executive Summary</h2>
            <p>${content.executiveSummary}</p>
          </div>

          <div class="section">
            <h2>Main Content</h2>
            ${content.mainContent}
          </div>

          <div class="recommendations">
            <h2>Key Recommendations</h2>
            <ul>
              ${content.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
          </div>

          ${content.appendices && stakeholderConfig.includeAppendices ? `
            <div class="section">
              <h2>Appendices</h2>
              ${content.appendices.map(appendix => `<div>${appendix}</div>`).join('')}
            </div>
          ` : ''}

          <div class="metadata">
            <p><strong>Session Duration:</strong> ${content.metadata.sessionDuration} minutes</p>
            <p><strong>Participants:</strong> ${content.metadata.participants.join(', ')}</p>
            <p><strong>Tags:</strong> ${content.metadata.tags.join(', ')}</p>
          </div>
        </body>
        </html>
      `;
    }

    async close() {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
  ```

### Word Document Generation (Day 6-7)

- [ ] **Word Document Generator**
  ```typescript
  // lib/deliverables/docx-generator.ts
  import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
  import { DeliverableContent, DeliverableConfig } from '@/types/deliverables';

  export class DOCXGenerator {
    async generateDOCX(
      content: DeliverableContent,
      config: DeliverableConfig
    ): Promise<Buffer> {
      const doc = new Document({
        sections: [{
          properties: {},
          children: this.generateSections(content, config)
        }]
      });

      return await Packer.toBuffer(doc);
    }

    private generateSections(content: DeliverableContent, config: DeliverableConfig) {
      const sections: Paragraph[] = [];

      // Title
      sections.push(
        new Paragraph({
          text: content.title,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER
        })
      );

      // Executive Summary
      sections.push(
        new Paragraph({
          text: "Executive Summary",
          heading: HeadingLevel.HEADING_2
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: content.executiveSummary,
              size: 24
            })
          ]
        })
      );

      // Main Content
      sections.push(
        new Paragraph({
          text: "Main Content",
          heading: HeadingLevel.HEADING_2
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: content.mainContent,
              size: 24
            })
          ]
        })
      );

      // Recommendations
      sections.push(
        new Paragraph({
          text: "Key Recommendations",
          heading: HeadingLevel.HEADING_2
        })
      );

      content.recommendations.forEach(recommendation => {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "• " + recommendation,
                size: 24
              })
            ]
          })
        );
      });

      // Metadata
      sections.push(
        new Paragraph({
          text: "Metadata",
          heading: HeadingLevel.HEADING_3
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Generated: ${content.metadata.generatedAt.toLocaleDateString()}`,
              size: 20,
              color: "666666"
            })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Session Duration: ${content.metadata.sessionDuration} minutes`,
              size: 20,
              color: "666666"
            })
          ]
        })
      );

      return sections;
    }
  }
  ```

### API Integration (Day 8-9)

- [ ] **Deliverable API Routes**
  ```typescript
  // app/api/deliverables/route.ts
  import { NextRequest, NextResponse } from 'next/server';
  import { PDFGenerator } from '@/lib/deliverables/pdf-generator';
  import { DOCXGenerator } from '@/lib/deliverables/docx-generator';
  import { generateDeliverableContent } from '@/lib/deliverables/content-generator';
  import { DeliverableConfig } from '@/types/deliverables';

  export async function POST(request: NextRequest) {
    try {
      const config: DeliverableConfig = await request.json();
      
      // Generate content from session
      const content = await generateDeliverableContent(config.sessionId, config);
      
      let buffer: Buffer;
      let filename: string;
      let contentType: string;

      switch (config.format) {
        case 'pdf':
          const pdfGenerator = new PDFGenerator();
          buffer = await pdfGenerator.generatePDF(content, config);
          filename = `${content.title.replace(/\s+/g, '_')}.pdf`;
          contentType = 'application/pdf';
          break;

        case 'docx':
          const docxGenerator = new DOCXGenerator();
          buffer = await docxGenerator.generateDOCX(content, config);
          filename = `${content.title.replace(/\s+/g, '_')}.docx`;
          contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          break;

        case 'markdown':
          const markdown = generateMarkdown(content, config);
          buffer = Buffer.from(markdown, 'utf-8');
          filename = `${content.title.replace(/\s+/g, '_')}.md`;
          contentType = 'text/markdown';
          break;

        case 'json':
          buffer = Buffer.from(JSON.stringify(content, null, 2), 'utf-8');
          filename = `${content.title.replace(/\s+/g, '_')}.json`;
          contentType = 'application/json';
          break;

        default:
          return NextResponse.json(
            { error: 'Unsupported format' },
            { status: 400 }
          );
      }

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });

    } catch (error) {
      console.error('Error generating deliverable:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
  ```

### Testing Deliverables (Day 10-12)

- [ ] **Deliverable Generation Tests**
  ```typescript
  // __tests__/deliverables/generation.test.ts
  import { PDFGenerator } from '@/lib/deliverables/pdf-generator';
  import { DOCXGenerator } from '@/lib/deliverables/docx-generator';
  import { DeliverableContent, DeliverableConfig } from '@/types/deliverables';

  describe('Deliverable Generation', () => {
    let pdfGenerator: PDFGenerator;
    let docxGenerator: DOCXGenerator;

    beforeEach(() => {
      pdfGenerator = new PDFGenerator();
      docxGenerator = new DOCXGenerator();
    });

    afterEach(async () => {
      await pdfGenerator.close();
    });

    it('should generate PDF deliverable', async () => {
      const content: DeliverableContent = {
        title: 'Test Creative Brief',
        executiveSummary: 'This is a test executive summary.',
        mainContent: 'This is the main content of the deliverable.',
        recommendations: ['Recommendation 1', 'Recommendation 2'],
        metadata: {
          generatedAt: new Date(),
          sessionDuration: 60,
          participants: ['Expert 1', 'Expert 2'],
          tags: ['creative', 'test']
        }
      };

      const config: DeliverableConfig = {
        type: 'creative-brief',
        format: 'pdf',
        stakeholder: 'executive',
        sessionId: 'test-session'
      };

      const pdf = await pdfGenerator.generatePDF(content, config);
      
      expect(pdf).toBeInstanceOf(Buffer);
      expect(pdf.length).toBeGreaterThan(0);
    });

    it('should generate DOCX deliverable', async () => {
      const content: DeliverableContent = {
        title: 'Test Strategic Plan',
        executiveSummary: 'This is a test executive summary.',
        mainContent: 'This is the main content of the deliverable.',
        recommendations: ['Recommendation 1', 'Recommendation 2'],
        metadata: {
          generatedAt: new Date(),
          sessionDuration: 60,
          participants: ['Expert 1', 'Expert 2'],
          tags: ['strategic', 'test']
        }
      };

      const config: DeliverableConfig = {
        type: 'strategic-plan',
        format: 'docx',
        stakeholder: 'technical',
        sessionId: 'test-session'
      };

      const docx = await docxGenerator.generateDOCX(content, config);
      
      expect(docx).toBeInstanceOf(Buffer);
      expect(docx.length).toBeGreaterThan(0);
    });
  });
  ```

---

## Phase 1 Completion Checklist

### Visual Flow Designer
- [ ] React Flow library installed and configured
- [ ] Core components implemented (FlowDesigner, PersonaNode, DecisionNode, SynthesisNode)
- [ ] Drag-and-drop functionality working
- [ ] Flow validation logic implemented
- [ ] Integration with existing API and database
- [ ] Unit and integration tests passing
- [ ] User acceptance testing completed

### Enhanced Professional Deliverables
- [ ] Deliverable types and templates defined
- [ ] PDF generation working with professional formatting
- [ ] Word document generation working
- [ ] Markdown and JSON export options available
- [ ] Stakeholder-specific versions implemented
- [ ] API integration completed
- [ ] Testing suite passing

### Integration & Testing
- [ ] All components integrated with existing system
- [ ] Database schema updated
- [ ] API routes implemented and tested
- [ ] Performance benchmarks met
- [ ] Cross-browser compatibility verified
- [ ] Mobile responsiveness confirmed

### Documentation
- [ ] Component documentation updated
- [ ] API documentation completed
- [ ] User guide for flow designer written
- [ ] Deliverable generation guide created

---

## Success Criteria for Phase 1

### Technical Criteria
- [ ] Visual flow designer loads in < 2 seconds
- [ ] Deliverable generation completes in < 5 seconds
- [ ] 90%+ test coverage achieved
- [ ] Zero critical bugs in production testing

### User Experience Criteria
- [ ] Flow designer is intuitive and easy to use
- [ ] Deliverables have professional appearance
- [ ] All export formats work correctly
- [ ] Stakeholder-specific versions are appropriate

### Business Criteria
- [ ] Core PRD requirements for flow design met
- [ ] Professional deliverable generation working
- [ ] Ready for Phase 2 development
- [ ] User feedback is positive (>4.0/5 rating)

---

**Phase 1 Status:** Ready for Implementation  
**Estimated Duration:** 14 days  
**Critical Path:** Visual Flow Designer  
**Dependencies:** None (can start immediately)

**Next Steps:**
1. Begin implementation of Visual Flow Designer
2. Set up development environment with required dependencies
3. Create component structure and basic functionality
4. Implement drag-and-drop features
5. Add validation and preview capabilities
6. Integrate with existing system
7. Complete testing and documentation
8. Move to Phase 2 implementation
