"use client"

import { useState, useEffect, useCallback } from 'react'
import PersonaList from './persona-list'
import PersonaForm from './persona-form'
import { ContextHelpButton } from '@/components/help/HelpTrigger'

// Types
type Persona = {
  id: number
  name: string
  role: string
  task: string
  systemPrompt?: string
  parameters?: Record<string, any>
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

type PersonaFormData = {
  id?: number
  name: string
  role: string
  task: string
  systemPrompt?: string
  parameters?: Record<string, any>
}

type PersonaEditorProps = {
  className?: string
}

export default function PersonaEditor({ className = '' }: PersonaEditorProps) {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // UI State
  const [showForm, setShowForm] = useState(false)
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch personas from API
  const fetchPersonas = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/personas')
      if (!response.ok) {
        throw new Error('Failed to fetch personas')
      }
      
      const data = await response.json()
      setPersonas(data.personas || [])
    } catch (err: any) {
      setError(err.message || 'Failed to fetch personas')
      console.error('Error fetching personas:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load personas on mount
  useEffect(() => {
    fetchPersonas()
  }, [fetchPersonas])

  // Create new persona
  const handleCreatePersona = async (formData: PersonaFormData) => {
    try {
      setIsSubmitting(true)
      setError(null)

      const response = await fetch('/api/personas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create persona')
      }

      const data = await response.json()
      setPersonas(prev => [data.persona, ...prev])
      setShowForm(false)
      setEditingPersona(null)
    } catch (err: any) {
      setError(err.message || 'Failed to create persona')
      throw err // Re-throw to let form handle it
    } finally {
      setIsSubmitting(false)
    }
  }

  // Update existing persona
  const handleUpdatePersona = async (formData: PersonaFormData) => {
    if (!formData.id) return

    try {
      setIsSubmitting(true)
      setError(null)

      const response = await fetch(`/api/agent-templates/${formData.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update persona')
      }

      const data = await response.json()
      setPersonas(prev => 
        prev.map(p => p.id === formData.id ? data.template : p)
      )
      setShowForm(false)
      setEditingPersona(null)
    } catch (err: any) {
      setError(err.message || 'Failed to update persona')
      throw err // Re-throw to let form handle it
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete persona
  const handleDeletePersona = async (personaId: number) => {
    try {
      setError(null)

      const response = await fetch(`/api/agent-templates/${personaId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete persona')
      }

      setPersonas(prev => prev.filter(p => p.id !== personaId))
    } catch (err: any) {
      setError(err.message || 'Failed to delete persona')
      console.error('Error deleting persona:', err)
    }
  }

  // Form submission handler
  const handleFormSubmit = async (formData: PersonaFormData) => {
    if (editingPersona) {
      await handleUpdatePersona({ ...formData, id: editingPersona.id })
    } else {
      await handleCreatePersona(formData)
    }
  }

  // UI Event Handlers
  const handleCreate = () => {
    setEditingPersona(null)
    setShowForm(true)
    setError(null)
  }

  const handleEdit = (persona: Persona) => {
    setEditingPersona(persona)
    setShowForm(true)
    setError(null)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingPersona(null)
    setError(null)
  }

  const handleRefresh = () => {
    fetchPersonas()
  }

  return (
    <div className={`space-y-6 ${className}`}>
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

      {/* Form Modal/Panel */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <PersonaForm
              persona={editingPersona ? {
                id: editingPersona.id,
                name: editingPersona.name,
                role: editingPersona.role,
                task: editingPersona.task,
                systemPrompt: editingPersona.systemPrompt,
                parameters: editingPersona.parameters
              } : undefined}
              onSubmit={handleFormSubmit}
              onCancel={handleCancel}
              isSubmitting={isSubmitting}
              title={editingPersona ? 'Edit Persona' : 'Create New Persona'}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div>
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Persona Editor</h1>
              <p className="mt-2 text-gray-600">
                Create and manage AI personas for your debates. Each persona represents a different perspective or role.
              </p>
            </div>
            <ContextHelpButton context="personas" />
          </div>
        </div>

        <PersonaList
          personas={personas}
          onEdit={handleEdit}
          onDelete={handleDeletePersona}
          onCreate={handleCreate}
          onRefresh={handleRefresh}
          isLoading={isLoading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>
    </div>
  )
}