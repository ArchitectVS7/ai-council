import { DashboardLayout } from '@/components/layout/AppLayout'
import DiscussionArena from '@/components/discussion-arena'

export const dynamic = 'force-dynamic'

export default function NewDiscussionPage() {
  return (
    <DashboardLayout currentPage="discussion">
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">New Discussion</h1>
          <p className="mt-2 text-gray-600">
            Start a new collaborative session with AI expert personas. Select a workflow template 
            or use the default discussion format to explore your topic.
          </p>
        </div>

        {/* Discussion Arena */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <DiscussionArena />
        </div>
      </div>
    </DashboardLayout>
  )
}