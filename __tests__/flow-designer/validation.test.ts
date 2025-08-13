import { validateFlow } from '../../lib/flow-designer/validation';
import { FlowDesign, FlowNode, FlowEdge } from '../../types/flow-designer';

describe('Flow Validation', () => {
  const createMockFlow = (nodes: FlowNode[], edges: FlowEdge[]): FlowDesign => ({
    id: 'test-flow',
    name: 'Test Flow',
    description: 'Test description',
    nodes,
    edges,
    category: 'creative',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  describe('Valid Flow Scenarios', () => {
    test('should validate a simple valid flow', () => {
      const nodes: FlowNode[] = [
        {
          id: 'node1',
          type: 'persona',
          position: { x: 0, y: 0 },
          data: { label: 'Persona 1', personaId: 'p1' },
        },
        {
          id: 'node2',
          type: 'synthesis',
          position: { x: 100, y: 100 },
          data: { label: 'Synthesis' },
        },
      ];

      const edges: FlowEdge[] = [
        {
          id: 'edge1',
          source: 'node1',
          target: 'node2',
          type: 'default',
        },
      ];

      const flow = createMockFlow(nodes, edges);
      const result = validateFlow(flow);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should validate a complex valid flow with decision nodes', () => {
      const nodes: FlowNode[] = [
        {
          id: 'persona1',
          type: 'persona',
          position: { x: 0, y: 0 },
          data: { label: 'Persona 1', personaId: 'p1' },
        },
        {
          id: 'decision1',
          type: 'decision',
          position: { x: 100, y: 100 },
          data: { label: 'Decision Point' },
        },
        {
          id: 'persona2',
          type: 'persona',
          position: { x: 200, y: 50 },
          data: { label: 'Persona 2', personaId: 'p2' },
        },
        {
          id: 'persona3',
          type: 'persona',
          position: { x: 200, y: 150 },
          data: { label: 'Persona 3', personaId: 'p3' },
        },
        {
          id: 'synthesis1',
          type: 'synthesis',
          position: { x: 300, y: 100 },
          data: { label: 'Synthesis' },
        },
      ];

      const edges: FlowEdge[] = [
        { id: 'e1', source: 'persona1', target: 'decision1', type: 'default' },
        { id: 'e2', source: 'decision1', target: 'persona2', type: 'default' },
        { id: 'e3', source: 'decision1', target: 'persona3', type: 'default' },
        { id: 'e4', source: 'persona2', target: 'synthesis1', type: 'default' },
        { id: 'e5', source: 'persona3', target: 'synthesis1', type: 'default' },
      ];

      const flow = createMockFlow(nodes, edges);
      const result = validateFlow(flow);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Invalid Flow Scenarios', () => {
    test('should reject empty flow', () => {
      const flow = createMockFlow([], []);
      const result = validateFlow(flow);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Flow must contain at least one node');
    });

    test('should detect disconnected nodes', () => {
      const nodes: FlowNode[] = [
        {
          id: 'node1',
          type: 'persona',
          position: { x: 0, y: 0 },
          data: { label: 'Persona 1', personaId: 'p1' },
        },
        {
          id: 'node2',
          type: 'persona',
          position: { x: 100, y: 100 },
          data: { label: 'Persona 2', personaId: 'p2' },
        },
      ];

      const flow = createMockFlow(nodes, []);
      const result = validateFlow(flow);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Disconnected nodes found: Persona 1, Persona 2');
    });

    test('should detect cycles in flow', () => {
      const nodes: FlowNode[] = [
        {
          id: 'node1',
          type: 'persona',
          position: { x: 0, y: 0 },
          data: { label: 'Persona 1', personaId: 'p1' },
        },
        {
          id: 'node2',
          type: 'persona',
          position: { x: 100, y: 100 },
          data: { label: 'Persona 2', personaId: 'p2' },
        },
      ];

      const edges: FlowEdge[] = [
        { id: 'e1', source: 'node1', target: 'node2', type: 'default' },
        { id: 'e2', source: 'node2', target: 'node1', type: 'default' },
      ];

      const flow = createMockFlow(nodes, edges);
      const result = validateFlow(flow);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Flow contains cycles which are not allowed');
    });

    test('should reject multiple synthesis nodes', () => {
      const nodes: FlowNode[] = [
        {
          id: 'node1',
          type: 'persona',
          position: { x: 0, y: 0 },
          data: { label: 'Persona 1', personaId: 'p1' },
        },
        {
          id: 'synthesis1',
          type: 'synthesis',
          position: { x: 100, y: 100 },
          data: { label: 'Synthesis 1' },
        },
        {
          id: 'synthesis2',
          type: 'synthesis',
          position: { x: 200, y: 200 },
          data: { label: 'Synthesis 2' },
        },
      ];

      const edges: FlowEdge[] = [
        { id: 'e1', source: 'node1', target: 'synthesis1', type: 'default' },
        { id: 'e2', source: 'node1', target: 'synthesis2', type: 'default' },
      ];

      const flow = createMockFlow(nodes, edges);
      const result = validateFlow(flow);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Flow can only have one synthesis node');
    });

    test('should reject synthesis node with outgoing edges', () => {
      const nodes: FlowNode[] = [
        {
          id: 'persona1',
          type: 'persona',
          position: { x: 0, y: 0 },
          data: { label: 'Persona 1', personaId: 'p1' },
        },
        {
          id: 'synthesis1',
          type: 'synthesis',
          position: { x: 100, y: 100 },
          data: { label: 'Synthesis' },
        },
        {
          id: 'persona2',
          type: 'persona',
          position: { x: 200, y: 200 },
          data: { label: 'Persona 2', personaId: 'p2' },
        },
      ];

      const edges: FlowEdge[] = [
        { id: 'e1', source: 'persona1', target: 'synthesis1', type: 'default' },
        { id: 'e2', source: 'synthesis1', target: 'persona2', type: 'default' },
      ];

      const flow = createMockFlow(nodes, edges);
      const result = validateFlow(flow);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Synthesis node should not have outgoing edges');
    });
  });

  describe('Warning Scenarios', () => {
    test('should warn about persona nodes without personaId', () => {
      const nodes: FlowNode[] = [
        {
          id: 'node1',
          type: 'persona',
          position: { x: 0, y: 0 },
          data: { label: 'Unassigned Persona' },
        },
        {
          id: 'node2',
          type: 'synthesis',
          position: { x: 100, y: 100 },
          data: { label: 'Synthesis' },
        },
      ];

      const edges: FlowEdge[] = [
        { id: 'e1', source: 'node1', target: 'node2', type: 'default' },
      ];

      const flow = createMockFlow(nodes, edges);
      const result = validateFlow(flow);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Persona nodes without assigned personas: Unassigned Persona');
    });

    test('should warn about decision nodes with insufficient outgoing edges', () => {
      const nodes: FlowNode[] = [
        {
          id: 'persona1',
          type: 'persona',
          position: { x: 0, y: 0 },
          data: { label: 'Persona 1', personaId: 'p1' },
        },
        {
          id: 'decision1',
          type: 'decision',
          position: { x: 100, y: 100 },
          data: { label: 'Decision Point' },
        },
        {
          id: 'synthesis1',
          type: 'synthesis',
          position: { x: 200, y: 200 },
          data: { label: 'Synthesis' },
        },
      ];

      const edges: FlowEdge[] = [
        { id: 'e1', source: 'persona1', target: 'decision1', type: 'default' },
        { id: 'e2', source: 'decision1', target: 'synthesis1', type: 'default' },
      ];

      const flow = createMockFlow(nodes, edges);
      const result = validateFlow(flow);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Decision node "Decision Point" should have at least 2 outgoing edges');
    });
  });

  describe('Cycle Detection', () => {
    test('should detect simple cycle', () => {
      const nodes: FlowNode[] = [
        { id: 'a', type: 'persona', position: { x: 0, y: 0 }, data: { label: 'A' } },
        { id: 'b', type: 'persona', position: { x: 1, y: 1 }, data: { label: 'B' } },
      ];

      const edges: FlowEdge[] = [
        { id: 'e1', source: 'a', target: 'b', type: 'default' },
        { id: 'e2', source: 'b', target: 'a', type: 'default' },
      ];

      const flow = createMockFlow(nodes, edges);
      const result = validateFlow(flow);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Flow contains cycles which are not allowed');
    });

    test('should detect complex cycle', () => {
      const nodes: FlowNode[] = [
        { id: 'a', type: 'persona', position: { x: 0, y: 0 }, data: { label: 'A' } },
        { id: 'b', type: 'persona', position: { x: 1, y: 1 }, data: { label: 'B' } },
        { id: 'c', type: 'persona', position: { x: 2, y: 2 }, data: { label: 'C' } },
      ];

      const edges: FlowEdge[] = [
        { id: 'e1', source: 'a', target: 'b', type: 'default' },
        { id: 'e2', source: 'b', target: 'c', type: 'default' },
        { id: 'e3', source: 'c', target: 'a', type: 'default' },
      ];

      const flow = createMockFlow(nodes, edges);
      const result = validateFlow(flow);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Flow contains cycles which are not allowed');
    });

    test('should allow branching without cycles', () => {
      const nodes: FlowNode[] = [
        { id: 'a', type: 'persona', position: { x: 0, y: 0 }, data: { label: 'A' } },
        { id: 'b', type: 'persona', position: { x: 1, y: 1 }, data: { label: 'B' } },
        { id: 'c', type: 'persona', position: { x: 2, y: 2 }, data: { label: 'C' } },
        { id: 'd', type: 'synthesis', position: { x: 3, y: 3 }, data: { label: 'D' } },
      ];

      const edges: FlowEdge[] = [
        { id: 'e1', source: 'a', target: 'b', type: 'default' },
        { id: 'e2', source: 'a', target: 'c', type: 'default' },
        { id: 'e3', source: 'b', target: 'd', type: 'default' },
        { id: 'e4', source: 'c', target: 'd', type: 'default' },
      ];

      const flow = createMockFlow(nodes, edges);
      const result = validateFlow(flow);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
