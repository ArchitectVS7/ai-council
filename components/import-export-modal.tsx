"use client"

import { useState, useRef } from 'react'
import { 
  validateImportData, 
  downloadJSON, 
  copyToClipboard,
  createConfigurationExport,
  createDebateExport,
  type ExportData,
  type ConfigurationExport,
  type DebateExport,
  type PersonaExport,
  type FlowExport
} from '../lib/export-schemas'

type ImportExportModalProps = {
  isOpen: boolean
  onClose: () => void
  mode: 'import' | 'export'
  exportData?: {
    type: 'configuration' | 'debate'
    personas?: PersonaExport[]
    flows?: FlowExport[]
    debate?: any
    messages?: any[]
    analysis?: any
    name?: string
    description?: string
  }
  onImport?: (data: ExportData) => Promise<void>
}

export default function ImportExportModal({
  isOpen,
  onClose,
  mode,
  exportData,
  onImport
}: ImportExportModalProps) {
  const [activeTab, setActiveTab] = useState<'file' | 'clipboard'>('file')
  const [importText, setImportText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<ExportData | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/json') {
      setError('Please select a JSON file')
      return
    }

    try {
      const text = await file.text()
      const jsonData = JSON.parse(text)
      
      const validation = validateImportData(jsonData)
      if (!validation.success) {
        setError(validation.error)
        return
      }

      setPreviewData(validation.data)
      setError(null)
    } catch (err: any) {
      setError('Invalid JSON file: ' + (err.message || 'Parse error'))
    }
  }

  // Handle clipboard import
  const handleClipboardImport = () => {
    try {
      const jsonData = JSON.parse(importText.trim())
      
      const validation = validateImportData(jsonData)
      if (!validation.success) {
        setError(validation.error)
        return
      }

      setPreviewData(validation.data)
      setError(null)
    } catch (err: any) {
      setError('Invalid JSON: ' + (err.message || 'Parse error'))
    }
  }

  // Handle import confirmation
  const handleImportConfirm = async () => {
    if (!previewData || !onImport) return

    try {
      setIsProcessing(true)
      setError(null)
      
      await onImport(previewData)
      
      setSuccess('Import completed successfully!')
      setTimeout(() => {
        onClose()
        setPreviewData(null)
        setImportText('')
        setSuccess(null)
      }, 2000)
      
    } catch (err: any) {
      setError('Import failed: ' + (err.message || 'Unknown error'))
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle export
  const handleExport = (format: 'download' | 'clipboard') => {
    if (!exportData) return

    try {
      setIsProcessing(true)
      setError(null)

      let data: ExportData
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')

      if (exportData.type === 'configuration') {
        data = createConfigurationExport({
          personas: exportData.personas || [],
          flows: exportData.flows || [],
          name: exportData.name || 'Configuration Export',
          description: exportData.description,
        })
      } else {
        data = createDebateExport({
          debate: exportData.debate,
          personas: exportData.personas || [],
          messages: exportData.messages || [],
          analysis: exportData.analysis,
          flow: exportData.flows?.[0],
        })
      }

      if (format === 'download') {
        const filename = `ai-council-${exportData.type}-${timestamp}.json`
        downloadJSON(data, filename)
        setSuccess('Export downloaded successfully!')
      } else {
        copyToClipboard(data).then(() => {
          setSuccess('Export copied to clipboard!')
        }).catch(err => {
          setError('Failed to copy to clipboard: ' + err.message)
        })
      }

      setTimeout(() => setSuccess(null), 3000)
      
    } catch (err: any) {
      setError('Export failed: ' + (err.message || 'Unknown error'))
    } finally {
      setIsProcessing(false)
    }
  }

  const reset = () => {
    setPreviewData(null)
    setImportText('')
    setError(null)
    setSuccess(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              {mode === 'import' ? 'Import Data' : 'Export Data'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Status Messages */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-800">{success}</p>
                </div>
              </div>
            </div>
          )}

          {mode === 'import' ? (
            <div className="space-y-6">
              {/* Import Tabs */}
              {!previewData && (
                <>
                  <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                      <button
                        onClick={() => setActiveTab('file')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                          activeTab === 'file'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        Upload File
                      </button>
                      <button
                        onClick={() => setActiveTab('clipboard')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                          activeTab === 'clipboard'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        Paste JSON
                      </button>
                    </nav>
                  </div>

                  {/* File Upload Tab */}
                  {activeTab === 'file' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select JSON File
                        </label>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".json"
                          onChange={handleFileUpload}
                          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          disabled={isProcessing}
                        />
                      </div>
                      <p className="text-sm text-gray-500">
                        Upload a JSON file exported from AI Council containing personas, flows, or debate data.
                      </p>
                    </div>
                  )}

                  {/* Clipboard Tab */}
                  {activeTab === 'clipboard' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Paste JSON Data
                        </label>
                        <textarea
                          value={importText}
                          onChange={(e) => setImportText(e.target.value)}
                          rows={12}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                          placeholder="Paste your JSON data here..."
                          disabled={isProcessing}
                        />
                      </div>
                      <button
                        onClick={handleClipboardImport}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        disabled={!importText.trim() || isProcessing}
                      >
                        Validate JSON
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Import Preview */}
              {previewData && (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Import Preview</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Type:</span> {previewData.type}</p>
                      <p><span className="font-medium">Version:</span> {previewData.version}</p>
                      
                      {previewData.type === 'configuration' && (
                        <>
                          <p><span className="font-medium">Personas:</span> {previewData.personas.length}</p>
                          <p><span className="font-medium">Flows:</span> {previewData.flows.length}</p>
                          <p><span className="font-medium">Name:</span> {previewData.metadata.name}</p>
                        </>
                      )}
                      
                      {previewData.type === 'debate' && (
                        <>
                          <p><span className="font-medium">Topic:</span> {previewData.debate.topic}</p>
                          <p><span className="font-medium">Messages:</span> {previewData.metadata.totalMessages}</p>
                          <p><span className="font-medium">Rounds:</span> {previewData.metadata.totalRounds}</p>
                          <p><span className="font-medium">Duration:</span> {previewData.metadata.duration}</p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleImportConfirm}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Importing...' : 'Confirm Import'}
                    </button>
                    <button
                      onClick={reset}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                      disabled={isProcessing}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Export Mode */
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Export Data</h3>
                <p className="text-sm text-gray-600 mb-4">
                  {exportData?.type === 'configuration' 
                    ? 'Export your personas and flows for backup or sharing.'
                    : 'Export the complete debate including transcript and analysis.'
                  }
                </p>
                
                {exportData && (
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Type:</span> {exportData.type}</p>
                    {exportData.type === 'configuration' ? (
                      <>
                        <p><span className="font-medium">Personas:</span> {exportData.personas?.length || 0}</p>
                        <p><span className="font-medium">Flows:</span> {exportData.flows?.length || 0}</p>
                      </>
                    ) : (
                      <>
                        <p><span className="font-medium">Topic:</span> {exportData.debate?.topic}</p>
                        <p><span className="font-medium">Messages:</span> {exportData.messages?.length || 0}</p>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => handleExport('download')}
                  className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  disabled={isProcessing}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download JSON File
                </button>

                <button
                  onClick={() => handleExport('clipboard')}
                  className="flex items-center justify-center px-4 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                  disabled={isProcessing}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Copy to Clipboard
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              disabled={isProcessing}
            >
              {mode === 'export' || previewData ? 'Close' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}