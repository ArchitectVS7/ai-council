"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type SidebarProps = {
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname()

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/app/dashboard',
      icon: '🏠',
      description: 'Overview and quick actions'
    },
    {
      name: 'New Discussion',
      href: '/app/discussion',
      icon: '💬',
      description: 'Start a new collaborative session'
    },
    {
      name: 'Flow Management',
      href: '/app/flows',
      icon: '🔄',
      description: 'Create and edit discussion flows'
    },
    {
      name: 'Persona Library',
      href: '/app/personas',
      icon: '👥',
      description: 'Manage AI expert personas'
    },
    {
      name: 'Session History',
      href: '/app/sessions',
      icon: '📚',
      description: 'View past discussions and results'
    },
    {
      name: 'Templates',
      href: '/app/templates',
      icon: '📋',
      description: 'Workflow templates and presets'
    },
    {
      name: 'Import/Export',
      href: '/app/import-export',
      icon: '📁',
      description: 'Backup and share configurations'
    },
    {
      name: 'Settings',
      href: '/app/settings',
      icon: '⚙️',
      description: 'Profile and preferences'
    }
  ]

  const isActiveLink = (href: string) => {
    return pathname === href || pathname?.startsWith(href + '/')
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && onClose && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-50 transition-opacity lg:hidden z-20"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo Area (for mobile) */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 lg:hidden">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">AC</span>
              </div>
              <span className="text-xl font-semibold text-gray-900">AI Council</span>
            </Link>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Main Navigation
            </div>
            
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-start space-x-3 p-3 rounded-lg transition-colors group ${
                  isActiveLink(item.href)
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
                onClick={onClose}
              >
                <span className="text-lg flex-shrink-0 mt-0.5">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{item.name}</div>
                  <div className={`text-xs mt-1 ${
                    isActiveLink(item.href) ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'
                  }`}>
                    {item.description}
                  </div>
                </div>
              </Link>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              AI Council v1.0
            </div>
          </div>
        </div>
      </div>
    </>
  )
}