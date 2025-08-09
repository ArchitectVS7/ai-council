"use client"

import { DashboardLayout } from '@/components/layout/AppLayout'
import FlowEditor from '@/components/flow-editor'
import { useState } from 'react'
import Link from 'next/link'

export default function FlowsPage() {
  const [selectedFlow, setSelectedFlow] = useState<string | null>(null)
  const [showEditor, setShowEditor] = useState(false)

  // Mock flow data - in real app this would come from database
  const flows = [
    {
      id: '1',
      name: 'Creative Project Development',
      description: 'Comprehensive creative project ideation with technical feasibility and market analysis',
      category: 'Creative',
      personas: 5,
      rounds: 2,
      lastModified: '2025-01-08',
      isTemplate: false
    },
    {
      id: '2', 
      name: 'Product Strategy Development',
      description: 'Strategic business planning with market analysis and financial modeling',
      category: 'Business',
      personas: 5,
      rounds: 2,
      lastModified: '2025-01-07',
      isTemplate: false
    },
    {
      id: '3',
      name: 'Game Development Ideation',
      description: 'Specialized workflow for game concept development',
      category: 'Creative',
      personas: 6,
      rounds: 2,
      lastModified: '2025-01-06',
      isTemplate: true
    }
  ]

  if (showEditor) {
    return (
      <DashboardLayout currentPage="flows">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Flow Editor</h1>
              <p className="mt-2 text-gray-600">Design your discussion flow structure</p>
            </div>
            <button
              onClick={() => setShowEditor(false)}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors"
            >
              ← Back to Flows
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
            <h1 className="text-3xl font-bold text-gray-900">Flow Management</h1>
            <p className="mt-2 text-gray-600">
              Create, edit, and manage your discussion flows. Define how AI personas collaborate 
              to explore your topics and generate insights.
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowEditor(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              + Create New Flow
            </button>
            <Link
              href="/templates"
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md transition-colors"
            >
              Browse Templates
            </Link>
          </div>
        </div>

        {/* Flow Categories */}
        <div className="flex space-x-4 border-b border-gray-200">
          <button className="px-4 py-2 border-b-2 border-blue-600 text-blue-600 font-medium">
            All Flows ({flows.length})
          </button>
          <button className="px-4 py-2 text-gray-500 hover:text-gray-700">
            Creative ({flows.filter(f => f.category === 'Creative').length})
          </button>
          <button className="px-4 py-2 text-gray-500 hover:text-gray-700">
            Business ({flows.filter(f => f.category === 'Business').length})
          </button>
        </div>

        {/* Flow Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {flows.map((flow) => (
            <div key={flow.id} className="bg-white rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-medium text-gray-900">{flow.name}</h3>
                      {flow.isTemplate && (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          Template
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{flow.description}</p>
                  </div>
                </div>
                
                <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-4">
                    <span>👥 {flow.personas} personas</span>
                    <span>🔄 {flow.rounds} rounds</span>
                  </div>
                  <span className="text-xs">{flow.lastModified}</span>
                </div>
                
                <div className="mt-6 flex space-x-3">
                  <button
                    onClick={() => {
                      setSelectedFlow(flow.id)
                      setShowEditor(true)
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm transition-colors"
                  >
                    Edit
                  </button>
                  <Link
                    href={`/discussion?flow=${flow.id}`}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm text-center transition-colors"
                  >
                    Use
                  </Link>
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
        {flows.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🔄</div>
            <h3 className="text-lg font-medium text-gray-900">No flows yet</h3>
            <p className="text-gray-600 mt-2">Create your first discussion flow to get started</p>
            <button
              onClick={() => setShowEditor(true)}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md transition-colors"
            >
              Create Your First Flow
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}