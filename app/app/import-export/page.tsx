"use client"

import { DashboardLayout } from '@/components/layout/AppLayout'
import ImportExportModal from '@/components/import-export-modal'
import { useState } from 'react'

export default function ImportExportPage() {
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'import' | 'export'>('export')

  // Mock export data
  const availableExports = [
    {
      id: '1',
      name: 'All Personas',
      type: 'personas',
      count: 15,
      description: 'All custom and default personas in your library',
      size: '24 KB'
    },
    {
      id: '2', 
      name: 'Custom Flows',
      type: 'flows',
      count: 5,
      description: 'Your custom discussion flows and templates',
      size: '12 KB'
    },
    {
      id: '3',
      name: 'Recent Session (Space Wizards)',
      type: 'session',
      count: 1,
      description: 'Complete session with messages and analysis',
      size: '156 KB'
    },
    {
      id: '4',
      name: 'Complete Configuration',
      type: 'full',
      count: 21,
      description: 'All personas, flows, and settings',
      size: '198 KB'
    }
  ]

  const recentImports = [
    {
      id: '1',
      name: 'Marketing Strategy Templates',
      type: 'flows',
      importedAt: '2025-01-07T10:30:00Z',
      status: 'success',
      itemsImported: 3
    },
    {
      id: '2',
      name: 'Industry Expert Personas',
      type: 'personas', 
      importedAt: '2025-01-06T15:45:00Z',
      status: 'success',
      itemsImported: 8
    }
  ]

  const handleExport = (exportId: string) => {
    console.log('Exporting:', exportId)
    // In real app, this would trigger download
    alert('Export functionality would download the configuration file')
  }

  const handleImport = () => {
    setModalMode('import')
    setShowModal(true)
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'personas': return '👥'
      case 'flows': return '🔄' 
      case 'session': return '💬'
      case 'full': return '📦'
      default: return '📁'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'personas': return 'bg-blue-100 text-blue-800'
      case 'flows': return 'bg-green-100 text-green-800'
      case 'session': return 'bg-purple-100 text-purple-800' 
      case 'full': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <DashboardLayout currentPage="import-export">
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Import & Export</h1>
          <p className="mt-2 text-gray-600">
            Backup your configurations, share with colleagues, or import new templates and personas.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Export Section */}
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Export Configurations</h2>
              <p className="text-sm text-gray-600 mt-1">Download your data for backup or sharing</p>
            </div>

            <div className="p-6 space-y-4">
              {availableExports.map((exportItem) => (
                <div key={exportItem.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">{getTypeIcon(exportItem.type)}</span>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{exportItem.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{exportItem.description}</p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(exportItem.type)}`}>
                            {exportItem.count} {exportItem.count === 1 ? 'item' : 'items'}
                          </span>
                          <span className="text-xs text-gray-500">{exportItem.size}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleExport(exportItem.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
                    >
                      Export
                    </button>
                  </div>
                </div>
              ))}

              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="font-medium text-gray-900 mb-3">Export Options</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium text-gray-700">Format</h4>
                    <div className="mt-1 space-y-1">
                      <label className="flex items-center">
                        <input type="radio" name="format" value="json" defaultChecked className="mr-2" />
                        JSON (recommended)
                      </label>
                      <label className="flex items-center">
                        <input type="radio" name="format" value="yaml" className="mr-2" />
                        YAML
                      </label>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700">Include</h4>
                    <div className="mt-1 space-y-1">
                      <label className="flex items-center">
                        <input type="checkbox" defaultChecked className="mr-2" />
                        Metadata
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" defaultChecked className="mr-2" />
                        Usage statistics
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Import Section */}
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Import Configurations</h2>
              <p className="text-sm text-gray-600 mt-1">Load configurations from files or colleagues</p>
            </div>

            <div className="p-6">
              {/* Import Action */}
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-gray-400 text-4xl mb-4">📁</div>
                <h3 className="text-lg font-medium text-gray-900">Import Configuration</h3>
                <p className="text-gray-600 mt-2">
                  Upload a JSON or YAML file with personas, flows, or complete configurations
                </p>
                <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={handleImport}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors"
                  >
                    Choose File
                  </button>
                  <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-md transition-colors">
                    Import from URL
                  </button>
                </div>
              </div>

              {/* Recent Imports */}
              <div className="mt-8">
                <h3 className="font-medium text-gray-900 mb-4">Recent Imports</h3>
                <div className="space-y-3">
                  {recentImports.map((importItem) => (
                    <div key={importItem.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">{getTypeIcon(importItem.type)}</span>
                        <div>
                          <h4 className="font-medium text-gray-900">{importItem.name}</h4>
                          <p className="text-xs text-gray-500">
                            {importItem.itemsImported} items • {formatDate(importItem.importedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          Success
                        </span>
                        <button className="text-gray-400 hover:text-gray-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Features */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Additional Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl mb-3">🔗</div>
              <h3 className="font-medium text-gray-900">Share Configurations</h3>
              <p className="text-sm text-gray-600 mt-1">Generate shareable links for your configurations</p>
              <button className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium">
                Coming Soon
              </button>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-3">🌐</div>
              <h3 className="font-medium text-gray-900">Template Marketplace</h3>
              <p className="text-sm text-gray-600 mt-1">Browse and import community-created templates</p>
              <button className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium">
                Coming Soon
              </button>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-3">🔄</div>
              <h3 className="font-medium text-gray-900">Auto-Sync</h3>
              <p className="text-sm text-gray-600 mt-1">Automatically sync configurations across devices</p>
              <button className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium">
                Coming Soon
              </button>
            </div>
          </div>
        </div>

        {/* Import/Export Modal */}
        {showModal && (
          <ImportExportModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            mode={modalMode}
          />
        )}
      </div>
    </DashboardLayout>
  )
}