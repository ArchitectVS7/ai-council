import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import '@testing-library/jest-dom';
import FlowDesigner from '../../components/flow-designer/FlowDesigner';
import { PersonaTemplate, FlowDesign } from '../../types/flow-designer';

// Mock ReactFlow since it has complex DOM dependencies
jest.mock('@xyflow/react', () => ({
  __esModule: true,
  default: ({ children, nodes, edges, onNodesChange, onEdgesChange, onConnect }: any) => (
    <div data-testid="react-flow-mock">
      <div data-testid="nodes-count">{nodes.length}</div>
      <div data-testid="edges-count">{edges.length}</div>
      {children}
    </div>
  ),
  Controls: () => <div data-testid="flow-controls" />,
  Background: () => <div data-testid="flow-background" />,
  useNodesState: (initialNodes: any) => [initialNodes, jest.fn(), jest.fn()],
  useEdgesState: (initialEdges: any) => [initialEdges, jest.fn(), jest.fn()],
  addEdge: jest.fn(),
  Handle: ({ type, position }: any) => <div data-testid={`handle-${type}-${position}`} />,
  Position: {
    Top: 'top',
    Bottom: 'bottom',
    Left: 'left',
    Right: 'right',
  },
}));

// Mock react-dnd-html5-backend
jest.mock('react-dnd-html5-backend', () => ({
  HTML5Backend: 'html5-backend-mock',
}));

// Mock react-dnd
jest.mock('react-dnd', () => ({
  DndProvider: ({ children }: any) => <div data-testid="dnd-provider">{children}</div>,
  useDrag: () => [{ isDragging: false }, jest.fn()],
  useDrop: () => [{ isOver: false }, jest.fn()],
}));

describe('FlowDesigner Integration Tests', () => {
  const mockPersonas: PersonaTemplate[] = [
    {
      id: 'p1',
      name: 'Creative Director',
      role: 'Creative Lead',
      expertise: 'Brand Strategy',
      category: 'creative',
    },
    {
      id: 'p2',
      name: 'Business Analyst',
      role: 'Business Expert',
      expertise: 'Market Analysis',
      category: 'business',
    },
    {
      id: 'p3',
      name: 'Research Scientist',
      role: 'Research Lead',
      expertise: 'Data Analysis',
      category: 'research',
    },
  ];

  const renderFlowDesigner = (props: any = {}) => {
    return render(
      <DndProvider backend={HTML5Backend}>
        <FlowDesigner
          personas={mockPersonas}
          {...props}
        />
      </DndProvider>
    );
  };

  test('should render FlowDesigner with all components', () => {
    renderFlowDesigner();

    expect(screen.getByTestId('dnd-provider')).toBeInTheDocument();
    expect(screen.getByText('Persona Library')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Flow Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Flow Description (optional)')).toBeInTheDocument();
    expect(screen.getByText('Save Flow')).toBeInTheDocument();
    expect(screen.getByTestId('react-flow-mock')).toBeInTheDocument();
  });

  test('should display personas in library', () => {
    renderFlowDesigner();

    expect(screen.getByText('Creative Director')).toBeInTheDocument();
    expect(screen.getByText('Business Analyst')).toBeInTheDocument();
    expect(screen.getByText('Research Scientist')).toBeInTheDocument();
    expect(screen.getByText('Creative Lead')).toBeInTheDocument();
    expect(screen.getByText('Business Expert')).toBeInTheDocument();
    expect(screen.getByText('Research Lead')).toBeInTheDocument();
  });

  test('should handle flow name input', () => {
    renderFlowDesigner();

    const nameInput = screen.getByPlaceholderText('Flow Name') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Test Flow Name' } });

    expect(nameInput.value).toBe('Test Flow Name');
  });

  test('should handle flow description input', () => {
    renderFlowDesigner();

    const descriptionInput = screen.getByPlaceholderText('Flow Description (optional)') as HTMLTextAreaElement;
    fireEvent.change(descriptionInput, { target: { value: 'Test flow description' } });

    expect(descriptionInput.value).toBe('Test flow description');
  });

  test('should handle flow category selection', () => {
    renderFlowDesigner();

    const categorySelect = screen.getByDisplayValue('Creative') as HTMLSelectElement;
    fireEvent.change(categorySelect, { target: { value: 'business' } });

    expect(categorySelect.value).toBe('business');
  });

  test('should show action buttons', () => {
    renderFlowDesigner();

    expect(screen.getByText('Add Decision')).toBeInTheDocument();
    expect(screen.getByText('Add Synthesis')).toBeInTheDocument();
    expect(screen.getByText('Save Flow')).toBeInTheDocument();
  });

  test('should alert when saving flow without name', () => {
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    renderFlowDesigner();

    const saveButton = screen.getByText('Save Flow');
    fireEvent.click(saveButton);

    expect(alertSpy).toHaveBeenCalledWith('Please enter a flow name');
    alertSpy.mockRestore();
  });

  test('should call onSave with valid flow data', async () => {
    const mockOnSave = jest.fn();
    renderFlowDesigner({ onSave: mockOnSave });

    // Fill in flow name
    const nameInput = screen.getByPlaceholderText('Flow Name');
    fireEvent.change(nameInput, { target: { value: 'Test Flow' } });

    // Fill in description
    const descriptionInput = screen.getByPlaceholderText('Flow Description (optional)');
    fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });

    // Save the flow
    const saveButton = screen.getByText('Save Flow');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Flow',
          description: 'Test Description',
          category: 'creative',
          nodes: expect.any(Array),
          edges: expect.any(Array),
        })
      );
    });
  });

  test('should call onValidate during save', async () => {
    const mockOnValidate = jest.fn();
    renderFlowDesigner({ onValidate: mockOnValidate });

    // Fill in flow name
    const nameInput = screen.getByPlaceholderText('Flow Name');
    fireEvent.change(nameInput, { target: { value: 'Test Flow' } });

    // Save the flow
    const saveButton = screen.getByText('Save Flow');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnValidate).toHaveBeenCalledWith(
        expect.any(Boolean),
        expect.any(Array)
      );
    });
  });

  test('should load initial flow data', () => {
    const initialFlow: FlowDesign = {
      id: 'test-flow',
      name: 'Initial Flow',
      description: 'Initial Description',
      category: 'business',
      nodes: [
        {
          id: 'node1',
          type: 'persona',
          position: { x: 0, y: 0 },
          data: { label: 'Test Node', personaId: 'p1' },
        },
      ],
      edges: [
        {
          id: 'edge1',
          source: 'node1',
          target: 'node2',
          type: 'default',
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    renderFlowDesigner({ initialFlow });

    expect((screen.getByPlaceholderText('Flow Name') as HTMLInputElement).value).toBe('Initial Flow');
    expect((screen.getByPlaceholderText('Flow Description (optional)') as HTMLTextAreaElement).value).toBe('Initial Description');
    expect((screen.getByDisplayValue('Business') as HTMLSelectElement).value).toBe('business');
  });

  test('should handle drag and drop simulation', () => {
    renderFlowDesigner();

    // Simulate persona drag start
    const personaElement = screen.getByText('Creative Director');
    expect(personaElement).toBeInTheDocument();

    // Simulate drop on canvas
    const canvas = screen.getByTestId('react-flow-mock');
    expect(canvas).toBeInTheDocument();

    // Note: Full drag-and-drop testing requires more complex setup
    // This test verifies the components are present for DnD interaction
  });

  test('should render with empty personas list', () => {
    renderFlowDesigner({ personas: [] });

    expect(screen.getByText('No personas available')).toBeInTheDocument();
    expect(screen.getByText('Create personas in the Persona Manager')).toBeInTheDocument();
  });

  test('should validate flow before saving and show errors', () => {
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    renderFlowDesigner();

    // Fill in flow name but leave empty flow (which should be invalid)
    const nameInput = screen.getByPlaceholderText('Flow Name');
    fireEvent.change(nameInput, { target: { value: 'Invalid Flow' } });

    // Save the flow
    const saveButton = screen.getByText('Save Flow');
    fireEvent.click(saveButton);

    expect(alertSpy).toHaveBeenCalledWith(
      expect.stringContaining('Flow validation failed:')
    );
    alertSpy.mockRestore();
  });

  test('should handle category filtering', () => {
    renderFlowDesigner();

    // All personas should be visible initially
    expect(screen.getByText('Creative Director')).toBeInTheDocument();
    expect(screen.getByText('Business Analyst')).toBeInTheDocument();
    expect(screen.getByText('Research Scientist')).toBeInTheDocument();

    // Note: Category filtering would require additional props/state management
    // This test verifies all personas are rendered when no filter is applied
  });
});
