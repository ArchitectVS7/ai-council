import { pgTable, text, integer, timestamp, jsonb, serial, boolean } from 'drizzle-orm/pg-core'

// Agent templates - predefined roles and configurations
export const agentTemplates = pgTable('agent_templates', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(), // 'ideation', 'creative', 'coding', 'research'
  role: text('role').notNull(),
  task: text('task').notNull(),
  systemPrompt: text('system_prompt'),
  parameters: jsonb('parameters').$type<Record<string, any>>().default({}),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Workflow templates - predefined multi-agent workflows
export const workflowTemplates = pgTable('workflow_templates', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category').notNull(),
  nodes: jsonb('nodes').$type<any[]>().notNull(),
  edges: jsonb('edges').$type<any[]>().notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// User workflows - custom workflows created by users
export const workflows = pgTable('workflows', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  nodes: jsonb('nodes').$type<any[]>().notNull(),
  edges: jsonb('edges').$type<any[]>().notNull(),
  templateId: integer('template_id').references(() => workflowTemplates.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Workflow executions - instances of workflow runs
export const workflowExecutions = pgTable('workflow_executions', {
  id: serial('id').primaryKey(),
  workflowId: integer('workflow_id').references(() => workflows.id).notNull(),
  status: text('status').notNull(), // 'pending', 'running', 'completed', 'failed'
  input: jsonb('input').$type<Record<string, any>>(),
  output: jsonb('output').$type<Record<string, any>>(),
  executionData: jsonb('execution_data').$type<Record<string, any>>().default({}),
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Agent executions - individual agent runs within a workflow
export const agentExecutions = pgTable('agent_executions', {
  id: serial('id').primaryKey(),
  workflowExecutionId: integer('workflow_execution_id').references(() => workflowExecutions.id).notNull(),
  agentId: text('agent_id').notNull(), // corresponds to node id in workflow
  templateId: integer('template_id').references(() => agentTemplates.id),
  status: text('status').notNull(),
  input: jsonb('input').$type<Record<string, any>>(),
  output: jsonb('output').$type<Record<string, any>>(),
  prompt: text('prompt'),
  response: text('response'),
  executionTime: integer('execution_time_ms'),
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Debates - PRD-compliant debate sessions
export const debates = pgTable('debates', {
  id: serial('id').primaryKey(),
  topic: text('topic').notNull(),
  workflowId: integer('workflow_id').references(() => workflows.id),
  status: text('status').notNull().default('active'), // 'active', 'completed', 'paused'
  currentStep: integer('current_step').default(0),
  currentRound: integer('current_round').default(1),
  context: text('context').default(''), // Current context for next persona
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Messages - PRD-compliant debate messages
export const debateMessages = pgTable('debate_messages', {
  id: serial('id').primaryKey(),
  debateId: integer('debate_id').references(() => debates.id).notNull(),
  personaName: text('persona_name').notNull(),
  personaId: integer('persona_id').notNull(),
  round: integer('round').notNull(),
  content: text('content').notNull(),
  timestamp: timestamp('timestamp').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
})

// Summaries - PRD-compliant final analysis storage
export const debateSummaries = pgTable('debate_summaries', {
  id: serial('id').primaryKey(),
  debateId: integer('debate_id').references(() => debates.id).notNull(),
  summary: text('summary').notNull(),
  bulletPoints: jsonb('bullet_points').$type<string[]>().default([]),
  keyInsights: text('key_insights'),
  consensusPoints: text('consensus_points'),
  outstandingQuestions: text('outstanding_questions'),
  recommendations: text('recommendations'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Legacy personas table to match PRD naming
export const personas = pgTable('personas', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  task: text('task').notNull(),
  systemPrompt: text('system_prompt'),
  parameters: jsonb('parameters').$type<Record<string, any>>().default({}),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Flows table to match PRD naming  
export const flows = pgTable('flows', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  stateFlow: jsonb('state_flow').$type<number[]>().notNull(),
  numRounds: integer('num_rounds').notNull().default(2),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export type AgentTemplate = typeof agentTemplates.$inferSelect
export type WorkflowTemplate = typeof workflowTemplates.$inferSelect
export type Workflow = typeof workflows.$inferSelect
export type WorkflowExecution = typeof workflowExecutions.$inferSelect
export type AgentExecution = typeof agentExecutions.$inferSelect
export type Debate = typeof debates.$inferSelect
export type DebateMessage = typeof debateMessages.$inferSelect
export type DebateSummary = typeof debateSummaries.$inferSelect
export type Persona = typeof personas.$inferSelect
export type Flow = typeof flows.$inferSelect