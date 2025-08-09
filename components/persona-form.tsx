"use client"

import { useState, useEffect } from 'react'
import { z } from 'zod'

// Types
type PersonaFormData = {
  id?: number
  name: string
  role: string
  task: string
  systemPrompt?: string
  parameters?: Record<string, any>
}

type PersonaFormProps = {
  persona?: PersonaFormData
  onSubmit: (data: PersonaFormData) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
  title?: string
}

// Validation schema
const personaSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  role: z.string().min(1, 'Role is required').max(200, 'Role must be 200 characters or less'),
  task: z.string().min(1, 'Task is required').max(500, 'Task must be 500 characters or less'),
  systemPrompt: z.string().optional(),
  parameters: z.record(z.string(), z.any()).optional(),
})

export default function PersonaForm({ 
  persona, 
  onSubmit, 
  onCancel, 
  isSubmitting = false,
  title 
}: PersonaFormProps) {
  const [formData, setFormData] = useState<PersonaFormData>({
    name: '',
    role: '',
    task: '',
    systemPrompt: '',
    parameters: {}
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [parameterKey, setParameterKey] = useState('')
  const [parameterValue, setParameterValue] = useState('')

  // Initialize form with persona data
  useEffect(() => {
    if (persona) {
      setFormData({
        id: persona.id,
        name: persona.name || '',
        role: persona.role || '',
        task: persona.task || '',
        systemPrompt: persona.systemPrompt || '',
        parameters: persona.parameters || {}
      })
    }
  }, [persona])

  const validateForm = () => {
    try {
      personaSchema.parse(formData)
      setErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {}
        error.issues.forEach((err) => {
          const path = err.path[0] as string
          newErrors[path] = err.message
        })
        setErrors(newErrors)
      }
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Error submitting persona:', error)
    }
  }

  const handleInputChange = (field: keyof PersonaFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const addParameter = () => {
    if (parameterKey.trim() && parameterValue.trim()) {
      setFormData(prev => ({
        ...prev,
        parameters: {
          ...prev.parameters,
          [parameterKey.trim()]: parameterValue.trim()
        }
      }))
      setParameterKey('')
      setParameterValue('')
    }
  }

  const removeParameter = (key: string) => {
    setFormData(prev => ({
      ...prev,
      parameters: Object.fromEntries(
        Object.entries(prev.parameters || {}).filter(([k]) => k !== key)
      )
    }))
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {title || (persona ? 'Edit Persona' : 'Create New Persona')}
        </h2>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
          disabled={isSubmitting}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name Field */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Name *
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., Empathy Advocate"
            disabled={isSubmitting}
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>

        {/* Role Field */}
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
            Role *
          </label>
          <input
            type="text"
            id="role"
            value={formData.role}
            onChange={(e) => handleInputChange('role', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.role ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., Empathy Advocate"
            disabled={isSubmitting}
          />
          {errors.role && <p className="mt-1 text-sm text-red-600">{errors.role}</p>}
        </div>

        {/* Task Field */}
        <div>
          <label htmlFor="task" className="block text-sm font-medium text-gray-700 mb-2">
            Task *
          </label>
          <textarea
            id="task"
            value={formData.task}
            onChange={(e) => handleInputChange('task', e.target.value)}
            rows={3}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.task ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., Consider human impact, ethics, and inclusion"
            disabled={isSubmitting}
          />
          {errors.task && <p className="mt-1 text-sm text-red-600">{errors.task}</p>}
        </div>

        {/* System Prompt Field */}
        <div>
          <label htmlFor="systemPrompt" className="block text-sm font-medium text-gray-700 mb-2">
            System Prompt (Optional)
          </label>
          <textarea
            id="systemPrompt"
            value={formData.systemPrompt}
            onChange={(e) => handleInputChange('systemPrompt', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Optional detailed system prompt for this persona..."
            disabled={isSubmitting}
          />
        </div>

        {/* Parameters Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Parameters (Optional)
          </label>
          
          {/* Existing Parameters */}
          {Object.entries(formData.parameters || {}).length > 0 && (
            <div className="mb-4 space-y-2">
              {Object.entries(formData.parameters || {}).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md">
                  <span className="text-sm">
                    <span className="font-medium">{key}:</span> {String(value)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeParameter(key)}
                    className="text-red-500 hover:text-red-700"
                    disabled={isSubmitting}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add New Parameter */}
          <div className="flex gap-2">
            <input
              type="text"
              value={parameterKey}
              onChange={(e) => setParameterKey(e.target.value)}
              placeholder="Parameter name"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            />
            <input
              type="text"
              value={parameterValue}
              onChange={(e) => setParameterValue(e.target.value)}
              placeholder="Parameter value"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={addParameter}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
              disabled={isSubmitting || !parameterKey.trim() || !parameterValue.trim()}
            >
              Add
            </button>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : (persona ? 'Update Persona' : 'Create Persona')}
          </button>
        </div>
      </form>
    </div>
  )
}