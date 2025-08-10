"use client"

import { DashboardLayout } from '@/components/layout/AppLayout'
import Link from 'next/link'
import { useState } from 'react'

interface Session {
  id: string
  title: string
  template: string
  status: 'completed' | 'in-progress' | 'draft'
  createdAt: string
  updatedAt: string
  duration: string
  totalMessages: number
  personas: string[]
  insights: number
  deliverables: string[]
}

interface SessionsClientProps {
  sessions: Session[]
}

export default function SessionsClient({ sessions }: SessionsClientProps) {
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'in-progress' | 'draft'>('all')
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'template'>('date')

  const filteredSessions = sessions.filter(session => 
    filterStatus === 'all' || session.status === filterStatus
  )

  const sortedSessions = [...filteredSessions].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case 'title':
        return a.title.localeCompare(b.title)
      case 'template':
        return a.template.localeCompare(b.template)
      default:
        return 0
    }
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in-progress': return 'bg-yellow-100 text-yellow-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <DashboardLayout currentPage="sessions">
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Session History</h1>
          <p className="mt-2 text-gray-600">
            View and manage your past AI Council discussions. Export insights, continue sessions, or start new ones.
          </p>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
          {/* Status Filter */}
          <div className="flex space-x-2">
            {(['all', 'completed', 'in-progress', 'draft'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'All' : status.replace('-', ' ')} ({
                  status === 'all' ? sessions.length : sessions.filter(s => s.status === status).length
                })
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="date">Date</option>
              <option value="title">Title</option>
              <option value="template">Template</option>
            </select>
          </div>
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
            placeholder="Search sessions by title, template, or content..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Sessions List */}
        <div className="space-y-4">
          {sortedSessions.map((session) => (
            <div key={session.id} className="bg-white rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-xl font-medium text-gray-900">{session.title}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(session.status)}`}>
                        {session.status.replace('-', ' ')}
                      </span>
                    </div>
                    
                    <p className="text-sm text-blue-600 mt-1 font-medium">{session.template}</p>
                    
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Duration:</span>
                        <div className="font-medium">{session.duration}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Messages:</span>
                        <div className="font-medium">{session.totalMessages}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Personas:</span>
                        <div className="font-medium">{session.personas.length}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Insights:</span>
                        <div className="font-medium">{session.insights}</div>
                      </div>
                    </div>

                    {/* Personas Tags */}
                    {session.personas.length > 0 && (
                      <div className="mt-4">
                        <div className="flex flex-wrap gap-2">
                          {session.personas.slice(0, 3).map((persona) => (
                            <span key={persona} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                              {persona}
                            </span>
                          ))}
                          {session.personas.length > 3 && (
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                              +{session.personas.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Deliverables */}
                    {session.deliverables.length > 0 && (
                      <div className="mt-3">
                        <span className="text-sm text-gray-500">Deliverables: </span>
                        <span className="text-sm text-gray-700">{session.deliverables.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions and Dates */}
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    <span>Created {formatDate(session.createdAt)}</span>
                    {session.updatedAt !== session.createdAt && (
                      <span className="ml-4">Updated {formatDate(session.updatedAt)}</span>
                    )}
                  </div>
                  
                  <div className="flex space-x-3">
                    <Link
                      href={`/sessions/${session.id}`}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
                    >
                      View Details
                    </Link>
                    {session.status === 'in-progress' && (
                      <Link
                        href={`/discussion?session=${session.id}`}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
                      >
                        Continue
                      </Link>
                    )}
                    <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm transition-colors">
                      Export
                    </button>
                    <button className="bg-gray-100 hover:bg-gray-200 text-gray-500 p-2 rounded-md transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
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
                ? 'Start your first AI Council discussion to see sessions here'
                : `Try adjusting your filter or create a new session`
              }
            </p>
            <Link
              href="/discussion"
              className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md transition-colors"
            >
              Start New Discussion
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}