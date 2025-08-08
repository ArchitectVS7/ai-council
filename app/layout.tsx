import './globals.css'
import { Inter } from 'next/font/google'

export const metadata = {
  metadataBase: new URL('https://ai-council.local'),
  title: 'AI Council',
  description: 'Configurable multi-persona AI discussion simulator',
}

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.variable}>{children}</body>
    </html>
  )
}
