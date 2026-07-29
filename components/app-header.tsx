'use client'

/**
 * The application header (T-032, convener finding at the T-024 gate).
 *
 * This is the *only* navigation in the app. It is rendered once, by the root
 * layout, so every route carries the same wordmark home and the same three
 * links; pages must not render their own link rows. The finding it fixes: on
 * `/personas` and `/councils` the only way back used to be a small underlined
 * "Sessions" text link that read as a sibling page rather than home.
 *
 * A client component only because marking the current entry needs the pathname.
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'

/** The nav, in the order the convener reads it. */
const NAV = [
  { href: '/', label: 'Sessions' },
  { href: '/personas', label: 'Personas' },
  { href: '/councils', label: 'Councils' },
] as const

/**
 * Whether a nav entry is the page being viewed.
 *
 * `/sessions/[id]` is a session, so **Sessions** stays marked inside the
 * chamber — the point of the finding is that there is always an obvious way
 * home. An unrecognised pathname simply marks nothing; no entry is guessed.
 */
function isCurrent(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/' || pathname.startsWith('/sessions')
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function AppHeader() {
  // `usePathname` answers null outside a mounted route; treat it as "no match".
  const pathname = usePathname() ?? ''

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          AI Council
        </Link>
        <nav aria-label="Main" className="flex gap-4 text-sm">
          {NAV.map((entry) => {
            const current = isCurrent(entry.href, pathname)
            return (
              <Link
                key={entry.href}
                href={entry.href}
                aria-current={current ? 'page' : undefined}
                className={
                  current ? 'font-medium text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }
              >
                {entry.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
