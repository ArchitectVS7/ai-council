import { z } from 'zod'

// Base schemas
export const PersonaExportSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  role: z.string(),
  task: z.string(),
  systemPrompt: z.string().optional(),
  parameters: z.record(z.string(), z.any()).optional(),
})

export const FlowExportSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  description: z.string().optional(),
  stateFlow: z.array(z.number()),
  numRounds: z.number(),
})

export const MessageExportSchema = z.object({
  persona: z.string(),
  personaId: z.number(),
  content: z.string(),
  timestamp: z.string(),
  round: z.number(),
})

// Configuration export schema
export const ConfigurationExportSchema = z.object({
  version: z.literal('1.0'),
  type: z.literal('configuration'),
  personas: z.array(PersonaExportSchema),
  flows: z.array(FlowExportSchema),
  metadata: z.object({
    exportedAt: z.string(),
    exportedBy: z.string().optional(),
    name: z.string(),
    description: z.string().optional(),
  }),
})

// Debate export schema
export const DebateExportSchema = z.object({
  version: z.literal('1.0'),
  type: z.literal('debate'),
  debate: z.object({
    id: z.number().optional(),
    topic: z.string(),
    status: z.string(),
    startedAt: z.string(),
    completedAt: z.string().optional(),
  }),
  flow: FlowExportSchema.optional(),
  personas: z.array(PersonaExportSchema),
  messages: z.array(MessageExportSchema),
  analysis: z.object({
    summary: z.string(),
    bulletPoints: z.array(z.string()),
    keyInsights: z.string().optional(),
    consensusPoints: z.string().optional(),
    outstandingQuestions: z.string().optional(),
    recommendations: z.string().optional(),
  }).optional(),
  metadata: z.object({
    exportedAt: z.string(),
    exportedBy: z.string().optional(),
    duration: z.string().optional(),
    totalMessages: z.number(),
    totalRounds: z.number(),
  }),
})

// Union type for all export formats
export const ExportDataSchema = z.union([
  ConfigurationExportSchema,
  DebateExportSchema,
])

// Type exports
export type PersonaExport = z.infer<typeof PersonaExportSchema>
export type FlowExport = z.infer<typeof FlowExportSchema>
export type MessageExport = z.infer<typeof MessageExportSchema>
export type ConfigurationExport = z.infer<typeof ConfigurationExportSchema>
export type DebateExport = z.infer<typeof DebateExportSchema>
export type ExportData = z.infer<typeof ExportDataSchema>

// Utility functions
export function validateImportData(data: unknown): { success: true; data: ExportData } | { success: false; error: string } {
  try {
    const result = ExportDataSchema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return { success: false, error: `Invalid format: ${messages}` }
    }
    return { success: false, error: 'Unknown validation error' }
  }
}

export function createConfigurationExport({
  personas,
  flows,
  name,
  description,
  exportedBy
}: {
  personas: PersonaExport[]
  flows: FlowExport[]
  name: string
  description?: string
  exportedBy?: string
}): ConfigurationExport {
  return {
    version: '1.0',
    type: 'configuration',
    personas,
    flows,
    metadata: {
      exportedAt: new Date().toISOString(),
      exportedBy,
      name,
      description,
    },
  }
}

export function createDebateExport({
  debate,
  flow,
  personas,
  messages,
  analysis,
  exportedBy
}: {
  debate: {
    id?: number
    topic: string
    status: string
    startedAt: string
    completedAt?: string
  }
  flow?: FlowExport
  personas: PersonaExport[]
  messages: MessageExport[]
  analysis?: {
    summary: string
    bulletPoints: string[]
    keyInsights?: string
    consensusPoints?: string
    outstandingQuestions?: string
    recommendations?: string
  }
  exportedBy?: string
}): DebateExport {
  const startTime = new Date(debate.startedAt)
  const endTime = debate.completedAt ? new Date(debate.completedAt) : new Date()
  const duration = `${Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60)} minutes`
  
  const rounds = messages.length > 0 ? Math.max(...messages.map(m => m.round)) : 0

  return {
    version: '1.0',
    type: 'debate',
    debate,
    flow,
    personas,
    messages,
    analysis,
    metadata: {
      exportedAt: new Date().toISOString(),
      exportedBy,
      duration,
      totalMessages: messages.length,
      totalRounds: rounds,
    },
  }
}

export function downloadJSON(data: any, filename: string) {
  const jsonString = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

export function copyToClipboard(data: any): Promise<void> {
  const jsonString = JSON.stringify(data, null, 2)
  
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(jsonString)
  } else {
    // Fallback for older browsers
    return new Promise((resolve, reject) => {
      const textArea = document.createElement('textarea')
      textArea.value = jsonString
      textArea.style.position = 'absolute'
      textArea.style.left = '-999999px'
      
      document.body.prepend(textArea)
      textArea.select()
      
      try {
        document.execCommand('copy')
        resolve()
      } catch (error) {
        reject(error)
      } finally {
        textArea.remove()
      }
    })
  }
}