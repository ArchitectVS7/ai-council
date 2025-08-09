"use client"

import { DashboardLayout } from '@/components/layout/AppLayout'
import Link from 'next/link'
import { useState } from 'react'

export default function SessionsPage() {
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'in-progress' | 'draft'>('all')
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'template'>('date')

  // Mock session data - in real app this would come from database
  const sessions = [
    {
      id: '1',
      title: 'Space Wizards Mobile Game Concept',
      template: 'Game Development Ideation',
      status: 'completed' as const,
      createdAt: '2025-01-08T14:30:00Z',
      updatedAt: '2025-01-08T16:45:00Z',
      duration: '2h 15m',
      totalMessages: 18,
      personas: ['Narrative Designer', 'Lovecraft Specialist', 'Game Designer', 'Market Analyst'],
      insights: 12,
      deliverables: ['Creative Brief', 'Technical Requirements', 'Market Analysis']
    },
    {
      id: '2',
      title: 'Sustainable Transportation Strategy',
      template: 'Product Strategy Development',
      status: 'in-progress' as const,
      createdAt: '2025-01-07T09:15:00Z',
      updatedAt: '2025-01-07T11:30:00Z',
      duration: '1h 30m',
      totalMessages: 12,
      personas: ['Market Strategist', 'Customer Advocate', 'Innovation Catalyst'],
      insights: 8,
      deliverables: ['Market Overview']
    },
    {
      id: '3',
      title: 'AI Ethics Framework Discussion',
      template: 'Default Discussion',
      status: 'completed' as const,
      createdAt: '2025-01-06T16:00:00Z',
      updatedAt: '2025-01-06T17:15:00Z',
      duration: '1h 15m',
      totalMessages: 15,
      personas: ['Empathy Advocate', 'Moderator', 'Skeptical Academic'],
      insights: 9,
      deliverables: ['Discussion Summary', 'Key Recommendations']
    },
    {
      id: '4',
      title: 'Healthcare App Prototype',
      template: 'Creative Project Development',
      status: 'draft' as const,
      createdAt: '2025-01-05T13:20:00Z',
      updatedAt: '2025-01-05T13:45:00Z',
      duration: '25m',
      totalMessages: 3,
      personas: ['Creative Visionary'],
      insights: 2,
      deliverables: []
    }
  ]

  const filteredSessions = sessions.filter(session => {
    if (filterStatus === 'all') return true
    return session.status === filterStatus
  })

  const sortedSessions = [...filteredSessions].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      case 'title':
        return a.title.localeCompare(b.title)
      case 'template':
        return a.template.localeCompare(b.template)
      default:
        return 0
    }
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800'
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <DashboardLayout currentPage="sessions">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Session History</h1>
            <p className="mt-2 text-gray-600">
              View, manage, and resume your collaborative discussion sessions.
            </p>
          </div>
          <Link
            href="/discussion"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
          >
            + New Session
          </Link>
        </div>

        {/* Filters and Controls */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            {/* Status Filter */}
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">Filter by status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Sessions ({sessions.length})</option>
                <option value="completed">Completed ({sessions.filter(s => s.status === 'completed').length})</option>
                <option value="in-progress">In Progress ({sessions.filter(s => s.status === 'in-progress').length})</option>
                <option value="draft">Draft ({sessions.filter(s => s.status === 'draft').length})</option>
              </select>
            </div>

            {/* Sort Controls */}
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="date">Last Modified</option>
                <option value="title">Title</option>
                <option value="template">Template</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sessions List */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="divide-y divide-gray-200">
            {sortedSessions.map((session) => (
              <div key={session.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium text-gray-900">{session.title}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(session.status)}`}>
                        {session.status.replace('-', ' ')}
                      </span>
                    </div>
                    
                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                      <span>📋 {session.template}</span>
                      <span>⏱️ {session.duration}</span>
                      <span>💬 {session.totalMessages} messages</span>
                      <span>💡 {session.insights} insights</span>
                    </div>

                    <div className="mt-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Personas:</span>
                        <div className="flex flex-wrap gap-1">
                          {session.personas.map((persona, index) => (
                            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              {persona}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {session.deliverables.length > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">Deliverables:</span>
                          <div className="flex flex-wrap gap-1">
                            {session.deliverables.map((deliverable, index) => (
                              <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                {deliverable}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-3 text-xs text-gray-500">
                      Created {formatDate(session.createdAt)} • Last updated {formatDate(session.updatedAt)}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 ml-6">
                    <Link
                      href={`/sessions/${session.id}`}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
                    >
                      View
                    </Link>
                    
                    {session.status === 'in-progress' && (
                      <Link
                        href={`/discussion?resume=${session.id}`}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
                      >
                        Resume
                      </Link>
                    )}
                    
                    <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm transition-colors">
                      Duplicate
                    </button>

                    <button className="text-gray-500 hover:text-gray-700 p-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Empty State */}
        {sortedSessions.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📚</div>
            <h3 className="text-lg font-medium text-gray-900">
              {filterStatus === 'all' ? 'No sessions yet' : `No ${filterStatus.replace('-', ' ')} sessions`}
            </h3>
            <p className="text-gray-600 mt-2">
              {filterStatus === 'all' 
                ? 'Start your first collaborative discussion to see sessions here'
                : `Try adjusting the filter to see sessions with different statuses`
              }
            </p>
            <Link
              href="/discussion"
              className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md transition-colors"
            >
              Start New Session
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}