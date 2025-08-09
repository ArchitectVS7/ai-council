import { getDb } from './connection'
import { agentTemplates, workflowTemplates } from './schema'

export async function seedAgentTemplates() {
  const db = getDb()
  
  const templates = [
    // Ideation to PRD Templates
    {
      name: 'Product Manager',
      category: 'ideation',
      role: 'Product Manager',
      task: 'Define product vision, requirements, and business value. Focus on user needs and market fit.',
      systemPrompt: 'You are an experienced Product Manager. Analyze the concept and define clear product requirements, user stories, and business objectives.',
      parameters: { temperature: 0.7, maxTokens: 1000 }
    },
    {
      name: 'UX Researcher', 
      category: 'ideation',
      role: 'UX Researcher',
      task: 'Research user needs, pain points, and behavioral patterns. Provide user-centered insights.',
      systemPrompt: 'You are a UX Researcher. Focus on understanding user needs, creating personas, and identifying usability requirements.',
      parameters: { temperature: 0.6, maxTokens: 800 }
    },
    {
      name: 'Technical Lead',
      category: 'ideation', 
      role: 'Technical Lead',
      task: 'Assess technical feasibility, architecture requirements, and implementation complexity.',
      systemPrompt: 'You are a Technical Lead. Evaluate technical requirements, suggest architecture, and identify potential challenges.',
      parameters: { temperature: 0.5, maxTokens: 1200 }
    },
    {
      name: 'PRD Synthesizer',
      category: 'ideation',
      role: 'Senior Product Manager',
      task: 'Synthesize all inputs into a comprehensive Product Requirements Document.',
      systemPrompt: 'You are a Senior Product Manager. Create a well-structured PRD that incorporates all stakeholder inputs and requirements.',
      parameters: { temperature: 0.4, maxTokens: 2000 }
    },

    // Creative Writing Templates
    {
      name: 'Storyteller',
      category: 'creative',
      role: 'Creative Writer',
      task: 'Develop compelling narrative, characters, and plot structure.',
      systemPrompt: 'You are a creative storyteller. Focus on engaging narrative, character development, and compelling plot progression.',
      parameters: { temperature: 0.8, maxTokens: 1500 }
    },
    {
      name: 'Editor',
      category: 'creative',
      role: 'Editor',
      task: 'Review content for clarity, flow, grammar, and overall coherence.',
      systemPrompt: 'You are a professional editor. Improve clarity, fix grammar issues, and enhance overall readability.',
      parameters: { temperature: 0.3, maxTokens: 1000 }
    },
    {
      name: 'Fact Checker',
      category: 'creative',
      role: 'Research Analyst',
      task: 'Verify factual accuracy and suggest improvements for credibility.',
      systemPrompt: 'You are a meticulous fact checker. Identify potential factual issues and suggest improvements for accuracy.',
      parameters: { temperature: 0.2, maxTokens: 800 }
    },

    // Coding Templates
    {
      name: 'Software Architect',
      category: 'coding',
      role: 'Software Architect',
      task: 'Design system architecture, define patterns, and establish technical standards.',
      systemPrompt: 'You are a Software Architect. Focus on scalable design patterns, system architecture, and technical best practices.',
      parameters: { temperature: 0.3, maxTokens: 1500 }
    },
    {
      name: 'Developer',
      category: 'coding',
      role: 'Senior Developer', 
      task: 'Implement code following architecture guidelines and best practices.',
      systemPrompt: 'You are a Senior Developer. Write clean, efficient, and well-documented code following established patterns.',
      parameters: { temperature: 0.2, maxTokens: 2000 }
    },
    {
      name: 'Code Reviewer',
      category: 'coding',
      role: 'Senior Engineer',
      task: 'Review code for quality, security, performance, and maintainability.',
      systemPrompt: 'You are a Senior Engineer conducting code review. Focus on code quality, security, and best practices.',
      parameters: { temperature: 0.1, maxTokens: 1000 }
    },
    {
      name: 'QA Tester',
      category: 'coding',
      role: 'QA Engineer',
      task: 'Design test cases and identify potential bugs or edge cases.',
      systemPrompt: 'You are a QA Engineer. Create comprehensive test plans and identify potential issues.',
      parameters: { temperature: 0.4, maxTokens: 1200 }
    },

    // Research Templates
    {
      name: 'Researcher',
      category: 'research',
      role: 'Research Analyst',
      task: 'Gather comprehensive information and analyze data on the given topic.',
      systemPrompt: 'You are a Research Analyst. Conduct thorough research and present findings clearly.',
      parameters: { temperature: 0.5, maxTokens: 1500 }
    },
    {
      name: 'Data Analyst',
      category: 'research',
      role: 'Data Analyst',
      task: 'Analyze data patterns, trends, and derive actionable insights.',
      systemPrompt: 'You are a Data Analyst. Focus on data interpretation, pattern recognition, and statistical insights.',
      parameters: { temperature: 0.3, maxTokens: 1200 }
    },
    {
      name: 'Critic',
      category: 'research',
      role: 'Critical Analyst',
      task: 'Provide critical analysis, identify weaknesses, and suggest improvements.',
      systemPrompt: 'You are a Critical Analyst. Challenge assumptions, identify gaps, and provide constructive criticism.',
      parameters: { temperature: 0.4, maxTokens: 1000 }
    }
  ]

  await db.insert(agentTemplates).values(templates).onConflictDoNothing()
  console.log('Agent templates seeded successfully')
}

export async function seedWorkflowTemplates() {
  const db = getDb()
  
  const workflows = [
    {
      name: 'Concept to PRD',
      description: 'Transform a product concept into a comprehensive Product Requirements Document',
      category: 'ideation',
      nodes: [
        { id: 'input', type: 'input', position: { x: 0, y: 100 }, data: { label: 'Product Concept' } },
        { id: 'pm', type: 'agent', position: { x: 200, y: 50 }, data: { label: 'Product Manager', templateId: 1 } },
        { id: 'ux', type: 'agent', position: { x: 200, y: 150 }, data: { label: 'UX Researcher', templateId: 2 } },
        { id: 'tech', type: 'agent', position: { x: 400, y: 100 }, data: { label: 'Technical Lead', templateId: 3 } },
        { id: 'synthesizer', type: 'agent', position: { x: 600, y: 100 }, data: { label: 'PRD Synthesizer', templateId: 4 } },
        { id: 'output', type: 'output', position: { x: 800, y: 100 }, data: { label: 'Final PRD' } }
      ],
      edges: [
        { id: 'input-pm', source: 'input', target: 'pm' },
        { id: 'input-ux', source: 'input', target: 'ux' },
        { id: 'pm-tech', source: 'pm', target: 'tech' },
        { id: 'ux-tech', source: 'ux', target: 'tech' },
        { id: 'tech-synthesizer', source: 'tech', target: 'synthesizer' },
        { id: 'synthesizer-output', source: 'synthesizer', target: 'output' }
      ]
    },
    {
      name: 'Creative Writing Pipeline',
      description: 'Collaborative creative writing with editing and fact-checking',
      category: 'creative',
      nodes: [
        { id: 'input', type: 'input', position: { x: 0, y: 100 }, data: { label: 'Writing Brief' } },
        { id: 'writer', type: 'agent', position: { x: 200, y: 100 }, data: { label: 'Storyteller', templateId: 5 } },
        { id: 'editor', type: 'agent', position: { x: 400, y: 100 }, data: { label: 'Editor', templateId: 6 } },
        { id: 'factchecker', type: 'agent', position: { x: 600, y: 100 }, data: { label: 'Fact Checker', templateId: 7 } },
        { id: 'output', type: 'output', position: { x: 800, y: 100 }, data: { label: 'Final Content' } }
      ],
      edges: [
        { id: 'input-writer', source: 'input', target: 'writer' },
        { id: 'writer-editor', source: 'writer', target: 'editor' },
        { id: 'editor-factchecker', source: 'editor', target: 'factchecker' },
        { id: 'factchecker-output', source: 'factchecker', target: 'output' }
      ]
    },
    {
      name: 'Code Development Flow',
      description: 'Full software development cycle from architecture to testing',
      category: 'coding',
      nodes: [
        { id: 'input', type: 'input', position: { x: 0, y: 150 }, data: { label: 'Requirements' } },
        { id: 'architect', type: 'agent', position: { x: 200, y: 150 }, data: { label: 'Software Architect', templateId: 8 } },
        { id: 'developer', type: 'agent', position: { x: 400, y: 150 }, data: { label: 'Developer', templateId: 9 } },
        { id: 'reviewer', type: 'agent', position: { x: 600, y: 100 }, data: { label: 'Code Reviewer', templateId: 10 } },
        { id: 'tester', type: 'agent', position: { x: 600, y: 200 }, data: { label: 'QA Tester', templateId: 11 } },
        { id: 'output', type: 'output', position: { x: 800, y: 150 }, data: { label: 'Tested Code' } }
      ],
      edges: [
        { id: 'input-architect', source: 'input', target: 'architect' },
        { id: 'architect-developer', source: 'architect', target: 'developer' },
        { id: 'developer-reviewer', source: 'developer', target: 'reviewer' },
        { id: 'developer-tester', source: 'developer', target: 'tester' },
        { id: 'reviewer-output', source: 'reviewer', target: 'output' },
        { id: 'tester-output', source: 'tester', target: 'output' }
      ]
    }
  ]

  await db.insert(workflowTemplates).values(workflows).onConflictDoNothing()
  console.log('Workflow templates seeded successfully')
}

export async function seedDatabase() {
  await seedAgentTemplates()
  await seedWorkflowTemplates()
}