"use client"

import { useDrag } from 'react-dnd';
import { PersonaTemplate } from '../../types/flow-designer';

interface PersonaLibraryProps {
  personas: PersonaTemplate[];
  category?: 'creative' | 'business' | 'research';
}

export default function PersonaLibrary({ personas, category }: PersonaLibraryProps) {
  const filteredPersonas = category 
    ? personas.filter(p => p.category === category)
    : personas;

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Persona Library</h3>
      
      {category && (
        <div className="mb-4">
          <span className="text-sm text-gray-600">Category: </span>
          <span className="text-sm font-medium text-blue-600 capitalize">{category}</span>
        </div>
      )}
      
      <div className="space-y-2">
        {filteredPersonas.map((persona) => (
          <DraggablePersona key={persona.id} persona={persona} />
        ))}
      </div>
      
      {filteredPersonas.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          <p>No personas available</p>
          <p className="text-sm">Create personas in the Persona Manager</p>
        </div>
      )}
    </div>
  );
}

interface DraggablePersonaProps {
  persona: PersonaTemplate;
}

function DraggablePersona({ persona }: DraggablePersonaProps) {
  const [{ isDragging }, drag] = useDrag({
    type: 'persona',
    item: { persona },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag}
      className={`p-3 bg-white border border-gray-200 rounded-md cursor-move hover:shadow-md transition-shadow ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-center">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
          persona.category === 'creative' ? 'bg-purple-500' :
          persona.category === 'business' ? 'bg-blue-500' :
          'bg-green-500'
        }`}>
          {persona.name.charAt(0).toUpperCase()}
        </div>
        <div className="ml-2 flex-1">
          <div className="text-sm font-medium text-gray-800">{persona.name}</div>
          <div className="text-xs text-gray-500">{persona.role}</div>
          <div className="text-xs text-blue-600">{persona.expertise}</div>
        </div>
      </div>
    </div>
  );
}
