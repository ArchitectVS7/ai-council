import './globals.css'

import type { ReactNode } from 'react'

export const metadata = {
  title: 'AI Council',
  description: 'Convene a panel of AI personas on a topic.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
