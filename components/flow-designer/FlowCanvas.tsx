"use client"

import { useDrop } from 'react-dnd';
import { PersonaTemplate } from '../../types/flow-designer';

interface FlowCanvasProps {
  children: React.ReactNode;
  onPersonaDrop: (persona: PersonaTemplate, position: { x: number; y: number }) => void;
}

export default function FlowCanvas({ children, onPersonaDrop }: FlowCanvasProps) {
  const [{ isOver }, drop] = useDrop({
    accept: 'persona',
    drop: (item: { persona: PersonaTemplate }, monitor) => {
      const offset = monitor.getClientOffset();
      if (offset) {
        // Convert screen coordinates to flow coordinates
        const rect = (drop as any).current?.getBoundingClientRect();
        if (rect) {
          const x = offset.x - rect.left;
          const y = offset.y - rect.top;
          onPersonaDrop(item.persona, { x, y });
        }
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  return (
    <div
      ref={drop as any}
      className={`flex-1 bg-gray-50 relative ${
        isOver ? 'bg-blue-50 border-2 border-blue-300 border-dashed' : ''
      }`}
      style={{ minHeight: '600px' }}
    >
      {children}
      {isOver && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-md shadow-lg">
            Drop persona here
          </div>
        </div>
      )}
    </div>
  );
}
