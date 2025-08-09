"use client"

import { useState, useEffect } from 'react'

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

type PersonaListProps = {
  personas: Persona[]
  onEdit: (persona: Persona) => void
  onDelete: (personaId: number) => void
  onCreate: () => void
  onRefresh: () => void
  isLoading?: boolean
  searchQuery?: string
  onSearchChange?: (query: string) => void
}

export default function PersonaList({
  personas,
  onEdit,
  onDelete,
  onCreate,
  onRefresh,
  isLoading = false,
  searchQuery = '',
  onSearchChange
}: PersonaListProps) {
  const [filteredPersonas, setFilteredPersonas] = useState<Persona[]>([])
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  // Filter personas based on search query
  useEffect(() => {
    if (!searchQuery) {
      setFilteredPersonas(personas)
    } else {
      const filtered = personas.filter(persona =>
        persona.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        persona.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        persona.task.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredPersonas(filtered)
    }
  }, [personas, searchQuery])

  const handleDelete = (personaId: number) => {
    if (deleteConfirm === personaId) {
      onDelete(personaId)
      setDeleteConfirm(null)
    } else {
      setDeleteConfirm(personaId)
      // Auto-clear confirmation after 3 seconds
      setTimeout(() => setDeleteConfirm(null), 3000)
    }
  }

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + '...'
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Personas ({filteredPersonas.length})
          </h2>
          <div className="flex gap-2">
            <button
              onClick={onRefresh}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
              disabled={isLoading}
              title="Refresh personas"
            >
              <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={onCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={isLoading}
            >
              Create New
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {onSearchChange && (
          <div className="mt-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search personas..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="px-6 py-8 text-center">
          <div className="inline-flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Loading personas...
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredPersonas.length === 0 && (
        <div className="px-6 py-8 text-center">
          <div className="text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14m20 0v-4a9.971 9.971 0 00-.712-3.714M14 40H4v-4a6 6 0 0110.713-3.714M14 40v-4c0-1.313.253-2.566.713-3.714m0 0A9.971 9.971 0 0124 24c4.21 0 7.86 2.602 9.288 6.286" />
            </svg>
            <p className="mt-2 text-sm font-medium text-gray-900">
              {searchQuery ? 'No personas found' : 'No personas yet'}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery 
                ? 'Try adjusting your search terms'
                : 'Get started by creating your first persona'
              }
            </p>
            {!searchQuery && (
              <button
                onClick={onCreate}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create Persona
              </button>
            )}
          </div>
        </div>
      )}

      {/* Personas Grid */}
      {!isLoading && filteredPersonas.length > 0 && (
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPersonas.map((persona) => (
              <div
                key={persona.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                {/* Persona Header */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900 truncate">{persona.name}</h3>
                    <p className="text-sm text-gray-500 truncate">{persona.role}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onEdit(persona)}
                      className="p-1 text-gray-400 hover:text-blue-600 rounded"
                      title="Edit persona"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(persona.id)}
                      className={`p-1 rounded ${
                        deleteConfirm === persona.id
                          ? 'text-red-600 bg-red-100'
                          : 'text-gray-400 hover:text-red-600'
                      }`}
                      title={deleteConfirm === persona.id ? 'Click again to confirm delete' : 'Delete persona'}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Persona Content */}
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Task</p>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {truncateText(persona.task, 120)}
                    </p>
                  </div>

                  {persona.systemPrompt && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">System Prompt</p>
                      <p className="text-sm text-gray-700 line-clamp-1">
                        {truncateText(persona.systemPrompt, 80)}
                      </p>
                    </div>
                  )}

                  {persona.parameters && Object.keys(persona.parameters).length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Parameters</p>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(persona.parameters).map(([key, value]) => (
                          <span
                            key={key}
                            className="inline-block px-2 py-1 bg-gray-100 text-xs rounded text-gray-600"
                          >
                            {key}: {String(value)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Delete Confirmation */}
                {deleteConfirm === persona.id && (
                  <div className="mt-3 p-2 bg-red-50 rounded text-sm text-red-800">
                    Click delete again to confirm removal
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}