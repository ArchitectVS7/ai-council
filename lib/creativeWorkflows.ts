import { PersonaConfig, AppConfig } from './stateMachine'

// Creative Project Ideation Workflow
export function createCreativeProjectWorkflow(): AppConfig {
  const personas: PersonaConfig[] = [
    { 
      id: 1, 
      name: 'Creative Visionary', 
      role: 'Creative concept developer and storyteller', 
      task: 'Generate imaginative concepts, explore creative possibilities, and develop engaging narratives that capture audience interest. Focus on the creative core and artistic vision of the project.' 
    },
    { 
      id: 2, 
      name: 'Technical Specialist', 
      role: 'Technical feasibility and implementation expert', 
      task: 'Assess technical requirements, identify implementation approaches, and ensure creative visions are technically achievable. Consider platforms, tools, and technical constraints.' 
    },
    { 
      id: 3, 
      name: 'Market Analyst', 
      role: 'Market research and commercial viability expert', 
      task: 'Analyze market potential, identify target audiences, and assess commercial feasibility and competitive landscape. Consider market trends and monetization strategies.' 
    },
    { 
      id: 4, 
      name: 'User Experience Designer', 
      role: 'User-centered design and experience expert', 
      task: 'Focus on user needs, interaction design, and ensuring the creative concept provides excellent user experience. Consider usability, accessibility, and user journey.' 
    },
    { 
      id: 5, 
      name: 'Project Synthesizer', 
      role: 'Integration and project coordination expert', 
      task: 'Synthesize insights from all perspectives, identify key decisions, and create actionable development roadmaps. Extract key insights and next steps.' 
    }
  ]
  
  // Creative Visionary → Technical Specialist → Market Analyst → UX Designer → Project Synthesizer → [Refinement Round] → Project Synthesizer
  const stateFlow = [1, 2, 3, 4, 5, 1, 2, 3, 4, 5].map((pid) => personas.findIndex((p) => p.id === pid))
  
  return { personas, stateFlow, numRounds: 2 }
}

// Product Strategy Development Workflow
export function createProductStrategyWorkflow(): AppConfig {
  const personas: PersonaConfig[] = [
    { 
      id: 1, 
      name: 'Market Strategist', 
      role: 'Market positioning and strategy expert', 
      task: 'Analyze market opportunities, competitive positioning, and develop strategic market entry approaches. Focus on market dynamics and strategic positioning.' 
    },
    { 
      id: 2, 
      name: 'Customer Advocate', 
      role: 'Customer needs and experience specialist', 
      task: 'Champion customer perspectives, identify pain points, and ensure solutions truly serve user needs. Focus on customer research and user-centered insights.' 
    },
    { 
      id: 3, 
      name: 'Business Analyst', 
      role: 'Financial and business model expert', 
      task: 'Evaluate business viability, revenue models, cost structures, and financial projections. Focus on business metrics and financial sustainability.' 
    },
    { 
      id: 4, 
      name: 'Innovation Catalyst', 
      role: 'Innovation and differentiation expert', 
      task: 'Identify unique value propositions, innovative features, and competitive differentiators. Focus on breakthrough opportunities and novel approaches.' 
    },
    { 
      id: 5, 
      name: 'Implementation Planner', 
      role: 'Execution and roadmap specialist', 
      task: 'Transform strategy into actionable plans, timelines, and resource requirements. Extract strategic insights and create implementation roadmaps.' 
    }
  ]
  
  // Market Strategist → Customer Advocate → Business Analyst → Innovation Catalyst → Implementation Planner → [Strategic Review] → Implementation Planner
  const stateFlow = [1, 2, 3, 4, 5, 1, 2, 3, 4, 5].map((pid) => personas.findIndex((p) => p.id === pid))
  
  return { personas, stateFlow, numRounds: 2 }
}

// Game Development Ideation Workflow (Space Wizards Example)
export function createGameDevWorkflow(): AppConfig {
  const personas: PersonaConfig[] = [
    { 
      id: 1, 
      name: 'Narrative Designer', 
      role: 'Storytelling and lore expert', 
      task: 'Develop compelling narratives, character arcs, and world-building elements. Create engaging stories that drive player investment and emotional connection.' 
    },
    { 
      id: 2, 
      name: 'Lovecraft Fiction Specialist', 
      role: 'Cosmic horror and weird fiction expert', 
      task: 'Provide expertise on Lovecraftian themes, cosmic horror elements, and otherworldly atmosphere. Ensure authentic cosmic horror aesthetics and themes.' 
    },
    { 
      id: 3, 
      name: 'Astrophysics Consultant', 
      role: 'Space science and cosmic phenomena expert', 
      task: 'Ensure scientific accuracy in space-based elements, cosmic phenomena, and astronomical concepts. Ground fantastical elements in real science where possible.' 
    },
    { 
      id: 4, 
      name: 'Game Design Strategist', 
      role: 'Game mechanics and player experience expert', 
      task: 'Design engaging gameplay mechanics, progression systems, and player interaction models. Focus on fun, balance, and player retention.' 
    },
    { 
      id: 5, 
      name: 'Market & Monetization Analyst', 
      role: 'Mobile gaming market and revenue expert', 
      task: 'Analyze mobile gaming market trends, monetization strategies, and competitive positioning. Focus on commercial viability and market fit.' 
    },
    { 
      id: 6, 
      name: 'Creative Director', 
      role: 'Vision integration and project synthesis expert', 
      task: 'Synthesize all creative, technical, and business insights into a cohesive game concept. Create actionable development briefs and maintain creative vision coherence.' 
    }
  ]
  
  // Narrative Designer → Lovecraft Specialist → Astrophysics Consultant → Game Design Strategist → Market Analyst → Creative Director
  const stateFlow = [1, 2, 3, 4, 5, 6, 1, 4, 5, 6].map((pid) => personas.findIndex((p) => p.id === pid))
  
  return { personas, stateFlow, numRounds: 2 }
}

// Workflow templates registry
export const workflowTemplates = {
  'creative-project': {
    name: 'Creative Project Development',
    description: 'Comprehensive creative project ideation with technical feasibility, market analysis, and user experience considerations',
    category: 'Creative',
    createConfig: createCreativeProjectWorkflow
  },
  'product-strategy': {
    name: 'Product Strategy Development', 
    description: 'Strategic business planning with market analysis, customer focus, financial modeling, and implementation planning',
    category: 'Business',
    createConfig: createProductStrategyWorkflow
  },
  'game-development': {
    name: 'Game Development Ideation',
    description: 'Specialized workflow for game concept development combining narrative design, domain expertise, and market analysis',
    category: 'Creative',
    createConfig: createGameDevWorkflow
  }
}

export type WorkflowTemplate = typeof workflowTemplates[keyof typeof workflowTemplates]