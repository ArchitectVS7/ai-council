import { FlowDesign } from '../../types/flow-designer';

export async function createFlow(flow: Omit<FlowDesign, 'id' | 'createdAt' | 'updatedAt'>): Promise<FlowDesign> {
  const response = await fetch('/api/flows', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(flow),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create flow');
  }

  return response.json();
}

export async function updateFlow(id: string, flow: Partial<FlowDesign>): Promise<FlowDesign> {
  const response = await fetch(`/api/flows/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(flow),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update flow');
  }

  return response.json();
}

export async function getFlow(id: string): Promise<FlowDesign> {
  const response = await fetch(`/api/flows/${id}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch flow');
  }

  return response.json();
}

export async function listFlows(category?: string): Promise<FlowDesign[]> {
  const url = category ? `/api/flows?category=${category}` : '/api/flows';
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch flows');
  }

  const data = await response.json();
  return data.flows || [];
}

export async function deleteFlow(id: string): Promise<void> {
  const response = await fetch(`/api/flows/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete flow');
  }
}
