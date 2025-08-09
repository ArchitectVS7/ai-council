"use client"

import { DashboardLayout } from '@/components/layout/AppLayout'
import PersonaEditor from '@/components/persona-editor'
import { useState } from 'react'

export default function PersonasPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'editor'>('grid')

  // Mock persona data - in real app this would come from database/context
  const personas = [
    {
      id: 1,
      name: 'Creative Visionary',
      role: 'Creative concept developer and storyteller',
      task: 'Generate imaginative concepts and explore creative possibilities',
      category: 'Creative',
      isCustom: false
    },
    {
      id: 2,
      name: 'Technical Specialist',
      role: 'Technical feasibility and implementation expert',
      task: 'Assess technical requirements and identify implementation approaches',
      category: 'Technical',
      isCustom: false
    },
    {
      id: 3,
      name: 'Market Analyst',
      role: 'Market research and commercial viability expert',
      task: 'Analyze market potential and assess commercial feasibility',
      category: 'Business',
      isCustom: false
    },
    {
      id: 4,
      name: 'Empathy Advocate',
      role: 'Human impact and ethics specialist',
      task: 'Consider human implications and ethical considerations',
      category: 'Perspective',
      isCustom: false
    },
    {
      id: 5,
      name: 'My Custom Expert',
      role: 'Custom domain specialist',
      task: 'Specialized analysis for my specific use case',
      category: 'Custom',
      isCustom: true
    }
  ]

  const categories = ['All', 'Creative', 'Technical', 'Business', 'Perspective', 'Custom']
  const [selectedCategory, setSelectedCategory] = useState('All')

  const filteredPersonas = selectedCategory === 'All' 
    ? personas 
    : personas.filter(p => p.category === selectedCategory)

  if (viewMode === 'editor') {
    return (
      <DashboardLayout currentPage="personas">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Persona Editor</h1>
              <p className="mt-2 text-gray-600">Create and customize AI expert personas</p>
            </div>
            <button
              onClick={() => setViewMode('grid')}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors"
            >
              ← Back to Library
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <PersonaEditor />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout currentPage="personas">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Persona Library</h1>
            <p className="mt-2 text-gray-600">
              Manage your AI expert personas. Create custom experts or use pre-built personas 
              for different types of discussions and analyses.
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setViewMode('editor')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              + Create New Persona
            </button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category} ({category === 'All' ? personas.length : personas.filter(p => p.category === category).length})
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search personas by name, role, or expertise..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Personas Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPersonas.map((persona) => (
            <div key={persona.id} className="bg-white rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-medium text-gray-900">{persona.name}</h3>
                      {persona.isCustom && (
                        <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                          Custom
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-blue-600 mt-1 font-medium">{persona.role}</p>
                    <p className="text-sm text-gray-600 mt-2">{persona.task}</p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    persona.category === 'Creative' ? 'bg-pink-100 text-pink-800' :
                    persona.category === 'Technical' ? 'bg-blue-100 text-blue-800' :
                    persona.category === 'Business' ? 'bg-green-100 text-green-800' :
                    persona.category === 'Perspective' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {persona.category}
                  </span>
                </div>
                
                <div className="mt-6 flex space-x-3">
                  <button
                    onClick={() => setViewMode('editor')}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm transition-colors"
                  >
                    Edit
                  </button>
                  <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm transition-colors">
                    Duplicate
                  </button>
                  <button className="bg-gray-100 hover:bg-gray-200 text-gray-500 p-2 rounded-md transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredPersonas.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">👥</div>
            <h3 className="text-lg font-medium text-gray-900">No personas found</h3>
            <p className="text-gray-600 mt-2">
              {selectedCategory === 'All' 
                ? 'Create your first persona to get started'
                : `No personas in the ${selectedCategory} category`
              }
            </p>
            <button
              onClick={() => setViewMode('editor')}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md transition-colors"
            >
              Create New Persona
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}