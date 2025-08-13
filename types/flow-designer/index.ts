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

export interface PersonaTemplate {
  id: string;
  name: string;
  role: string;
  expertise: string;
  category: 'creative' | 'business' | 'research';
  systemPrompt?: string;
}

export interface FlowValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
