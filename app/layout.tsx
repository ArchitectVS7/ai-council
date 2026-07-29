import './globals.css'

import Link from 'next/link'
import type { ReactNode } from 'react'

export const metadata = {
  title: 'AI Council',
  description: 'Convene a panel of AI personas on a topic.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-3">
            <Link href="/" className="text-sm font-semibold tracking-tight">
              AI Council
            </Link>
            <nav className="flex gap-4 text-sm text-slate-600">
              <Link href="/" className="hover:text-slate-900">
                Sessions
              </Link>
              <Link href="/personas" className="hover:text-slate-900">
                Personas
              </Link>
              <Link href="/councils" className="hover:text-slate-900">
                Councils
              </Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  )
}
