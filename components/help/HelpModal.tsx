"use client"

import { useState, useEffect } from 'react'
import { useHelp, HelpSection, HelpContent } from './HelpProvider'

type HelpModalProps = {
  isOpen: boolean
  onClose: () => void
}

const sectionLabels: Record<HelpSection, string> = {
  'getting-started': 'Getting Started',
  'personas': 'Personas',
  'flows': 'Flows',  
  'discussions': 'Discussions',
  'analysis': 'Analysis',
  'import-export': 'Import/Export',
  'reports': 'Reports',
  'troubleshooting': 'Troubleshooting'
}

const sectionIcons: Record<HelpSection, string> = {
  'getting-started': '🚀',
  'personas': '👥',
  'flows': '🔄',
  'discussions': '💬',
  'analysis': '📊',
  'import-export': '📁',
  'reports': '📄',
  'troubleshooting': '🔧'
}

const difficultyColors = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-yellow-100 text-yellow-800',
  advanced: 'bg-red-100 text-red-800'
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const { 
    currentHelpSection, 
    setCurrentHelpSection,
    searchQuery, 
    setSearchQuery,
    getHelpContent,
    searchHelpContent,
    trackHelpInteraction
  } = useHelp()
  
  const [searchResults, setSearchResults] = useState<HelpContent[]>([])
  const [selectedContent, setSelectedContent] = useState<HelpContent | null>(null)

  // Update search results when query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      const results = searchHelpContent(searchQuery)
      setSearchResults(results)
      setCurrentHelpSection(null)
      setSelectedContent(null)
    } else {
      setSearchResults([])
    }
  }, [searchQuery, searchHelpContent, setCurrentHelpSection])

  // Load content when section changes and auto-select the first article
  useEffect(() => {
    if (currentHelpSection) {
      setSearchQuery('')
      const first = getHelpContent(currentHelpSection)[0] || null
      setSelectedContent(first)
    }
  }, [currentHelpSection, setSearchQuery, getHelpContent])

  if (!isOpen) return null

  const handleSectionClick = (section: HelpSection) => {
    setCurrentHelpSection(section)
    const first = getHelpContent(section)[0] || null
    setSelectedContent(first)
    trackHelpInteraction('section_clicked', section)
  }

  const handleContentClick = (content: HelpContent) => {
    setSelectedContent(content)
    trackHelpInteraction('content_viewed', content.section, content.id)
  }

  const handleBackToSection = () => {
    setSelectedContent(null)
  }

  const handleBackToOverview = () => {
    setCurrentHelpSection(null)
    setSelectedContent(null)
    setSearchQuery('')
  }

  const renderSidebarContent = () => {
    if (searchQuery.trim()) {
      return (
        <div className="space-y-2">
          <div className="text-sm text-gray-600 mb-3">
            {searchResults.length} results for &quot;{searchQuery}&quot;
          </div>
          {searchResults.map((content) => (
            <button
              key={content.id}
              onClick={() => handleContentClick(content)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedContent?.id === content.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium text-sm mb-1">{content.title}</div>
                  <div className="text-xs text-gray-500 mb-2">
                    {sectionIcons[content.section]} {sectionLabels[content.section]}
                  </div>
                  <div className={`inline-block px-2 py-1 rounded-full text-xs ${
                    difficultyColors[content.difficulty]
                  }`}>
                    {content.difficulty}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )
    }

    if (currentHelpSection) {
      const sectionContent = getHelpContent(currentHelpSection)
      return (
        <div className="space-y-2">
          <button
            onClick={handleBackToOverview}
            className="flex items-center text-sm text-blue-600 hover:text-blue-800 mb-4"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Overview
          </button>
          {sectionContent.map((content) => (
            <button
              key={content.id}
              onClick={() => handleContentClick(content)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedContent?.id === content.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="font-medium text-sm mb-1">{content.title}</div>
              <div className="text-xs text-gray-600 mb-2 line-clamp-2">
                {content.content.substring(0, 100)}...
              </div>
              <div className={`inline-block px-2 py-1 rounded-full text-xs ${
                difficultyColors[content.difficulty]
              }`}>
                {content.difficulty}
              </div>
            </button>
          ))}
        </div>
      )
    }

    // Default overview
    return (
      <div className="space-y-2">
        {Object.entries(sectionLabels).map(([key, label]) => {
          const section = key as HelpSection
          const sectionContent = getHelpContent(section)
          return (
            <button
              key={section}
              onClick={() => handleSectionClick(section)}
              className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">{sectionIcons[section]}</span>
                <div>
                  <div className="font-medium text-sm">{label}</div>
                  <div className="text-xs text-gray-500">
                    {sectionContent.length} articles
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    )
  }

  const renderMainContent = () => {
    if (selectedContent) {
      return (
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handleBackToSection}
              className="flex items-center text-sm text-blue-600 hover:text-blue-800"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <div className={`px-3 py-1 rounded-full text-sm ${
              difficultyColors[selectedContent.difficulty]
            }`}>
              {selectedContent.difficulty}
            </div>
          </div>
          
          <div className="flex-1 overflow-auto">
            <h2 className="text-xl font-semibold mb-4">{selectedContent.title}</h2>
            
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                {selectedContent.content}
              </div>
            </div>

            {selectedContent.relatedTopics.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Related Topics</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedContent.relatedTopics.map((topicId) => {
                    const relatedContent = searchHelpContent('').find(c => c.id === topicId)
                    if (!relatedContent) return null
                    
                    return (
                      <button
                        key={topicId}
                        onClick={() => handleContentClick(relatedContent)}
                        className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors"
                      >
                        {relatedContent.title}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )
    }

    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to AI Council Help</h3>
          <p className="text-gray-600 max-w-md">
            Select a topic from the sidebar to get started, or use the search bar to find specific information.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] flex overflow-hidden">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-6 bg-white border-b border-gray-200 z-10">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold text-gray-900">Help & Documentation</h1>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search help articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Content area */}
        <div className="flex w-full pt-32">
          {/* Sidebar */}
          <div className="w-1/3 border-r border-gray-200 p-6 overflow-auto">
            {renderSidebarContent()}
          </div>

          {/* Main content */}
          <div className="flex-1 p-6 overflow-auto">
            {renderMainContent()}
          </div>
        </div>
      </div>
    </div>
  )
}