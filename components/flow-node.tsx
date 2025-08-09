"use client"

import { useState } from 'react'

// Types
type Persona = {
  id: number
  name: string
  role: string
  task: string
}

type FlowNodeProps = {
  index: number
  personaId: number | null
  personas: Persona[]
  round: number
  isFirst?: boolean
  isLast?: boolean
  onPersonaChange: (index: number, personaId: number | null) => void
  onRemove?: (index: number) => void
  canRemove?: boolean
  isDragging?: boolean
  dragHandleProps?: any
}

export default function FlowNode({
  index,
  personaId,
  personas,
  round,
  isFirst = false,
  isLast = false,
  onPersonaChange,
  onRemove,
  canRemove = false,
  isDragging = false,
  dragHandleProps
}: FlowNodeProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  const selectedPersona = personas.find(p => p.id === personaId)
  
  const handlePersonaSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newPersonaId = event.target.value ? parseInt(event.target.value) : null
    onPersonaChange(index, newPersonaId)
  }

  const handleRemove = () => {
    if (onRemove && canRemove) {
      onRemove(index)
    }
  }

  return (
    <div className="relative">
      {/* Connection Line (before node) */}
      {!isFirst && (
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
          <div className="w-0.5 h-6 bg-gray-300"></div>
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-gray-300 rounded-full transform rotate-45"></div>
        </div>
      )}

      {/* Flow Node */}
      <div
        className={`relative bg-white border-2 rounded-lg p-4 transition-all duration-200 ${
          isDragging 
            ? 'border-blue-400 shadow-lg transform scale-105' 
            : isHovered 
              ? 'border-blue-300 shadow-md' 
              : selectedPersona 
                ? 'border-green-300 shadow-sm' 
                : 'border-gray-300'
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Drag Handle */}
        {dragHandleProps && (
          <div
            {...dragHandleProps}
            className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-4 h-8 bg-gray-200 rounded cursor-grab active:cursor-grabbing flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            <div className="w-1 h-1 bg-gray-400 rounded-full ml-0.5"></div>
          </div>
        )}

        {/* Step Number */}
        <div className="absolute -top-3 -left-3 bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">
          {index + 1}
        </div>

        {/* Round Badge */}
        <div className="absolute -top-3 -right-3 bg-purple-600 text-white rounded-full px-2 py-0.5 text-xs font-medium">
          R{round}
        </div>

        {/* Remove Button */}
        {canRemove && onRemove && (
          <button
            onClick={handleRemove}
            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-xs"
            title="Remove step"
          >
            ×
          </button>
        )}

        {/* Node Content */}
        <div className="space-y-3">
          {/* Persona Selector */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">
              Step {index + 1} Persona
            </label>
            <select
              value={personaId || ''}
              onChange={handlePersonaSelect}
              className={`w-full p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                !personaId ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            >
              <option value="">Select a persona...</option>
              {personas.map((persona) => (
                <option key={persona.id} value={persona.id}>
                  {persona.name}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Persona Details */}
          {selectedPersona && (
            <div className="bg-gray-50 rounded-md p-3 space-y-2">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Role</p>
                <p className="text-sm font-medium text-gray-900">{selectedPersona.role}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Task</p>
                <p className="text-sm text-gray-700 line-clamp-2">{selectedPersona.task}</p>
              </div>
            </div>
          )}

          {/* Validation Error */}
          {!personaId && (
            <div className="text-xs text-red-600 flex items-center">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Persona required
            </div>
          )}
        </div>
      </div>

      {/* Connection Line (after node) */}
      {!isLast && (
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
          <div className="w-0.5 h-6 bg-gray-300"></div>
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-gray-300 rounded-full transform rotate-45"></div>
        </div>
      )}
    </div>
  )
}