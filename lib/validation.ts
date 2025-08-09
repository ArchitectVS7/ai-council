import { z } from 'zod'

// Input validation schemas
export const completionRequestSchema = z.object({
  prompt: z.string().min(1).max(10000),
  system: z.string().optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(4000).optional(),
})

export const workflowNodeSchema = z.object({
  id: z.string(),
  type: z.enum(['input', 'output', 'agent']),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: z.object({
    label: z.string(),
    templateId: z.number().optional(),
  }),
})

export const workflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
})

export const workflowExecutionSchema = z.object({
  workflowId: z.number(),
  input: z.record(z.string(), z.any()).optional(),
})

export const agentTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.enum(['ideation', 'creative', 'coding', 'research']),
  role: z.string().min(1).max(200),
  task: z.string().min(1).max(500),
  systemPrompt: z.string().optional(),
  parameters: z.record(z.string(), z.any()).optional(),
})

// Sanitization utilities
export function sanitizeInput(input: string): string {
  // Remove potentially dangerous characters and sequences
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, 10000) // Limit length
}

export function validateAndSanitizePrompt(prompt: string): string {
  const sanitized = sanitizeInput(prompt)
  
  if (!sanitized || sanitized.length === 0) {
    throw new Error('Prompt cannot be empty after sanitization')
  }
  
  return sanitized
}

// CSRF token validation (for future use)
export function generateCSRFToken(): string {
  return crypto.randomUUID()
}

export function validateCSRFToken(token: string, expected: string): boolean {
  return token === expected
}