"use client"

import { useHelp, HelpSection } from './HelpProvider'
import { useTour } from './GuidedTour'

type HelpTriggerProps = {
  variant?: 'button' | 'icon' | 'text' | 'floating'
  size?: 'sm' | 'md' | 'lg'
  section?: HelpSection
  tourId?: string
  className?: string
  children?: React.ReactNode
  label?: string
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}

export default function HelpTrigger({
  variant = 'button',
  size = 'md',
  section,
  tourId,
  className = '',
  children,
  label,
  position = 'bottom-right'
}: HelpTriggerProps) {
  const { setHelpModalOpen, setCurrentHelpSection, trackHelpInteraction } = useHelp()
  const { startTour } = useTour()

  const handleClick = () => {
    if (tourId) {
      startTour(tourId)
      trackHelpInteraction('tour_triggered', section, tourId)
    } else {
      setHelpModalOpen(true)
      if (section) {
        setCurrentHelpSection(section)
      }
      trackHelpInteraction('help_modal_opened', section)
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs px-2 py-1'
      case 'md':
        return 'text-sm px-3 py-2'
      case 'lg':
        return 'text-base px-4 py-2'
      default:
        return 'text-sm px-3 py-2'
    }
  }

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4'
      case 'md':
        return 'w-5 h-5'
      case 'lg':
        return 'w-6 h-6'
      default:
        return 'w-5 h-5'
    }
  }

  const getVariantClasses = () => {
    switch (variant) {
      case 'button':
        return `inline-flex items-center ${getSizeClasses()} bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors font-medium`
      case 'icon':
        return `inline-flex items-center justify-center p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-full transition-colors`
      case 'text':
        return `inline-flex items-center text-blue-600 hover:text-blue-800 underline underline-offset-2 transition-colors`
      case 'floating':
        return `fixed z-40 flex items-center justify-center w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-105 ${getFloatingPosition()}`
      default:
        return `inline-flex items-center ${getSizeClasses()} bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors font-medium`
    }
  }

  const getFloatingPosition = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4'
      case 'top-left':
        return 'top-4 left-4'
      case 'bottom-right':
        return 'bottom-4 right-4'
      case 'bottom-left':
        return 'bottom-4 left-4'
      default:
        return 'bottom-4 right-4'
    }
  }

  const getHelpIcon = () => (
    <svg className={getIconSize()} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )

  const getTourIcon = () => (
    <svg className={getIconSize()} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  )

  const renderContent = () => {
    if (children) {
      return children
    }

    const icon = tourId ? getTourIcon() : getHelpIcon()
    const text = label || (tourId ? 'Start Tour' : 'Help')

    switch (variant) {
      case 'icon':
        return icon
      case 'text':
        return (
          <>
            {icon}
            <span className="ml-1">{text}</span>
          </>
        )
      case 'floating':
        return icon
      default:
        return (
          <>
            {icon}
            <span className="ml-2">{text}</span>
          </>
        )
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`${getVariantClasses()} ${className}`}
      title={label || (tourId ? 'Start interactive tour' : 'Open help')}
    >
      {renderContent()}
    </button>
  )
}

// Specialized help trigger components

export function QuickHelpButton({ 
  section, 
  className = '', 
  size = 'sm' 
}: { 
  section: HelpSection
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  return (
    <HelpTrigger
      variant="icon"
      size={size}
      section={section}
      className={className}
      label="Quick help for this section"
    />
  )
}

export function TourButton({ 
  tourId, 
  label, 
  className = '' 
}: { 
  tourId: string
  label?: string
  className?: string 
}) {
  return (
    <HelpTrigger
      variant="button"
      tourId={tourId}
      label={label}
      className={className}
    />
  )
}

export function FloatingHelpButton({ 
  position = 'bottom-right',
  section 
}: { 
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  section?: HelpSection 
}) {
  return (
    <HelpTrigger
      variant="floating"
      position={position}
      section={section}
    />
  )
}

export function InlineHelpText({ 
  section, 
  text = 'Learn more',
  className = '' 
}: { 
  section: HelpSection
  text?: string
  className?: string 
}) {
  return (
    <HelpTrigger
      variant="text"
      section={section}
      label={text}
      className={className}
    />
  )
}

// Context-aware help triggers
export function ContextHelpButton({ 
  context,
  className = '',
  size = 'sm'
}: { 
  context: 'personas' | 'flows' | 'discussions' | 'analysis' | 'reports' | 'import-export'
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const sectionMap: Record<string, HelpSection> = {
    personas: 'personas',
    flows: 'flows',
    discussions: 'discussions', 
    analysis: 'analysis',
    reports: 'reports',
    'import-export': 'import-export'
  }

  return (
    <QuickHelpButton
      section={sectionMap[context]}
      className={className}
      size={size}
    />
  )
}

// Onboarding trigger
export function OnboardingTrigger({ className = '' }: { className?: string }) {
  return (
    <TourButton
      tourId="first-debate"
      label="Take Tour"
      className={className}
    />
  )
}

// Help menu trigger
export function HelpMenuTrigger({ className = '' }: { className?: string }) {
  const { setHelpModalOpen } = useHelp()
  
  return (
    <button
      onClick={() => setHelpModalOpen(true)}
      className={`flex items-center px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors ${className}`}
    >
      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Help & Documentation
    </button>
  )
}