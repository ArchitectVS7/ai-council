"use client"

import { useState } from 'react'
import { downloadJSON, copyToClipboard } from '../lib/export-schemas'

// Types
type Message = {
  persona: string
  personaId: number
  content: string
  timestamp: string
  round: number
}

type Analysis = {
  summary: string
  bulletPoints: string[]
  keyInsights?: string
  consensusPoints?: string
  outstandingQuestions?: string
  recommendations?: string
}

type ReportData = {
  topic: string
  startedAt: string
  completedAt?: string
  messages: Message[]
  analysis?: Analysis
}

type ReportTemplate = 'comprehensive' | 'summary' | 'transcript' | 'analysis'

type ReportGeneratorProps = {
  data: ReportData
  isOpen: boolean
  onClose: () => void
}

export default function ReportGenerator({ data, isOpen, onClose }: ReportGeneratorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate>('comprehensive')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedReport, setGeneratedReport] = useState<string>('')

  if (!isOpen) return null

  const generateReport = () => {
    setIsGenerating(true)
    
    try {
      let report = ''
      const duration = data.completedAt 
        ? `${Math.round((new Date(data.completedAt).getTime() - new Date(data.startedAt).getTime()) / 1000 / 60)} minutes`
        : 'Ongoing'

      const totalRounds = data.messages.length > 0 ? Math.max(...data.messages.map(m => m.round)) : 0

      switch (selectedTemplate) {
        case 'comprehensive':
          report = generateComprehensiveReport()
          break
        case 'summary':
          report = generateSummaryReport()
          break
        case 'transcript':
          report = generateTranscriptReport()
          break
        case 'analysis':
          report = generateAnalysisReport()
          break
      }

      setGeneratedReport(report)
    } catch (error) {
      console.error('Error generating report:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const generateComprehensiveReport = () => {
    const duration = data.completedAt 
      ? `${Math.round((new Date(data.completedAt).getTime() - new Date(data.startedAt).getTime()) / 1000 / 60)} minutes`
      : 'Ongoing'

    const totalRounds = data.messages.length > 0 ? Math.max(...data.messages.map(m => m.round)) : 0

    return `# AI Council Debate Report

## Topic
${data.topic}

## Session Details
- **Started:** ${new Date(data.startedAt).toLocaleString()}
- **Completed:** ${data.completedAt ? new Date(data.completedAt).toLocaleString() : 'In Progress'}
- **Duration:** ${duration}
- **Total Messages:** ${data.messages.length}
- **Rounds:** ${totalRounds}
- **Participants:** ${Array.from(new Set(data.messages.map(m => m.persona))).join(', ')}

---

## Executive Summary
${data.analysis?.keyInsights || 'No analysis available yet.'}

---

## Key Points
${data.analysis?.bulletPoints?.map(bullet => `• ${bullet}`).join('\n') || 'No key points extracted.'}

---

## Full Transcript

${data.messages.map((message, index) => `
**${message.persona}** (Round ${message.round})
*${new Date(message.timestamp).toLocaleString()}*

${message.content}

---
`).join('\n')}

## Analysis & Insights

${data.analysis ? `
### Consensus Points
${data.analysis.consensusPoints || 'None identified.'}

### Outstanding Questions
${data.analysis.outstandingQuestions || 'None identified.'}

### Recommendations
${data.analysis.recommendations || 'None provided.'}

### Final Analysis
${data.analysis.summary}
` : 'Analysis not yet generated.'}

---

*Report generated on ${new Date().toLocaleString()} by AI Council*`
  }

  const generateSummaryReport = () => {
    const duration = data.completedAt 
      ? `${Math.round((new Date(data.completedAt).getTime() - new Date(data.startedAt).getTime()) / 1000 / 60)} minutes`
      : 'Ongoing'

    return `# AI Council Debate Summary

**Topic:** ${data.topic}
**Duration:** ${duration} | **Messages:** ${data.messages.length} | **Participants:** ${Array.from(new Set(data.messages.map(m => m.persona))).join(', ')}

## Executive Summary
${data.analysis?.keyInsights || 'Analysis pending...'}

## Key Points
${data.analysis?.bulletPoints?.map(bullet => `• ${bullet}`).join('\n') || 'No key points available.'}

## Recommendations
${data.analysis?.recommendations || 'No recommendations available.'}

---
*Generated: ${new Date().toLocaleString()}*`
  }

  const generateTranscriptReport = () => {
    return `# AI Council Debate Transcript

**Topic:** ${data.topic}
**Date:** ${new Date(data.startedAt).toLocaleDateString()}

---

${data.messages.map((message, index) => `
## Round ${message.round} - ${message.persona}
*${new Date(message.timestamp).toLocaleString()}*

${message.content}
`).join('\n---\n')}

---
*Transcript generated: ${new Date().toLocaleString()}*`
  }

  const generateAnalysisReport = () => {
    if (!data.analysis) {
      return `# AI Council Analysis Report

**Topic:** ${data.topic}

## Status
Analysis has not been generated for this debate yet.

Please complete the debate and generate the final analysis to view detailed insights.

---
*Report generated: ${new Date().toLocaleString()}*`
    }

    return `# AI Council Analysis Report

**Topic:** ${data.topic}

## Executive Summary
${data.analysis.keyInsights}

## Key Points Identified
${data.analysis.bulletPoints?.map(bullet => `• ${bullet}`).join('\n')}

## Points of Consensus
${data.analysis.consensusPoints || 'None explicitly identified.'}

## Outstanding Questions
${data.analysis.outstandingQuestions || 'None identified.'}

## Recommendations
${data.analysis.recommendations || 'None provided.'}

## Detailed Analysis
${data.analysis.summary}

---
*Analysis generated: ${new Date().toLocaleString()}*`
  }

  const handleDownload = () => {
    if (!generatedReport) return

    const filename = `ai-council-${selectedTemplate}-report-${new Date().toISOString().slice(0, 10)}.txt`
    const blob = new Blob([generatedReport], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    URL.revokeObjectURL(url)
  }

  const handleCopyToClipboard = async () => {
    if (!generatedReport) return

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(generatedReport)
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = generatedReport
        textArea.style.position = 'absolute'
        textArea.style.left = '-999999px'
        
        document.body.prepend(textArea)
        textArea.select()
        
        document.execCommand('copy')
        textArea.remove()
      }
      
      // Could add success toast here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] flex overflow-hidden">
        {/* Left Panel - Configuration */}
        <div className="w-1/3 border-r border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Generate Report</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* Report Template Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Report Template
              </label>
              <div className="space-y-3">
                {[
                  { value: 'comprehensive', label: 'Comprehensive', description: 'Full report with transcript and analysis' },
                  { value: 'summary', label: 'Executive Summary', description: 'High-level overview and key points' },
                  { value: 'transcript', label: 'Transcript Only', description: 'Complete conversation transcript' },
                  { value: 'analysis', label: 'Analysis Only', description: 'Final analysis and insights' },
                ].map((template) => (
                  <div key={template.value} className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id={template.value}
                        type="radio"
                        name="template"
                        value={template.value}
                        checked={selectedTemplate === template.value}
                        onChange={(e) => setSelectedTemplate(e.target.value as ReportTemplate)}
                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                    </div>
                    <div className="ml-3">
                      <label htmlFor={template.value} className="text-sm font-medium text-gray-900 cursor-pointer">
                        {template.label}
                      </label>
                      <p className="text-xs text-gray-500">{template.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Debate Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Debate Info</h3>
              <div className="space-y-1 text-xs text-gray-600">
                <p><span className="font-medium">Topic:</span> {data.topic}</p>
                <p><span className="font-medium">Messages:</span> {data.messages.length}</p>
                <p><span className="font-medium">Participants:</span> {Array.from(new Set(data.messages.map(m => m.persona))).join(', ')}</p>
                <p><span className="font-medium">Status:</span> {data.completedAt ? 'Completed' : 'In Progress'}</p>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={generateReport}
              disabled={isGenerating}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isGenerating ? 'Generating...' : 'Generate Report'}
            </button>

            {/* Export Actions */}
            {generatedReport && (
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleDownload}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Report
                </button>
                
                <button
                  onClick={handleCopyToClipboard}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center justify-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Copy to Clipboard
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="flex-1 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Report Preview</h3>
          
          {generatedReport ? (
            <div className="bg-gray-50 rounded-lg p-4 h-full overflow-auto">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
                {generatedReport}
              </pre>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-8 h-full flex items-center justify-center">
              <div className="text-center text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5l3 3 6-6" />
                </svg>
                <p className="mt-2 text-sm font-medium">No report generated</p>
                <p className="text-sm">Select a template and click &quot;Generate Report&quot; to preview</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}