import './globals.css'

import type { ReactNode } from 'react'

import AppHeader from '@/components/app-header'

export const metadata = {
  title: 'AI Council',
  description: 'Convene a panel of AI personas on a topic.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Rendered here and nowhere else: the layout wraps every route, so one
            header covers all of them and no page owns its own navigation. */}
        <AppHeader />
        {children}
      </body>
    </html>
  )
}
