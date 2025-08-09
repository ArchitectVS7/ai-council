"use client"

import { DashboardLayout } from '@/components/layout/AppLayout'
import { workflowTemplates } from '@/lib/creativeWorkflows'
import Link from 'next/link'
import { useState } from 'react'

export default function TemplatesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Convert workflow templates to display format
  const templates = Object.entries(workflowTemplates).map(([key, template]) => ({
    id: key,
    ...template,
    // Mock additional data
    usageCount: Math.floor(Math.random() * 100),
    rating: 4.2 + Math.random() * 0.8,
    lastUsed: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    isOfficial: true,
    author: 'AI Council Team'
  }))

  // Add some community templates
  const communityTemplates = [
    {
      id: 'marketing-campaign',
      name: 'Marketing Campaign Development',
      description: 'End-to-end marketing campaign planning with brand strategists, content creators, and performance analysts',
      category: 'Business',
      usageCount: 42,
      rating: 4.6,
      lastUsed: '2025-01-05T10:00:00Z',
      isOfficial: false,
      author: 'MarketingPro',
      createConfig: () => ({ personas: [], stateFlow: [], numRounds: 2 })
    },
    {
      id: 'research-paper',
      name: 'Academic Research Review',
      description: 'Comprehensive academic paper analysis with methodology critics and peer reviewers',
      category: 'Research',
      usageCount: 28,
      rating: 4.4,
      lastUsed: '2025-01-04T14:30:00Z',
      isOfficial: false,
      author: 'Dr. Smith',
      createConfig: () => ({ personas: [], stateFlow: [], numRounds: 3 })
    }
  ]

  const allTemplates = [...templates, ...communityTemplates]

  const categories = ['all', 'Creative', 'Business', 'Research']
  
  const filteredTemplates = allTemplates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
    const matchesSearch = searchQuery === '' || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Creative': return 'bg-pink-100 text-pink-800'
      case 'Business': return 'bg-green-100 text-green-800'
      case 'Research': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleUseTemplate = (templateId: string) => {
    // In real app, this would set up the discussion with the selected template
    window.location.href = `/app/discussion?template=${templateId}`
  }

  return (
    <DashboardLayout currentPage="templates">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Workflow Templates</h1>
            <p className="mt-2 text-gray-600">
              Browse and use pre-built workflow templates for different types of collaborative discussions.
            </p>
          </div>
          <div className="flex space-x-3">
            <Link
              href="/app/flows"
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md transition-colors"
            >
              Create Custom Flow
            </Link>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors">
              Submit Template
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Category Filter */}
            <div className="flex space-x-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category === 'all' ? 'All' : category} ({category === 'all' ? allTemplates.length : allTemplates.filter(t => t.category === category).length})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div key={template.id} className="bg-white rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                      {template.isOfficial && (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          Official
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{template.description}</p>
                  </div>
                </div>
                
                <div className="mt-4 flex items-center justify-between">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(template.category)}`}>
                    {template.category}
                  </span>
                  <div className="flex items-center space-x-1 text-sm text-gray-500">
                    <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span>{template.rating.toFixed(1)}</span>
                  </div>
                </div>
                
                <div className="mt-4 text-sm text-gray-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Usage:</span>
                    <span>{template.usageCount} times</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Author:</span>
                    <span>{template.author}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last used:</span>
                    <span>{formatDate(template.lastUsed)}</span>
                  </div>
                </div>
                
                <div className="mt-6 flex space-x-3">
                  <button
                    onClick={() => handleUseTemplate(template.id)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm transition-colors"
                  >
                    Use Template
                  </button>
                  <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm transition-colors">
                    Preview
                  </button>
                  <button className="bg-gray-100 hover:bg-gray-200 text-gray-500 p-2 rounded-md transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900">No templates found</h3>
            <p className="text-gray-600 mt-2">
              {searchQuery 
                ? `No templates match "${searchQuery}"`
                : `No templates in the ${selectedCategory} category`
              }
            </p>
            <div className="mt-4 space-x-3">
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md transition-colors"
                >
                  Clear search
                </button>
              )}
              <Link
                href="/app/flows"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors inline-block"
              >
                Create Custom Flow
              </Link>
            </div>
          </div>
        )}

        {/* Featured Section */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Create Your Own Template</h2>
          <p className="text-gray-600 mt-2 max-w-2xl mx-auto">
            Have a successful workflow pattern? Share it with the community by submitting your own template.
            Help others benefit from your expertise and collaboration approaches.
          </p>
          <div className="mt-6 space-x-4">
            <Link
              href="/app/flows"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md transition-colors inline-block"
            >
              Create Flow
            </Link>
            <button className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-6 py-3 rounded-md transition-colors">
              Template Guidelines
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}