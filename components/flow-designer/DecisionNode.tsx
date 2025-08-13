"use client"

import { Handle, Position } from '@xyflow/react';
import { NodeProps } from '@xyflow/react';

export default function DecisionNode({ data }: NodeProps) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-yellow-200">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      
      <div className="flex items-center">
        <div className="w-8 h-8 bg-yellow-500 flex items-center justify-center text-white text-sm font-bold transform rotate-45">
          D
        </div>
        <div className="ml-2">
          <div className="text-sm font-bold text-gray-700">{data.label}</div>
          {data.role && (
            <div className="text-xs text-gray-500">{data.role}</div>
          )}
        </div>
      </div>
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}
