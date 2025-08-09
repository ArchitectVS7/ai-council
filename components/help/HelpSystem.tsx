"use client"

import { useHelp } from './HelpProvider'
import HelpModal from './HelpModal'

export default function HelpSystem() {
  const { isHelpModalOpen, setHelpModalOpen } = useHelp()

  return (
    <HelpModal 
      isOpen={isHelpModalOpen}
      onClose={() => setHelpModalOpen(false)}
    />
  )
}