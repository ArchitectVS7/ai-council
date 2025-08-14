"use client"

import { DashboardLayout } from '@/components/layout/AppLayout'
import FlowEditor from '@/components/flow-editor'
import { useState } from 'react'
import Link from 'next/link'

interface Flow {
  id: string
  name: string
  description: string
  category: string
  personas: number
  rounds: number
  lastModified: string
  isTemplate: boolean
}

interface FlowsClientProps {
  flows: Flow[]
}

export default function FlowsClient({ flows }: FlowsClientProps) {
  const [selectedFlow, setSelectedFlow] = useState<string | null>(null)
  const [showEditor, setShowEditor] = useState(false)

  const categories = ['All', ...Array.from(new Set(flows.map(f => f.category)))]
  const [selectedCategory, setSelectedCategory] = useState('All')

  const filteredFlows = selectedCategory === 'All' 
    ? flows 
    : flows.filter(f => f.category === selectedCategory)

  if (showEditor) {
    return (
      <DashboardLayout currentPage="flows">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Flow Editor</h1>
              <p className="mt-2 text-gray-600">Design multi-agent collaboration workflows</p>
            </div>
            <button
              onClick={() => setShowEditor(false)}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors"
            >
              ← Back to Flow Library
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <FlowEditor />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout currentPage="flows">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Workflows</h1>
            <p className="mt-2 text-gray-600">
              Create and manage multi-agent collaboration workflows. Design the sequence 
              and interaction patterns for your AI discussions.
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowEditor(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              + Create New Flow
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
              {category} ({category === 'All' ? flows.length : flows.filter(f => f.category === category).length})
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
            placeholder="Search flows by name, description, or category..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Template Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Flow Templates Available
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Start with our pre-built flow templates or create custom workflows. 
                  Templates include personas for ideation, creative writing, code development, and research.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Flows Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFlows.map((flow) => (
            <div key={flow.id} className="bg-white rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-medium text-gray-900">{flow.name}</h3>
                      {flow.isTemplate && (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          Template
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{flow.description}</p>
                  </div>
                </div>
                
                <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <span className="text-gray-400">👥</span>
                    <span className="ml-1">{flow.personas} personas</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-400">🔄</span>
                    <span className="ml-1">{flow.rounds} rounds</span>
                  </div>
                </div>
                
                <div className="mt-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    flow.category === 'creative' ? 'bg-pink-100 text-pink-800' :
                    flow.category === 'coding' ? 'bg-blue-100 text-blue-800' :
                    flow.category === 'ideation' ? 'bg-green-100 text-green-800' :
                    flow.category === 'research' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {flow.category}
                  </span>
                </div>
                
                <div className="mt-6 flex space-x-3">
                  <Link
                    href={`/discussion?flow=${flow.id}`}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm transition-colors text-center"
                  >
                    Use Flow
                  </Link>
                  <button
                    onClick={() => setShowEditor(true)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm transition-colors"
                  >
                    Edit
                  </button>
                  <button className="bg-gray-100 hover:bg-gray-200 text-gray-500 p-2 rounded-md transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>

                <div className="mt-4 text-xs text-gray-500 border-t pt-4">
                  Last modified: {flow.lastModified}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredFlows.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🔄</div>
            <h3 className="text-lg font-medium text-gray-900">No flows found</h3>
            <p className="text-gray-600 mt-2">
              {selectedCategory === 'All' 
                ? 'Create your first flow to get started'
                : `No flows in the ${selectedCategory} category`
              }
            </p>
            <button
              onClick={() => setShowEditor(true)}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md transition-colors"
            >
              Create New Flow
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}