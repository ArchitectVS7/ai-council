"use client"

import { DashboardLayout } from '@/components/layout/AppLayout'
import { useState } from 'react'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'api' | 'billing'>('profile')

  // Mock user data
  const [userProfile, setUserProfile] = useState({
    name: 'John Doe',
    email: 'john.doe@example.com',
    bio: 'Creative professional exploring AI-assisted collaboration',
    organization: 'Design Studio Inc.',
    role: 'Creative Director',
    avatar: ''
  })

  const [preferences, setPreferences] = useState({
    defaultTemplate: 'creative-project',
    autoSaveInterval: 5,
    emailNotifications: true,
    desktopNotifications: false,
    theme: 'light',
    language: 'en'
  })

  const [apiSettings, setApiSettings] = useState({
    openaiKey: '',
    anthropicKey: '',
    rateLimitPerHour: 100,
    maxTokensPerRequest: 4000
  })

  const tabs = [
    { id: 'profile', name: 'Profile', icon: '👤' },
    { id: 'preferences', name: 'Preferences', icon: '⚙️' },
    { id: 'api', name: 'API Settings', icon: '🔑' },
    { id: 'billing', name: 'Billing', icon: '💳' }
  ]

  const handleSaveProfile = () => {
    // In real app, this would save to database
    alert('Profile saved successfully!')
  }

  const handleSavePreferences = () => {
    // In real app, this would save to database
    alert('Preferences saved successfully!')
  }

  const renderProfileTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>
        <p className="text-sm text-gray-600">Update your profile information and avatar.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            value={userProfile.name}
            onChange={(e) => setUserProfile(prev => ({ ...prev, name: e.target.value }))}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={userProfile.email}
            onChange={(e) => setUserProfile(prev => ({ ...prev, email: e.target.value }))}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Organization</label>
          <input
            type="text"
            value={userProfile.organization}
            onChange={(e) => setUserProfile(prev => ({ ...prev, organization: e.target.value }))}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Role</label>
          <input
            type="text"
            value={userProfile.role}
            onChange={(e) => setUserProfile(prev => ({ ...prev, role: e.target.value }))}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Bio</label>
        <textarea
          value={userProfile.bio}
          onChange={(e) => setUserProfile(prev => ({ ...prev, bio: e.target.value }))}
          rows={3}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Tell us about yourself and how you use AI Council..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Profile Avatar</label>
        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-2xl text-gray-600">👤</span>
          </div>
          <div>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm transition-colors">
              Upload Photo
            </button>
            <p className="text-xs text-gray-500 mt-1">JPG, PNG up to 2MB</p>
          </div>
        </div>
      </div>

      <div className="pt-4">
        <button
          onClick={handleSaveProfile}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors"
        >
          Save Profile
        </button>
      </div>
    </div>
  )

  const renderPreferencesTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Application Preferences</h3>
        <p className="text-sm text-gray-600">Customize your AI Council experience.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Default Template</label>
          <select
            value={preferences.defaultTemplate}
            onChange={(e) => setPreferences(prev => ({ ...prev, defaultTemplate: e.target.value }))}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="default">Default Discussion</option>
            <option value="creative-project">Creative Project Development</option>
            <option value="product-strategy">Product Strategy Development</option>
            <option value="game-development">Game Development Ideation</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Auto-save Interval</label>
          <select
            value={preferences.autoSaveInterval}
            onChange={(e) => setPreferences(prev => ({ ...prev, autoSaveInterval: Number(e.target.value) }))}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={1}>1 minute</option>
            <option value={5}>5 minutes</option>
            <option value={10}>10 minutes</option>
            <option value={0}>Disabled</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Theme</label>
          <select
            value={preferences.theme}
            onChange={(e) => setPreferences(prev => ({ ...prev, theme: e.target.value }))}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Language</label>
          <select
            value={preferences.language}
            onChange={(e) => setPreferences(prev => ({ ...prev, language: e.target.value }))}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
          </select>
        </div>
      </div>

      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">Notifications</h4>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.emailNotifications}
              onChange={(e) => setPreferences(prev => ({ ...prev, emailNotifications: e.target.checked }))}
              className="mr-3"
            />
            <span className="text-sm text-gray-700">Email notifications for completed sessions</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.desktopNotifications}
              onChange={(e) => setPreferences(prev => ({ ...prev, desktopNotifications: e.target.checked }))}
              className="mr-3"
            />
            <span className="text-sm text-gray-700">Desktop notifications</span>
          </label>
        </div>
      </div>

      <div className="pt-4">
        <button
          onClick={handleSavePreferences}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors"
        >
          Save Preferences
        </button>
      </div>
    </div>
  )

  const renderApiTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">API Configuration</h3>
        <p className="text-sm text-gray-600">Configure your AI provider API keys and settings.</p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">API Keys Security</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>API keys are encrypted and stored securely. They are only used for your AI Council sessions.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">OpenAI API Key</label>
          <input
            type="password"
            value={apiSettings.openaiKey}
            onChange={(e) => setApiSettings(prev => ({ ...prev, openaiKey: e.target.value }))}
            placeholder="sk-..."
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Anthropic API Key</label>
          <input
            type="password"
            value={apiSettings.anthropicKey}
            onChange={(e) => setApiSettings(prev => ({ ...prev, anthropicKey: e.target.value }))}
            placeholder="sk-ant-..."
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Rate Limit (requests/hour)</label>
          <input
            type="number"
            value={apiSettings.rateLimitPerHour}
            onChange={(e) => setApiSettings(prev => ({ ...prev, rateLimitPerHour: Number(e.target.value) }))}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Max Tokens per Request</label>
          <input
            type="number"
            value={apiSettings.maxTokensPerRequest}
            onChange={(e) => setApiSettings(prev => ({ ...prev, maxTokensPerRequest: Number(e.target.value) }))}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="pt-4">
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors">
          Save API Settings
        </button>
      </div>
    </div>
  )

  const renderBillingTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Billing & Usage</h3>
        <p className="text-sm text-gray-600">Monitor your usage and manage billing settings.</p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">Free Plan</h3>
            <div className="mt-2 text-sm text-green-700">
              <p>You are currently on the free plan with 100 AI interactions per month.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Current Usage</h4>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">AI Interactions</span>
              <span className="text-gray-900">47 / 100</span>
            </div>
            <div className="mt-1 bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '47%' }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Storage Used</span>
              <span className="text-gray-900">1.2 GB / 5 GB</span>
            </div>
            <div className="mt-1 bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: '24%' }}></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900">Free Plan</h4>
          <div className="mt-2 text-2xl font-bold text-gray-900">$0<span className="text-sm font-normal text-gray-600">/month</span></div>
          <ul className="mt-4 space-y-2 text-sm text-gray-600">
            <li>✓ 100 AI interactions/month</li>
            <li>✓ 5 GB storage</li>
            <li>✓ Basic templates</li>
            <li>✓ Export functionality</li>
          </ul>
          <button disabled className="mt-6 w-full bg-gray-100 text-gray-400 px-4 py-2 rounded-md cursor-not-allowed">
            Current Plan
          </button>
        </div>

        <div className="border-2 border-blue-500 rounded-lg p-6 relative">
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <span className="bg-blue-500 text-white px-3 py-1 text-xs rounded-full">Popular</span>
          </div>
          <h4 className="text-lg font-medium text-gray-900">Pro Plan</h4>
          <div className="mt-2 text-2xl font-bold text-gray-900">$29<span className="text-sm font-normal text-gray-600">/month</span></div>
          <ul className="mt-4 space-y-2 text-sm text-gray-600">
            <li>✓ 1,000 AI interactions/month</li>
            <li>✓ 50 GB storage</li>
            <li>✓ Premium templates</li>
            <li>✓ Priority support</li>
            <li>✓ Advanced analytics</li>
            <li>✓ Team collaboration</li>
          </ul>
          <button className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors">
            Upgrade to Pro
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <DashboardLayout currentPage="settings">
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">
            Manage your profile, preferences, and account settings.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'profile' && renderProfileTab()}
            {activeTab === 'preferences' && renderPreferencesTab()}
            {activeTab === 'api' && renderApiTab()}
            {activeTab === 'billing' && renderBillingTab()}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}