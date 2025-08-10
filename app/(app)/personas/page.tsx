import { getAgentTemplates } from '@/lib/db/queries'
import PersonasClient from './PersonasClient'

export default async function PersonasPage() {
  const agentTemplates = await getAgentTemplates()
  
  // Transform agent templates to personas format for display
  const personas = agentTemplates.map(template => ({
    id: template.id,
    name: template.name,
    role: template.role,
    task: template.task,
    category: template.category,
    isCustom: template.id > 13 // Templates with ID > 13 are custom
  }))

  return <PersonasClient personas={personas} />
}