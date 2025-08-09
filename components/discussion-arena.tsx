"use client"

import { useCallback, useMemo, useState, useEffect } from 'react'
import { AppConfig, Message, buildPrompt, defaultConfig, nextStep } from '@/lib/stateMachine'
import { workflowTemplates, WorkflowTemplate } from '@/lib/creativeWorkflows'
import { QuickTooltip } from '@/components/help/TooltipHelper'
import { ContextHelpButton } from '@/components/help/HelpTrigger'

// Database-related types
type DatabaseWorkflowTemplate = {
  id: number
  name: string
  description?: string
  category: string
  nodes: any[]
  edges: any[]
}

type AgentTemplate = {
  id: number
  name: string
  category: string
  role: string
  task: string
  systemPrompt?: string
  parameters?: Record<string, any>
}

type WorkflowExecution = {
  id: number
  workflowId: number
  status: string
  input?: Record<string, any>
  output?: Record<string, any>
}

async function complete({ prompt, system }: { prompt: string; system: string }) {
  const res = await fetch('/api/complete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt, system }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'Completion failed')
  return (data?.text as string) || ''
}

async function fetchWorkflowTemplates(): Promise<DatabaseWorkflowTemplate[]> {
  const res = await fetch('/api/workflow-templates')
  if (!res.ok) throw new Error('Failed to fetch workflow templates')
  const data = await res.json()
  return data.templates || []
}

async function fetchAgentTemplates(): Promise<AgentTemplate[]> {
  const res = await fetch('/api/agent-templates')
  if (!res.ok) throw new Error('Failed to fetch agent templates')
  const data = await res.json()
  return data.templates || []
}

async function startWorkflowExecution(workflowId: number, input: Record<string, any>): Promise<WorkflowExecution> {
  const res = await fetch('/api/workflow-executions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ workflowId, input }),
  })
  if (!res.ok) throw new Error('Failed to start workflow execution')
  const data = await res.json()
  return data.execution
}

export default function DiscussionArena() {
  const [topic, setTopic] = useState('')
  const [cursor, setCursor] = useState(0)
  const [context, setContext] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [debug, setDebug] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  
  // Workflow selection state
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('default')
  const [useTemplate, setUseTemplate] = useState(false)
  
  // Database integration state
  const [databaseTemplates, setDatabaseTemplates] = useState<DatabaseWorkflowTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null)
  const [useDatabase, setUseDatabase] = useState(false)
  const [currentExecution, setCurrentExecution] = useState<WorkflowExecution | null>(null)

  // Generate config based on selected workflow
  const cfg = useMemo<AppConfig>(() => {
    if (useTemplate && selectedWorkflow && selectedWorkflow !== 'default') {
      const template = workflowTemplates[selectedWorkflow as keyof typeof workflowTemplates]
      if (template) {
        return template.createConfig()
      }
    }
    return defaultConfig()
  }, [selectedWorkflow, useTemplate])

  // Load workflow templates on component mount
  useEffect(() => {
    fetchWorkflowTemplates()
      .then(setDatabaseTemplates)
      .catch(e => setDebug(d => [...d, `Failed to load database templates: ${e.message}`]))
  }, [])

  const step = nextStep(cfg, cursor)

  const run = useCallback(async () => {
    const s = nextStep(cfg, cursor)
    if (!s) {
      setDebug((d) => [...d, 'Flow complete. Final analysis to be added in later phase.'])
      return
    }
    setBusy(true)
    try {
      const { system, user } = buildPrompt({ persona: s.persona, context, topic })
      setDebug((d) => [...d, `Step ${s.index + 1} (Round ${s.round}) → ${s.persona.name}`])
      const output = await complete({ prompt: user, system })
      const ts = new Date().toISOString()
      setMessages((m) => [
        ...m,
        { persona: s.persona.name, personaId: s.persona.id, content: output, timestamp: ts, round: s.round },
      ])
      setContext(output)
      setCursor((c) => c + 1)
    } catch (e: any) {
      setDebug((d) => [...d, `Error: ${e?.message || e}`])
    } finally {
      setBusy(false)
    }
  }, [cfg, cursor, context, topic])

  const onStart = useCallback(async () => {
    setMessages([])
    setContext('')
    setCursor(0)
    setCurrentExecution(null)
    
    const workflowInfo = useTemplate && selectedWorkflow !== 'default' 
      ? `workflow=${selectedWorkflow}` 
      : 'default'
    setDebug((d) => [...d, `Start: ${workflowInfo}, topic=${topic || '(empty)'}`])
    if (!topic.trim()) return
    
    if (useDatabase && selectedTemplate) {
      // Start database-backed workflow execution
      setBusy(true)
      try {
        setDebug((d) => [...d, `Starting workflow template ${selectedTemplate}`])
        const execution = await startWorkflowExecution(selectedTemplate, { topic })
        setCurrentExecution(execution)
        setDebug((d) => [...d, `Workflow execution ${execution.id} started (status: ${execution.status})`])
        // Note: In a full implementation, we'd need to poll for completion or use websockets
        // For now, we'll show that the execution started
      } catch (e: any) {
        setDebug((d) => [...d, `Error starting workflow: ${e?.message || e}`])
      } finally {
        setBusy(false)
      }
    } else {
      // Use legacy state machine
      await run()
    }
  }, [topic, useDatabase, selectedTemplate, useTemplate, selectedWorkflow, run])

  const onContinue = useCallback(async () => {
    await run()
  }, [run])

  return (
    <div className="w-full max-w-5xl">
      <section className="space-y-4">
        {/* Workflow Template Selection */}
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={useTemplate}
                onChange={(e) => setUseTemplate(e.target.checked)}
                disabled={busy}
              />
              Use Creative Workflow Template
            </label>
          </div>

          {useTemplate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Workflow</label>
              <select
                className="w-full rounded-md border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-gray-800"
                value={selectedWorkflow}
                onChange={(e) => setSelectedWorkflow(e.target.value)}
                disabled={busy}
              >
                <option value="default">Default Discussion (3 personas)</option>
                <option value="creative-project">Creative Project Development (5 personas)</option>
                <option value="product-strategy">Product Strategy Development (5 personas)</option>
                <option value="game-development">Game Development Ideation (6 personas)</option>
              </select>
              {selectedWorkflow !== 'default' && workflowTemplates[selectedWorkflow as keyof typeof workflowTemplates] && (
                <p className="text-sm text-gray-600 mt-1">
                  {workflowTemplates[selectedWorkflow as keyof typeof workflowTemplates].description}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Database Mode Selection */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={useDatabase}
              onChange={(e) => setUseDatabase(e.target.checked)}
              disabled={busy}
            />
            Use Database Mode (experimental)
          </label>
        </div>

        {/* Database Workflow Template Selection */}
        {useDatabase && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Database Workflow Template</label>
            <select
              className="w-full rounded-md border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-gray-800"
              value={selectedTemplate || ''}
              onChange={(e) => setSelectedTemplate(Number(e.target.value) || null)}
              disabled={busy}
            >
              <option value="">Select a database workflow template...</option>
              {databaseTemplates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name} - {template.description}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Project/Topic Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Project Brief</label>
            <ContextHelpButton context="discussions" size="sm" />
          </div>
          <QuickTooltip id="topic-input">
            <textarea
              className="w-full h-28 rounded-md border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-gray-800"
              placeholder="e.g., I want to create a mobile game about space wizards in cosmic combat with alien gods"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={busy}
            />
          </QuickTooltip>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <QuickTooltip id="start-button">
            <button
              onClick={onStart}
              className="rounded-md bg-black text-white px-4 py-2 text-sm hover:bg-gray-800 disabled:opacity-50"
              disabled={busy || (useDatabase && !selectedTemplate)}
            >
              {busy ? 'Working…' : 'Begin Session'}
            </button>
          </QuickTooltip>
          {!useDatabase && (
            <QuickTooltip id="continue-button">
              <button
                onClick={onContinue}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100 disabled:opacity-50"
                disabled={busy || !step || !topic.trim()}
              >
                Continue
              </button>
            </QuickTooltip>
          )}
        </div>
      </section>

      <section className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-lg border border-gray-200 p-4 bg-white/30 backdrop-blur-lg">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">
              Discussion Transcript 
              {useDatabase && (
                <span className="text-sm font-normal text-blue-600 ml-2">(Database Mode)</span>
              )}
            </h2>
            <ContextHelpButton context="discussions" size="sm" />
          </div>
          
          {/* Database execution status */}
          {useDatabase && currentExecution && (
            <div className="mb-4 p-3 bg-blue-50 rounded-md border border-blue-200">
              <div className="text-sm">
                <strong>Execution #{currentExecution.id}</strong>
                <span className="ml-2 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                  {currentExecution.status}
                </span>
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Topic: {currentExecution.input?.topic}
              </div>
            </div>
          )}
          
          {messages.length === 0 && !currentExecution ? (
            <p className="text-sm text-gray-600">No messages yet.</p>
          ) : (
            <div className="space-y-3">
              {messages.map((m, i) => (
                <div key={i} className="text-sm">
                  <div className="font-medium">{m.persona} <span className="text-gray-500">(Round {m.round})</span></div>
                  <pre className="whitespace-pre-wrap text-gray-800">{m.content}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-lg border border-gray-200 p-4 bg-white/30 backdrop-blur-lg">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Debug Log</h2>
            <ContextHelpButton context="discussions" size="sm" />
          </div>
          <QuickTooltip id="debug-log">
            <div className="text-xs text-gray-700 space-y-1 max-h-56 overflow-auto">
              {debug.length === 0 && (
                <p className="text-gray-500">No events yet.</p>
              )}
              {debug.map((line, i) => (
                <div key={i}>• {line}</div>
              ))}
            </div>
          </QuickTooltip>
        </div>
      </section>
    </div>
  )
}
