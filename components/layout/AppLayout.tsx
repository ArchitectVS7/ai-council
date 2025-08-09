"use client"

import { useState, ReactNode } from 'react'
import AppHeader from './AppHeader'
import Sidebar from './Sidebar'

type AppLayoutProps = {
  children: ReactNode
  currentPage?: string
  showSidebar?: boolean
}

export default function AppLayout({ children, currentPage, showSidebar = true }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Sidebar */}
      {showSidebar && (
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Header */}
        <AppHeader 
          showNavigation={!showSidebar} 
          currentPage={currentPage}
        />

        {/* Sidebar toggle button for mobile */}
        {showSidebar && (
          <div className="lg:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="fixed bottom-6 left-6 z-40 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

// Specialized layouts for different sections
export function DashboardLayout({ children, currentPage }: { children: ReactNode, currentPage?: string }) {
  return (
    <AppLayout currentPage={currentPage} showSidebar={true}>
      {children}
    </AppLayout>
  )
}

export function PublicLayout({ children, currentPage }: { children: ReactNode, currentPage?: string }) {
  return (
    <AppLayout currentPage={currentPage} showSidebar={false}>
      {children}
    </AppLayout>
  )
}