"use client"

import { useEffect, useState } from 'react'
import { useHelp, startTour } from './HelpProvider'
import { useTour } from './GuidedTour'

export default function OnboardingFlow() {
  const { 
    showOnboarding, 
    hasCompletedOnboarding, 
    setShowOnboarding,
    setActiveTour,
    trackHelpInteraction
  } = useHelp()
  const { startTour: startTourFunction } = useTour()
  const [showWelcome, setShowWelcome] = useState(false)

  // Check if user should see onboarding on mount
  useEffect(() => {
    // Check if user has seen onboarding before (localStorage)
    const hasSeenOnboarding = localStorage.getItem('ai-council-onboarding-completed')
    
    if (!hasSeenOnboarding && !hasCompletedOnboarding) {
      // First time user - show welcome modal
      setShowWelcome(true)
      trackHelpInteraction('onboarding_triggered', undefined, 'welcome')
    }
  }, [hasCompletedOnboarding, trackHelpInteraction])

  // Handle onboarding completion
  useEffect(() => {
    if (hasCompletedOnboarding) {
      localStorage.setItem('ai-council-onboarding-completed', 'true')
      setShowOnboarding(false)
    }
  }, [hasCompletedOnboarding, setShowOnboarding])

  const handleStartTour = () => {
    // Hide popup immediately, then start the tour
    setShowWelcome(false)
    startTourFunction('first-debate')
    trackHelpInteraction('onboarding_started', undefined, 'first-debate')
  }

  const handleSkipOnboarding = () => {
    setShowWelcome(false)
    setShowOnboarding(false)
    localStorage.setItem('ai-council-onboarding-completed', 'true')
    trackHelpInteraction('onboarding_skipped')
  }

  const handleShowHelp = () => {
    setShowWelcome(false)
    // Could open help modal here if needed
    trackHelpInteraction('onboarding_help_clicked')
  }

  if (!showWelcome) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-40">
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
            Welcome to AI Council!
          </h2>
          <p className="text-center text-gray-600">
            Let&apos;s help you get started with creating your first multi-persona debate discussion.
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-sm font-semibold text-blue-600">1</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Choose Your Topic</h3>
                <p className="text-sm text-gray-600">Enter a question or topic you&apos;d like to explore from multiple perspectives.</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-sm font-semibold text-blue-600">2</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Meet Your AI Personas</h3>
                <p className="text-sm text-gray-600">Each persona brings a unique perspective - from empathy to skepticism to moderation.</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-sm font-semibold text-blue-600">3</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Watch the Discussion Unfold</h3>
                <p className="text-sm text-gray-600">Guide the conversation through structured rounds and get comprehensive analysis.</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-blue-800">
                <strong>Tip:</strong> The guided tour takes just 2-3 minutes and shows you exactly how everything works.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleStartTour}
              className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              🚀 Start Interactive Tour
            </button>
            
            <div className="flex space-x-3">
              <button
                onClick={handleShowHelp}
                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                📚 Browse Help
              </button>
              
              <button
                onClick={handleSkipOnboarding}
                className="flex-1 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:text-gray-800 hover:bg-gray-100 transition-colors"
              >
                Skip for Now
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-xl border-t border-gray-200">
          <p className="text-xs text-center text-gray-500">
            You can always access help and tutorials from the help menu at any time.
          </p>
        </div>
      </div>
    </div>
  )
}

// Hook for programmatically triggering onboarding
export function useOnboarding() {
  const { setShowOnboarding } = useHelp()
  
  const triggerOnboarding = () => {
    // Remove completed flag to show onboarding again
    localStorage.removeItem('ai-council-onboarding-completed')
    setShowOnboarding(true)
  }
  
  const resetOnboarding = () => {
    localStorage.removeItem('ai-council-onboarding-completed')
    // Reload to trigger fresh onboarding check
    window.location.reload()
  }
  
  return { triggerOnboarding, resetOnboarding }
}