import { DashboardLayout } from '@/components/layout/AppLayout'
import Link from 'next/link'
import { getDashboardStats } from '@/lib/db/queries'

export default async function DashboardPage() {
  const { stats, recentDebates, recentExecutions } = await getDashboardStats()
  
  // Transform debates into sessions format for display
  const recentSessions = recentDebates.map(debate => ({
    id: debate.id.toString(),
    title: debate.topic,
    template: 'Debate Session',
    date: debate.createdAt ? new Date(debate.createdAt).toISOString().split('T')[0] : 'Unknown',
    status: debate.status === 'completed' ? 'completed' : 'in-progress'
  }))

  const quickStats = {
    totalSessions: stats.totalDebates,
    activeFlows: stats.workflowTemplates,
    customPersonas: Math.max(0, stats.agentTemplates - 13), // Subtract default templates
    totalPersonas: stats.agentTemplates
  }

  return (
    <DashboardLayout currentPage="dashboard">
      <div className="space-y-8">
        {/* Welcome Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Welcome to AI Council. Start a new collaborative discussion or continue where you left off.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link
            href="/discussion"
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-6 transition-colors group"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">💬</span>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium">New Discussion</h3>
                <p className="text-blue-100">Start collaborating</p>
              </div>
            </div>
          </Link>

          <Link
            href="/flows"
            className="bg-white hover:bg-gray-50 border border-gray-200 rounded-lg p-6 transition-colors group"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">🔄</span>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Manage Flows</h3>
                <p className="text-gray-600">Create & edit flows</p>
              </div>
            </div>
          </Link>

          <Link
            href="/personas"
            className="bg-white hover:bg-gray-50 border border-gray-200 rounded-lg p-6 transition-colors group"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">👥</span>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Persona Library</h3>
                <p className="text-gray-600">{quickStats.totalPersonas} available</p>
              </div>
            </div>
          </Link>

          <Link
            href="/sessions"
            className="bg-white hover:bg-gray-50 border border-gray-200 rounded-lg p-6 transition-colors group"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">📚</span>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Session History</h3>
                <p className="text-gray-600">{quickStats.totalSessions} sessions</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Stats Overview */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Quick Stats</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{quickStats.totalSessions}</div>
                <div className="text-sm text-gray-600">Total Sessions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{quickStats.activeFlows}</div>
                <div className="text-sm text-gray-600">Active Flows</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{quickStats.customPersonas}</div>
                <div className="text-sm text-gray-600">Custom Personas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{quickStats.totalPersonas}</div>
                <div className="text-sm text-gray-600">Total Personas</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Recent Sessions</h2>
            <Link 
              href="/sessions"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View All
            </Link>
          </div>
          <div className="divide-y divide-gray-200">
            {recentSessions.map((session) => (
              <div key={session.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{session.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{session.template}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        session.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {session.status === 'completed' ? 'Completed' : 'In Progress'}
                    </span>
                    <span className="text-sm text-gray-500">{session.date}</span>
                    <Link
                      href={`/sessions/${session.id}`}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      View →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}