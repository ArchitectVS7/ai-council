"use client"

import { FlowDesign } from '../../types/flow-designer';

interface FlowPreviewProps {
  flow: FlowDesign;
  onEdit?: () => void;
  onExecute?: () => void;
  className?: string;
}

export default function FlowPreview({ flow, onEdit, onExecute, className = '' }: FlowPreviewProps) {
  const personaNodes = flow.nodes.filter(node => node.type === 'persona');
  const decisionNodes = flow.nodes.filter(node => node.type === 'decision');
  const synthesisNodes = flow.nodes.filter(node => node.type === 'synthesis');

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{flow.name}</h3>
          {flow.description && (
            <p className="text-sm text-gray-600 mt-1">{flow.description}</p>
          )}
        </div>
        <div className="flex space-x-2">
          {onEdit && (
            <button
              onClick={onEdit}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Edit
            </button>
          )}
          {onExecute && (
            <button
              onClick={onExecute}
              className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            >
              Execute
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{personaNodes.length}</div>
          <div className="text-xs text-gray-500">Personas</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">{decisionNodes.length}</div>
          <div className="text-xs text-gray-500">Decisions</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{synthesisNodes.length}</div>
          <div className="text-xs text-gray-500">Synthesis</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center text-sm">
          <span className="text-gray-500 w-16">Category:</span>
          <span className="font-medium capitalize">{flow.category}</span>
        </div>
        <div className="flex items-center text-sm">
          <span className="text-gray-500 w-16">Created:</span>
          <span className="font-medium">
            {new Date(flow.createdAt).toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-center text-sm">
          <span className="text-gray-500 w-16">Updated:</span>
          <span className="font-medium">
            {new Date(flow.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {personaNodes.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Personas:</h4>
          <div className="flex flex-wrap gap-1">
            {personaNodes.slice(0, 3).map((node) => (
              <span
                key={node.id}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
              >
                {node.data.label}
              </span>
            ))}
            {personaNodes.length > 3 && (
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                +{personaNodes.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
