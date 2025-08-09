"use client"

import { useEffect, useRef, useState } from 'react'
import { useHelp, TooltipContent } from './HelpProvider'

type TooltipHelperProps = {
  id: string
  title: string
  content: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  trigger?: 'hover' | 'click' | 'focus'
  delay?: number
  children: React.ReactNode
  className?: string
}

// Predefined tooltip content for common UI elements
const tooltipDatabase: Record<string, TooltipContent> = {
  'topic-input': {
    id: 'topic-input',
    title: 'Topic Input',
    description: 'Enter the topic or question you want your AI personas to discuss. Be specific for better results. Example: "Should remote work be permanent for tech companies?"',
    placement: 'bottom'
  },
  'start-button': {
    id: 'start-button',
    title: 'Start Debate',
    description: 'Begin the debate with your current configuration. This will execute your flow step by step, allowing each persona to contribute their perspective.',
    placement: 'top'
  },
  'continue-button': {
    id: 'continue-button', 
    title: 'Continue Debate',
    description: 'Advance to the next step in your debate flow. Each click will prompt the next persona to contribute.',
    placement: 'top'
  },
  'reset-button': {
    id: 'reset-button',
    title: 'Reset Debate',
    description: 'Clear the current debate and start fresh. This will preserve your persona and flow settings but clear all messages.',
    placement: 'top'
  },
  'persona-name': {
    id: 'persona-name',
    title: 'Persona Name',
    description: 'A descriptive name for this AI participant. Should be clear and unique. Examples: "Technical Expert", "Ethics Advocate", "Market Analyst"',
    placement: 'right'
  },
  'persona-role': {
    id: 'persona-role',
    title: 'Persona Role',
    description: 'A brief description of this persona\'s perspective or expertise. This helps define their analytical approach.',
    placement: 'right'
  },
  'persona-task': {
    id: 'persona-task',
    title: 'Persona Task',
    description: 'Detailed instructions for what this persona should do. Be specific about the type of analysis or perspective they should provide.',
    placement: 'right'
  },
  'flow-editor': {
    id: 'flow-editor',
    title: 'Flow Editor',
    description: 'Design the sequence of persona interactions. Drag and drop to reorder, or click to add/remove personas from your flow.',
    placement: 'left'
  },
  'round-counter': {
    id: 'round-counter',
    title: 'Round Progress',
    description: 'Shows the current round and total planned rounds. Each round is a complete cycle through your flow.',
    placement: 'bottom'
  },
  'bullet-points': {
    id: 'bullet-points',
    title: 'Key Points',
    description: 'Important points automatically extracted from moderator responses. These are used in the final analysis.',
    placement: 'left'
  },
  'debug-log': {
    id: 'debug-log',
    title: 'Debug Log',
    description: 'Technical information about the debate execution, including API calls, errors, and system events. Useful for troubleshooting.',
    placement: 'top'
  },
  'export-button': {
    id: 'export-button',
    title: 'Export Configuration',
    description: 'Download your current persona and flow setup as a JSON file for sharing or backup.',
    placement: 'top'
  },
  'import-button': {
    id: 'import-button',
    title: 'Import Configuration',
    description: 'Load a previously exported configuration from a JSON file to quickly set up proven debate structures.',
    placement: 'top'
  },
  'generate-report': {
    id: 'generate-report',
    title: 'Generate Report',
    description: 'Create a comprehensive document of your debate including transcript, analysis, and insights in various formats.',
    placement: 'top'
  }
}

export default function TooltipHelper({
  id,
  title,
  content,
  placement = 'top',
  trigger = 'hover',
  delay = 300,
  children,
  className = ''
}: TooltipHelperProps) {
  const { activeTooltip, setActiveTooltip, trackHelpInteraction } = useHelp()
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Use predefined content if available
  const tooltipContent = tooltipDatabase[id] || { id, title, description: content, placement }

  const showTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    
    timeoutRef.current = setTimeout(() => {
      setActiveTooltip(id)
      setIsVisible(true)
      updatePosition()
      trackHelpInteraction('tooltip_shown', undefined, id)
    }, delay)
  }

  const hideTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    
    setIsVisible(false)
    setActiveTooltip(null)
  }

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let top = 0
    let left = 0

    switch (tooltipContent.placement || placement) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - 8
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2
        break
      case 'bottom':
        top = triggerRect.bottom + 8
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2
        break
      case 'left':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2
        left = triggerRect.left - tooltipRect.width - 8
        break
      case 'right':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2
        left = triggerRect.right + 8
        break
    }

    // Adjust for viewport bounds
    if (left < 8) left = 8
    if (left + tooltipRect.width > viewportWidth - 8) {
      left = viewportWidth - tooltipRect.width - 8
    }
    if (top < 8) top = 8
    if (top + tooltipRect.height > viewportHeight - 8) {
      top = viewportHeight - tooltipRect.height - 8
    }

    setPosition({ top, left })
  }

  useEffect(() => {
    if (isVisible && tooltipRef.current) {
      updatePosition()
    }
  }, [isVisible])

  useEffect(() => {
    const handleResize = () => {
      if (isVisible) updatePosition()
    }

    const handleScroll = () => {
      if (isVisible) updatePosition()
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [isVisible])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleTriggerEvent = () => {
    if (trigger === 'click') {
      if (isVisible) {
        hideTooltip()
      } else {
        showTooltip()
      }
    }
  }

  const getArrowClasses = () => {
    const arrowPlacement = tooltipContent.placement || placement
    const baseClasses = 'absolute w-2 h-2 bg-gray-800 transform rotate-45'
    
    switch (arrowPlacement) {
      case 'top':
        return `${baseClasses} -bottom-1 left-1/2 -translate-x-1/2`
      case 'bottom':
        return `${baseClasses} -top-1 left-1/2 -translate-x-1/2`
      case 'left':
        return `${baseClasses} -right-1 top-1/2 -translate-y-1/2`
      case 'right':
        return `${baseClasses} -left-1 top-1/2 -translate-y-1/2`
      default:
        return `${baseClasses} -bottom-1 left-1/2 -translate-x-1/2`
    }
  }

  return (
    <>
      <div
        ref={triggerRef}
        className={`relative ${className}`}
        onMouseEnter={trigger === 'hover' ? showTooltip : undefined}
        onMouseLeave={trigger === 'hover' ? hideTooltip : undefined}
        onFocus={trigger === 'focus' ? showTooltip : undefined}
        onBlur={trigger === 'focus' ? hideTooltip : undefined}
        onClick={trigger === 'click' ? handleTriggerEvent : undefined}
        data-help={id}
      >
        {children}
      </div>

      {/* Tooltip Portal */}
      {isVisible && activeTooltip === id && (
        <div
          ref={tooltipRef}
          className="fixed z-50 pointer-events-none"
          style={{ top: position.top, left: position.left }}
        >
          <div className="relative bg-gray-800 text-white text-sm rounded-lg px-3 py-2 max-w-xs shadow-lg">
            <div className={getArrowClasses()} />
            <div className="font-medium mb-1">{tooltipContent.title}</div>
            <div className="text-gray-300 text-xs leading-relaxed">
              {tooltipContent.description}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Convenience component for quick tooltip integration
export function QuickTooltip({ 
  id, 
  children, 
  className 
}: { 
  id: string
  children: React.ReactNode
  className?: string 
}) {
  const predefined = tooltipDatabase[id]
  
  if (!predefined) {
    console.warn(`No predefined tooltip found for id: ${id}`)
    return <>{children}</>
  }

  return (
    <TooltipHelper
      id={id}
      title={predefined.title}
      content={predefined.description}
      placement={predefined.placement}
      className={className}
    >
      {children}
    </TooltipHelper>
  )
}

// Hook for programmatically showing tooltips
export function useTooltip() {
  const { setActiveTooltip } = useHelp()
  
  const showTooltip = (id: string) => {
    setActiveTooltip(id)
  }
  
  const hideTooltip = () => {
    setActiveTooltip(null)
  }
  
  return { showTooltip, hideTooltip }
}