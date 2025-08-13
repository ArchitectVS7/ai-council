import { FlowDesign, FlowNode, FlowEdge, FlowValidationResult } from '../../types/flow-designer';

export function validateFlow(flow: FlowDesign): FlowValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for empty flow
  if (flow.nodes.length === 0) {
    errors.push('Flow must contain at least one node');
    return { isValid: false, errors, warnings };
  }

  // Check for disconnected nodes
  const connectedNodes = new Set<string>();
  flow.edges.forEach(edge => {
    connectedNodes.add(edge.source);
    connectedNodes.add(edge.target);
  });

  const disconnectedNodes = flow.nodes.filter(node => !connectedNodes.has(node.id));
  if (disconnectedNodes.length > 0) {
    errors.push(`Disconnected nodes found: ${disconnectedNodes.map(n => n.data.label).join(', ')}`);
  }

  // Check for cycles
  if (hasCycle(flow.nodes, flow.edges)) {
    errors.push('Flow contains cycles which are not allowed');
  }

  // Check for multiple synthesis nodes
  const synthesisNodes = flow.nodes.filter(node => node.type === 'synthesis');
  if (synthesisNodes.length > 1) {
    errors.push('Flow can only have one synthesis node');
  }

  // Check for synthesis node at the end
  if (synthesisNodes.length === 1) {
    const synthesisNode = synthesisNodes[0];
    const hasOutgoingEdges = flow.edges.some(edge => edge.source === synthesisNode.id);
    if (hasOutgoingEdges) {
      errors.push('Synthesis node should not have outgoing edges');
    }
  }

  // Check for persona nodes without personaId
  const personaNodesWithoutId = flow.nodes.filter(
    node => node.type === 'persona' && !node.data.personaId
  );
  if (personaNodesWithoutId.length > 0) {
    warnings.push(`Persona nodes without assigned personas: ${personaNodesWithoutId.map(n => n.data.label).join(', ')}`);
  }

  // Check for decision nodes without proper connections
  const decisionNodes = flow.nodes.filter(node => node.type === 'decision');
  decisionNodes.forEach(decisionNode => {
    const outgoingEdges = flow.edges.filter(edge => edge.source === decisionNode.id);
    if (outgoingEdges.length < 2) {
      warnings.push(`Decision node "${decisionNode.data.label}" should have at least 2 outgoing edges`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

function hasCycle(nodes: FlowNode[], edges: FlowEdge[]): boolean {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(nodeId: string): boolean {
    if (recursionStack.has(nodeId)) {
      return true; // Cycle detected
    }
    if (visited.has(nodeId)) {
      return false;
    }

    visited.add(nodeId);
    recursionStack.add(nodeId);

    const outgoingEdges = edges.filter(edge => edge.source === nodeId);
    for (const edge of outgoingEdges) {
      if (dfs(edge.target)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) {
        return true;
      }
    }
  }

  return false;
}
