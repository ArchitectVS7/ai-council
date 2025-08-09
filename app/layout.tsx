import './globals.css'
import { Inter } from 'next/font/google'
import { HelpProvider } from '@/components/help/HelpProvider'
import HelpSystem from '@/components/help/HelpSystem'
import GuidedTour from '@/components/help/GuidedTour'
import OnboardingFlow from '@/components/help/OnboardingFlow'

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
      <body className={inter.variable}>
        <HelpProvider>
          {children}
          <HelpSystem />
          <GuidedTour />
          <OnboardingFlow />
        </HelpProvider>
      </body>
    </html>
  )
}
