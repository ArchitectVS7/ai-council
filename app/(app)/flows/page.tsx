import { getWorkflowTemplates } from '@/lib/db/queries'
import FlowsClient from './FlowsClient'

export default async function FlowsPage() {
  const workflowTemplates = await getWorkflowTemplates()
  
  // Transform workflow templates to flows format for display
  const flows = workflowTemplates.map(template => ({
    id: template.id.toString(),
    name: template.name,
    description: template.description || '',
    category: template.category,
    personas: template.nodes.filter(node => node.type === 'agent').length,
    rounds: 1, // Default rounds for templates
    lastModified: template.createdAt ? new Date(template.createdAt).toISOString().split('T')[0] : 'Unknown',
    isTemplate: true
  }))

  return <FlowsClient flows={flows} />
}