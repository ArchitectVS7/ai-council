import { DashboardLayout } from '@/components/layout/AppLayout'
import { getDebatesWithMessages } from '@/lib/db/queries'
import SessionsClient from './SessionsClient'

export default async function SessionsPage() {
  const debates = await getDebatesWithMessages()
  
  // Transform debates to sessions format for display
  const sessions = debates.map(debate => ({
    id: debate.id.toString(),
    title: debate.topic,
    template: 'Debate Session',
    status: debate.status as 'completed' | 'in-progress' | 'draft',
    createdAt: debate.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: debate.updatedAt?.toISOString() || new Date().toISOString(),
    duration: calculateDuration(debate.startedAt, debate.completedAt),
    totalMessages: debate.messages.length,
    personas: Array.from(new Set(debate.messages.map(m => m.personaName))),
    insights: Math.floor(debate.messages.length / 3), // Rough estimate
    deliverables: [] // Could be calculated based on debate structure
  }))

  return <SessionsClient sessions={sessions} />
}

function calculateDuration(startedAt: Date | null, completedAt: Date | null): string {
  if (!startedAt || !completedAt) return 'Unknown'
  
  const diff = completedAt.getTime() - startedAt.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}