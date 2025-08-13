"use client"

import { useEffect, useState, useRef, useCallback } from 'react'
import { useHelp, TourStep } from './HelpProvider'

type GuidedTourProps = {
  // No props needed - tour state comes from context
}

export default function GuidedTour({}: GuidedTourProps) {
  const { 
    activeTour, 
    nextTourStep, 
    previousTourStep, 
    skipTour, 
    completeTour,
    trackHelpInteraction
  } = useHelp()
  
  const [highlightPosition, setHighlightPosition] = useState({ top: 0, left: 0, width: 0, height: 0 })
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
  const [isHighlightVisible, setIsHighlightVisible] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const currentStep = activeTour?.steps[activeTour.currentStep] || null
  const isLastStep = activeTour ? activeTour.currentStep === activeTour.steps.length - 1 : false
  const isFirstStep = activeTour ? activeTour.currentStep === 0 : false

  const positionHighlightAndTooltip = useCallback(() => {
    if (!currentStep) return

    const targetElement = document.querySelector(currentStep.target) as HTMLElement
    if (!targetElement) {
      console.warn(`Tour target not found: ${currentStep.target}`)
      return
    }

    const rect = targetElement.getBoundingClientRect()
    const padding = 8

    setHighlightPosition({
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2
    })

    // Position tooltip
    if (tooltipRef.current) {
      const tooltipRect = tooltipRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      
      let tooltipTop = 0
      let tooltipLeft = 0

      // Try to position tooltip to the right of the target
      if (rect.right + 320 <= viewportWidth) {
        tooltipLeft = rect.right + 16
        tooltipTop = rect.top + (rect.height / 2) - (tooltipRect.height / 2)
      }
      // Try to position tooltip to the left of the target
      else if (rect.left - 320 >= 0) {
        tooltipLeft = rect.left - 320 - 16
        tooltipTop = rect.top + (rect.height / 2) - (tooltipRect.height / 2)
      }
      // Position tooltip below the target
      else if (rect.bottom + tooltipRect.height + 16 <= viewportHeight) {
        tooltipLeft = rect.left + (rect.width / 2) - (tooltipRect.width / 2)
        tooltipTop = rect.bottom + 16
      }
      // Position tooltip above the target
      else {
        tooltipLeft = rect.left + (rect.width / 2) - (tooltipRect.width / 2)
        tooltipTop = rect.top - tooltipRect.height - 16
      }

      // Ensure tooltip stays within viewport horizontally
      tooltipLeft = Math.max(16, Math.min(tooltipLeft, viewportWidth - tooltipRect.width - 16))
      
      // Ensure tooltip stays within viewport vertically
      tooltipTop = Math.max(16, Math.min(tooltipTop, viewportHeight - tooltipRect.height - 16))

      setTooltipPosition({ top: tooltipTop, left: tooltipLeft })
    }

    // Scroll target into view if needed
    targetElement.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center',
      inline: 'center'
    })
  }, [currentStep])

  useEffect(() => {
    if (activeTour && currentStep) {
      positionHighlightAndTooltip()
      setIsHighlightVisible(true)
      
      // Track tour step view
      trackHelpInteraction('tour_step_viewed', undefined, `${activeTour.id}_${currentStep.id}`)
    } else {
      setIsHighlightVisible(false)
    }
  }, [activeTour, currentStep, trackHelpInteraction, positionHighlightAndTooltip])

  useEffect(() => {
    const handleResize = () => {
      if (activeTour && currentStep) {
        positionHighlightAndTooltip()
      }
    }

    const handleScroll = () => {
      if (activeTour && currentStep) {
        positionHighlightAndTooltip()
      }
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [activeTour, currentStep, positionHighlightAndTooltip])

  const handleNext = () => {
    if (isLastStep) {
      completeTour()
    } else {
      nextTourStep()
    }
  }

  const handleSkip = () => {
    skipTour()
  }

  const handleBack = () => {
    previousTourStep()
  }

  if (!activeTour || !currentStep || !isHighlightVisible) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* Dark overlay */}
      <div 
        ref={overlayRef}
        className="absolute inset-0 bg-black bg-opacity-50"
        style={{
          clipPath: `polygon(0% 0%, 0% 100%, ${highlightPosition.left}px 100%, ${highlightPosition.left}px ${highlightPosition.top}px, ${highlightPosition.left + highlightPosition.width}px ${highlightPosition.top}px, ${highlightPosition.left + highlightPosition.width}px ${highlightPosition.top + highlightPosition.height}px, ${highlightPosition.left}px ${highlightPosition.top + highlightPosition.height}px, ${highlightPosition.left}px 100%, 100% 100%, 100% 0%)`
        }}
      />

      {/* Highlight ring */}
      <div
        className="absolute border-2 border-blue-500 rounded pointer-events-none"
        style={{
          top: highlightPosition.top,
          left: highlightPosition.left,
          width: highlightPosition.width,
          height: highlightPosition.height,
          boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.2)'
        }}
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute bg-white rounded-lg shadow-xl border border-gray-200 max-w-sm"
        style={{ 
          top: tooltipPosition.top, 
          left: tooltipPosition.left 
        }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {currentStep.title}
            </h3>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">
                {activeTour.currentStep + 1} of {activeTour.steps.length}
              </span>
              <button
                onClick={handleSkip}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div 
              className="bg-blue-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${((activeTour.currentStep + 1) / activeTour.steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <div className="text-gray-700 text-sm leading-relaxed mb-4">
            {currentStep.content}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-lg">
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              {!isFirstStep && currentStep.showBack !== false && (
                <button
                  onClick={handleBack}
                  className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
              )}
            </div>
            
            <div className="flex space-x-2">
              {currentStep.showSkip !== false && (
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Skip Tour
                </button>
              )}
              
              {currentStep.showNext !== false && (
                <button
                  onClick={handleNext}
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  {isLastStep ? 'Complete' : 'Next'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tour info panel (top-right) */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-xs">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-gray-900">{activeTour.name}</h4>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-3">{activeTour.description}</p>
        <div className="text-xs text-gray-500">
          Step {activeTour.currentStep + 1} of {activeTour.steps.length}
        </div>
      </div>
    </div>
  )
}

// Hook for starting specific tours
export function useTour() {
  const { setActiveTour, trackHelpInteraction } = useHelp()
  
  const startTour = (tourId: string) => {
    // Import and start tour
    import('./HelpProvider').then(({ defaultTours, startTour: createTour }) => {
      const tour = createTour(tourId)
      if (tour) {
        setActiveTour(tour)
        trackHelpInteraction('tour_started', undefined, tourId)
      }
    })
  }
  
  return { startTour }
}