"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react'

// Help content types
export type HelpSection = 
  | 'getting-started'
  | 'personas'
  | 'flows'
  | 'discussions'
  | 'analysis'
  | 'import-export'
  | 'reports'
  | 'troubleshooting'

export type HelpContent = {
  id: string
  title: string
  section: HelpSection
  content: string
  keywords: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  relatedTopics: string[]
}

export type TooltipContent = {
  id: string
  title: string
  description: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

export type TourStep = {
  id: string
  target: string
  title: string
  content: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  showNext?: boolean
  showBack?: boolean
  showSkip?: boolean
}

export type GuidedTour = {
  id: string
  name: string
  description: string
  steps: TourStep[]
  isActive: boolean
  currentStep: number
}

// Context types
type HelpContextType = {
  // Help modal state
  isHelpModalOpen: boolean
  currentHelpSection: HelpSection | null
  searchQuery: string
  setHelpModalOpen: (open: boolean) => void
  setCurrentHelpSection: (section: HelpSection | null) => void
  setSearchQuery: (query: string) => void
  
  // Tooltip state
  activeTooltip: string | null
  setActiveTooltip: (id: string | null) => void
  
  // Tour state
  activeTour: GuidedTour | null
  setActiveTour: (tour: GuidedTour | null) => void
  nextTourStep: () => void
  previousTourStep: () => void
  skipTour: () => void
  completeTour: () => void
  
  // Help content
  helpContent: HelpContent[]
  getHelpContent: (section: HelpSection) => HelpContent[]
  searchHelpContent: (query: string) => HelpContent[]
  
  // User preferences
  showOnboarding: boolean
  hasCompletedOnboarding: boolean
  setShowOnboarding: (show: boolean) => void
  setHasCompletedOnboarding: (completed: boolean) => void
  
  // Analytics
  trackHelpInteraction: (action: string, section?: string, item?: string) => void
}

const HelpContext = createContext<HelpContextType | null>(null)

// Sample help content data
const sampleHelpContent: HelpContent[] = [
  {
    id: 'getting-started-intro',
    title: 'What is AI Council?',
    section: 'getting-started',
    content: 'AI Council is a sophisticated multi-persona discussion simulator that orchestrates discussions between different AI personas to explore topics from multiple perspectives.',
    keywords: ['introduction', 'overview', 'multi-persona', 'discussion', 'debate'],
    difficulty: 'beginner',
    relatedTopics: ['personas-basics', 'flows-intro']
  },
  {
    id: 'personas-basics',
    title: 'Understanding Personas',
    section: 'personas',
    content: 'Personas are AI participants with distinct roles, perspectives, and analytical approaches. Each persona has a name, role, task, and optional advanced configuration.',
    keywords: ['personas', 'participants', 'roles', 'tasks', 'configuration'],
    difficulty: 'beginner',
    relatedTopics: ['flows-intro', 'personas-advanced']
  },
  {
    id: 'flows-intro',
    title: 'Flow Design Basics',
    section: 'flows',
    content: 'Flows define how personas interact in sequence. They create structured discussions that progress logically from initial perspectives to final analysis.',
    keywords: ['flows', 'sequence', 'structure', 'progression', 'design'],
    difficulty: 'beginner',
    relatedTopics: ['personas-basics', 'discussions-execution']
  },
  {
    id: 'discussions-execution',
    title: 'Running a Debate',
    section: 'discussions',
    content: 'Start discussions by entering a topic, then click through each step as personas contribute their perspectives. The system guides you through the entire process.',
    keywords: ['debate', 'execution', 'topics', 'running', 'process'],
    difficulty: 'beginner',
    relatedTopics: ['flows-intro', 'analysis-basics']
  },
  {
    id: 'analysis-basics',
    title: 'Understanding Analysis',
    section: 'analysis',
    content: 'The analysis system extracts key insights, bullet points, and recommendations from debate transcripts to provide structured conclusions.',
    keywords: ['analysis', 'insights', 'bullet points', 'conclusions', 'recommendations'],
    difficulty: 'intermediate',
    relatedTopics: ['reports-generation', 'discussions-execution']
  },
  {
    id: 'import-export-basics',
    title: 'Sharing Configurations',
    section: 'import-export',
    content: 'Export your persona and flow configurations to JSON files for sharing with others or backup. Import configurations to quickly set up proven debate structures.',
    keywords: ['import', 'export', 'sharing', 'configurations', 'backup', 'JSON'],
    difficulty: 'intermediate',
    relatedTopics: ['personas-advanced', 'flows-advanced']
  },
  {
    id: 'reports-generation',
    title: 'Generating Reports',
    section: 'reports',
    content: 'Create professional reports from your discussions in multiple formats: comprehensive, executive summary, transcript only, or analysis only.',
    keywords: ['reports', 'generation', 'formats', 'documentation', 'export'],
    difficulty: 'beginner',
    relatedTopics: ['analysis-basics', 'discussions-execution']
  }
]

// Sample guided tours
const defaultTours: GuidedTour[] = [
  {
    id: 'first-debate',
    name: 'Create Your First Debate',
    description: 'Learn the basics by setting up and running your first AI Council debate',
    isActive: false,
    currentStep: 0,
    steps: [
      {
        id: 'welcome',
        target: 'body',
        title: 'Welcome to AI Council!',
        content: 'Let\'s take a quick tour to show you how to create your first debate. This will only take a few minutes.',
        placement: 'bottom',
        showNext: true,
        showSkip: true
      },
      {
        id: 'topic-input',
        target: '[data-help="topic-input"]',
        title: 'Enter Your Topic',
        content: 'Start by entering a topic you\'d like to explore. Try something like "Should remote work be permanent?" or "How can cities reduce carbon emissions?"',
        placement: 'bottom',
        showNext: true,
        showBack: true,
        showSkip: true
      },
      {
        id: 'persona-review',
        target: '[data-help="persona-panel"]',
        title: 'Review Personas',
        content: 'These are your AI debate participants. Each has a unique role and perspective. The default personas work great for getting started.',
        placement: 'right',
        showNext: true,
        showBack: true,
        showSkip: true
      },
      {
        id: 'start-debate',
        target: '[data-help="start-button"]',
        title: 'Start the Debate',
        content: 'Click here to begin your debate. Each persona will contribute their perspective in sequence.',
        placement: 'top',
        showNext: true,
        showBack: true,
        showSkip: true
      }
    ]
  },
  {
    id: 'persona-editing',
    name: 'Customizing Personas',
    description: 'Learn how to create and edit personas to match your specific needs',
    isActive: false,
    currentStep: 0,
    steps: [
      {
        id: 'persona-editor-intro',
        target: '[data-help="persona-editor"]',
        title: 'Persona Editor',
        content: 'Here you can create, edit, and manage your AI debate participants. Each persona brings a unique perspective to discussions.',
        placement: 'right',
        showNext: true,
        showSkip: true
      },
      {
        id: 'persona-form',
        target: '[data-help="persona-form"]',
        title: 'Persona Configuration',
        content: 'Define your persona\'s name, role, and task. The task field is especially important - it tells the AI how to approach topics.',
        placement: 'left',
        showNext: true,
        showBack: true,
        showSkip: true
      },
      {
        id: 'persona-parameters',
        target: '[data-help="persona-parameters"]',
        title: 'Advanced Parameters',
        content: 'Use parameters for fine-tuning persona behavior, like expertise level or response style.',
        placement: 'top',
        showNext: true,
        showBack: true,
        showSkip: true
      }
    ]
  }
]

export function HelpProvider({ children }: { children: ReactNode }) {
  // Help modal state
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false)
  const [currentHelpSection, setCurrentHelpSection] = useState<HelpSection | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Tooltip state
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)
  
  // Tour state
  const [activeTour, setActiveTour] = useState<GuidedTour | null>(null)
  
  // User preferences
  const [showOnboarding, setShowOnboarding] = useState(true)
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false)
  
  // Help content
  const [helpContent] = useState<HelpContent[]>(sampleHelpContent)

  const setHelpModalOpen = (open: boolean) => {
    setIsHelpModalOpen(open)
    if (!open) {
      setCurrentHelpSection(null)
      setSearchQuery('')
    }
  }

  const getHelpContent = (section: HelpSection): HelpContent[] => {
    return helpContent.filter(content => content.section === section)
  }

  const searchHelpContent = (query: string): HelpContent[] => {
    if (!query.trim()) return helpContent

    const lowerQuery = query.toLowerCase()
    return helpContent.filter(content => 
      content.title.toLowerCase().includes(lowerQuery) ||
      content.content.toLowerCase().includes(lowerQuery) ||
      content.keywords.some(keyword => keyword.toLowerCase().includes(lowerQuery))
    )
  }

  const nextTourStep = () => {
    if (!activeTour) return
    
    if (activeTour.currentStep < activeTour.steps.length - 1) {
      setActiveTour({
        ...activeTour,
        currentStep: activeTour.currentStep + 1
      })
    } else {
      completeTour()
    }
  }

  const previousTourStep = () => {
    if (!activeTour) return
    
    if (activeTour.currentStep > 0) {
      setActiveTour({
        ...activeTour,
        currentStep: activeTour.currentStep - 1
      })
    }
  }

  const skipTour = () => {
    setActiveTour(null)
    trackHelpInteraction('tour_skipped', undefined, activeTour?.id)
  }

  const completeTour = () => {
    const tourId = activeTour?.id
    setActiveTour(null)
    
    if (tourId === 'first-debate') {
      setHasCompletedOnboarding(true)
    }
    
    trackHelpInteraction('tour_completed', undefined, tourId)
  }

  const trackHelpInteraction = (action: string, section?: string, item?: string) => {
    // In a real application, this would send analytics data
    console.log('Help interaction:', { action, section, item, timestamp: new Date().toISOString() })
  }

  const value: HelpContextType = {
    // Help modal state
    isHelpModalOpen,
    currentHelpSection,
    searchQuery,
    setHelpModalOpen,
    setCurrentHelpSection,
    setSearchQuery,
    
    // Tooltip state
    activeTooltip,
    setActiveTooltip,
    
    // Tour state
    activeTour,
    setActiveTour,
    nextTourStep,
    previousTourStep,
    skipTour,
    completeTour,
    
    // Help content
    helpContent,
    getHelpContent,
    searchHelpContent,
    
    // User preferences
    showOnboarding,
    hasCompletedOnboarding,
    setShowOnboarding,
    setHasCompletedOnboarding,
    
    // Analytics
    trackHelpInteraction
  }

  return (
    <HelpContext.Provider value={value}>
      {children}
    </HelpContext.Provider>
  )
}

export function useHelp() {
  const context = useContext(HelpContext)
  if (!context) {
    throw new Error('useHelp must be used within a HelpProvider')
  }
  return context
}

// Utility function to start a tour
export function startTour(tourId: string) {
  const tour = defaultTours.find(t => t.id === tourId)
  if (!tour) return null
  
  return {
    ...tour,
    isActive: true,
    currentStep: 0
  }
}

export { defaultTours }