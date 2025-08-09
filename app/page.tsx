import Link from 'next/link'
import DiscussionArena from '@/components/discussion-arena'
import { HelpMenuTrigger, FloatingHelpButton, OnboardingTrigger } from '@/components/help/HelpTrigger'

export const dynamic = 'force-dynamic'

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center p-6">
      {/* Header with Help Menu */}
      <div className="w-full max-w-7xl flex justify-between items-start mb-8">
        <div></div>
        <div className="flex items-center space-x-4">
          <OnboardingTrigger className="bg-blue-600 text-white hover:bg-blue-700" />
          <HelpMenuTrigger />
        </div>
      </div>

      <h1 className="pt-8 pb-4 bg-gradient-to-br from-black via-[#171717] to-[#575757] bg-clip-text text-center text-4xl font-medium tracking-tight text-transparent md:text-6xl">
        AI Council
      </h1>
      <p className="text-gray-600 text-center max-w-2xl">
        Multi-persona collaboration platform for creative ideation, strategic planning, and expert analysis. The original Postgres demo is available at{' '}
        <Link href="/starter" className="underline underline-offset-4">/starter</Link>.
      </p>

      <div className="mt-8 w-full">
        <DiscussionArena />
      </div>

      {/* Floating Help Button */}
      <FloatingHelpButton section="getting-started" />
    </main>
  )
}
