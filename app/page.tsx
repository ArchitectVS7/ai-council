import Link from 'next/link'
import DebateArena from '@/components/debate-arena'

export const dynamic = 'force-dynamic'

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center p-6">
      <h1 className="pt-8 pb-4 bg-gradient-to-br from-black via-[#171717] to-[#575757] bg-clip-text text-center text-4xl font-medium tracking-tight text-transparent md:text-6xl">
        AI Council
      </h1>
      <p className="text-gray-600 text-center max-w-2xl">
        Configurable multi-persona discussion simulator. The original Postgres demo is available at{' '}
        <Link href="/starter" className="underline underline-offset-4">/starter</Link>.
      </p>

      <div className="mt-8 w-full">
        <DebateArena />
      </div>
    </main>
  )
}
