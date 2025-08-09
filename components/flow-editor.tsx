"use client"

import { useState, useEffect, useCallback } from 'react'
import FlowNode from './flow-node'

// Types
type Persona = {
  id: number
  name: string
  role: string
  task: string
}

type Flow = {
  id?: number
  name: string
  description?: string
  stateFlow: number[]
  numRounds: number
  isActive?: boolean
}

type FlowEditorProps = {
  className?: string
  onFlowSave?: (flow: Flow) => void
}

export default function FlowEditor({ className = '', onFlowSave }: FlowEditorProps) {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [flows, setFlows] = useState<Flow[]>([])
  const [currentFlow, setCurrentFlow] = useState<Flow>({
    name: '',
    description: '',
    stateFlow: [0], // Start with one step
    numRounds: 2
  })
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [selectedFlowId, setSelectedFlowId] = useState<number | null>(null)

  // Fetch personas and flows
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const [personasResponse, flowsResponse] = await Promise.all([
        fetch('/api/personas'),
        fetch('/api/flows')
      ])

      if (!personasResponse.ok || !flowsResponse.ok) {
        throw new Error('Failed to fetch data')
      }

      const [personasData, flowsData] = await Promise.all([
        personasResponse.json(),
        flowsResponse.json()
      ])

      setPersonas(personasData.personas || [])
      setFlows(flowsData.flows || [])
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data')
      console.error('Error fetching data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Calculate rounds for each step
  const calculateRounds = (stateFlow: number[], numRounds: number) => {
    const stepsPerRound = Math.ceil(stateFlow.length / numRounds)
    return stateFlow.map((_, index) => Math.floor(index / stepsPerRound) + 1)
  }

  // Validation
  const validateFlow = () => {
    const errors: Record<string, string> = {}
    
    if (!currentFlow.name.trim()) {
      errors.name = 'Flow name is required'
    }
    
    if (currentFlow.stateFlow.length === 0) {
      errors.stateFlow = 'At least one step is required'
    }
    
    if (currentFlow.stateFlow.some(personaId => personaId < 0)) {
      errors.steps = 'All steps must have a persona assigned'
    }
    
    if (currentFlow.numRounds < 1 || currentFlow.numRounds > 10) {
      errors.numRounds = 'Number of rounds must be between 1 and 10'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Flow operations
  const handlePersonaChange = (stepIndex: number, personaId: number | null) => {
    setCurrentFlow(prev => ({
      ...prev,
      stateFlow: prev.stateFlow.map((id, index) => 
        index === stepIndex ? (personaId || -1) : id
      )
    }))
  }

  const addStep = () => {
    setCurrentFlow(prev => ({
      ...prev,
      stateFlow: [...prev.stateFlow, -1] // -1 indicates unassigned
    }))
  }

  const removeStep = (stepIndex: number) => {
    if (currentFlow.stateFlow.length > 1) {
      setCurrentFlow(prev => ({
        ...prev,
        stateFlow: prev.stateFlow.filter((_, index) => index !== stepIndex)
      }))
    }
  }

  const duplicateStep = (stepIndex: number) => {
    const personaId = currentFlow.stateFlow[stepIndex]
    setCurrentFlow(prev => ({
      ...prev,
      stateFlow: [
        ...prev.stateFlow.slice(0, stepIndex + 1),
        personaId,
        ...prev.stateFlow.slice(stepIndex + 1)
      ]
    }))
  }

  // Load existing flow
  const loadFlow = (flowId: number) => {
    const flow = flows.find(f => f.id === flowId)
    if (flow) {
      setCurrentFlow({
        id: flow.id,
        name: flow.name,
        description: flow.description || '',
        stateFlow: flow.stateFlow.map(id => {
          // Convert persona IDs to indices for the editor
          const personaIndex = personas.findIndex(p => p.id === id)
          return personaIndex >= 0 ? id : -1
        }),
        numRounds: flow.numRounds
      })
      setSelectedFlowId(flowId)
    }
  }

  // Save flow
  const handleSave = async () => {
    if (!validateFlow()) {
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      const flowData = {
        ...currentFlow,
        stateFlow: currentFlow.stateFlow.filter(id => id > 0) // Remove unassigned steps
      }

      const response = await fetch('/api/flows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(flowData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save flow')
      }

      const data = await response.json()
      
      // Update flows list
      setFlows(prev => [data.flow, ...prev])
      
      // Notify parent if callback provided
      if (onFlowSave) {
        onFlowSave(data.flow)
      }

      // Reset form
      setCurrentFlow({
        name: '',
        description: '',
        stateFlow: [-1],
        numRounds: 2
      })
      setSelectedFlowId(null)
      
    } catch (err: any) {
      setError(err.message || 'Failed to save flow')
      console.error('Error saving flow:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // New flow
  const handleNewFlow = () => {
    setCurrentFlow({
      name: '',
      description: '',
      stateFlow: [-1],
      numRounds: 2
    })
    setSelectedFlowId(null)
    setValidationErrors({})
  }

  const rounds = calculateRounds(currentFlow.stateFlow, currentFlow.numRounds)

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <div className="inline-flex items-center">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading flow editor...
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Flow Editor</h1>
        <p className="mt-2 text-gray-600">
          Design the conversation flow by arranging personas in sequence. Each step represents one persona&apos;s turn.
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Flow Configuration Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Flow Configuration</h2>
            
            <div className="space-y-4">
              {/* Load Existing Flow */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Load Existing Flow
                </label>
                <select
                  value={selectedFlowId || ''}
                  onChange={(e) => e.target.value ? loadFlow(parseInt(e.target.value)) : handleNewFlow()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Create New Flow</option>
                  {flows.map((flow) => (
                    <option key={flow.id} value={flow.id}>
                      {flow.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Flow Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Flow Name *
                </label>
                <input
                  type="text"
                  value={currentFlow.name}
                  onChange={(e) => setCurrentFlow(prev => ({ ...prev, name: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Standard Debate Flow"
                />
                {validationErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={currentFlow.description}
                  onChange={(e) => setCurrentFlow(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe this flow's purpose..."
                />
              </div>

              {/* Number of Rounds */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Rounds *
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={currentFlow.numRounds}
                  onChange={(e) => setCurrentFlow(prev => ({ ...prev, numRounds: parseInt(e.target.value) || 1 }))}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.numRounds ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {validationErrors.numRounds && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.numRounds}</p>
                )}
              </div>

              {/* Flow Stats */}
              <div className="pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Total Steps</p>
                    <p className="font-medium text-gray-900">{currentFlow.stateFlow.length}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Valid Steps</p>
                    <p className="font-medium text-gray-900">
                      {currentFlow.stateFlow.filter(id => id > 0).length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-gray-200 space-y-3">
                <button
                  onClick={addStep}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                  disabled={isSubmitting}
                >
                  Add Step
                </button>
                
                <button
                  onClick={handleSave}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  disabled={isSubmitting || !currentFlow.name.trim()}
                >
                  {isSubmitting ? 'Saving...' : 'Save Flow'}
                </button>

                <button
                  onClick={handleNewFlow}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  disabled={isSubmitting}
                >
                  New Flow
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Visual Flow Editor */}
        <div className="lg:col-span-2">
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 min-h-96">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Flow Visualization</h2>
              <div className="text-sm text-gray-500">
                {currentFlow.stateFlow.length} step{currentFlow.stateFlow.length !== 1 ? 's' : ''} across {currentFlow.numRounds} round{currentFlow.numRounds !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Flow Steps */}
            <div className="space-y-8">
              {currentFlow.stateFlow.map((personaId, index) => (
                <div key={index} className="relative group">
                  <FlowNode
                    index={index}
                    personaId={personaId > 0 ? personaId : null}
                    personas={personas}
                    round={rounds[index]}
                    isFirst={index === 0}
                    isLast={index === currentFlow.stateFlow.length - 1}
                    onPersonaChange={handlePersonaChange}
                    onRemove={removeStep}
                    canRemove={currentFlow.stateFlow.length > 1}
                  />
                  
                  {/* Step Actions */}
                  <div className="absolute -right-16 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => duplicateStep(index)}
                        className="p-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                        title="Duplicate step"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {currentFlow.stateFlow.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No steps in this flow yet.</p>
                <button
                  onClick={addStep}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add First Step
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}