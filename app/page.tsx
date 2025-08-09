import Link from 'next/link'
import { PublicLayout } from '@/components/layout/AppLayout'

export const dynamic = 'force-dynamic'

export default function LandingPage() {
  const features = [
    {
      icon: '💬',
      title: 'Multi-Expert Discussions',
      description: 'Orchestrate conversations between AI personas with different expertise and perspectives for comprehensive analysis.'
    },
    {
      icon: '🎨',
      title: 'Creative Ideation',
      description: 'Generate and refine creative concepts with specialized personas for game design, product development, and innovation.'
    },
    {
      icon: '📊',
      title: 'Strategic Planning',
      description: 'Develop business strategies with market analysts, customer advocates, and strategic planners working together.'
    },
    {
      icon: '🔄',
      title: 'Visual Flow Designer',
      description: 'Create custom collaboration workflows with an intuitive drag-and-drop interface for persona orchestration.'
    },
    {
      icon: '📚',
      title: 'Template Library',
      description: 'Access pre-built workflow templates for common use cases or create your own for specific domains.'
    },
    {
      icon: '📈',
      title: 'Professional Deliverables',
      description: 'Generate comprehensive reports, creative briefs, strategic plans, and implementation roadmaps.'
    }
  ]

  const useCases = [
    {
      title: 'Game Development',
      description: 'Space wizards mobile game with cosmic combat',
      personas: ['Narrative Designer', 'Lovecraft Specialist', 'Game Designer', 'Market Analyst'],
      outcome: 'Creative brief with technical requirements'
    },
    {
      title: 'Product Strategy',
      description: 'Sustainable transportation solution planning',
      personas: ['Market Strategist', 'Customer Advocate', 'Innovation Catalyst', 'Business Analyst'],
      outcome: 'Strategic roadmap with market analysis'
    },
    {
      title: 'Research Collaboration',
      description: 'Academic paper methodology review',
      personas: ['Literature Reviewer', 'Methodology Critic', 'Statistical Analyst', 'Peer Reviewer'],
      outcome: 'Research validation and recommendations'
    }
  ]

  return (
    <PublicLayout>
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative py-20 bg-gradient-to-br from-blue-50 via-white to-purple-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-br from-black via-[#171717] to-[#575757] bg-clip-text text-transparent">
              AI Council
            </h1>
            <p className="mt-6 text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto">
              Multi-persona collaboration platform that orchestrates expert AI personas for 
              creative ideation, strategic planning, and comprehensive analysis.
            </p>
            
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/dashboard"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-medium transition-colors"
              >
                Get Started Free
              </Link>
              <Link
                href="#demo"
                className="bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300 px-8 py-4 rounded-lg text-lg font-medium transition-colors"
              >
                Watch Demo
              </Link>
            </div>

            <p className="mt-4 text-sm text-gray-500">
              No credit card required • 100 free interactions per month
            </p>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                Powerful Collaboration Features
              </h2>
              <p className="mt-4 text-xl text-gray-600">
                Everything you need for expert AI collaboration in one platform
              </p>
            </div>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div key={index} className="text-center p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                Real-World Applications
              </h2>
              <p className="mt-4 text-xl text-gray-600">
                See how professionals use AI Council across different industries
              </p>
            </div>

            <div className="mt-16 grid grid-cols-1 lg:grid-cols-3 gap-8">
              {useCases.map((useCase, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">{useCase.title}</h3>
                    <p className="text-gray-600 mb-4">{useCase.description}</p>
                    
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Expert Personas:</h4>
                      <div className="flex flex-wrap gap-1">
                        {useCase.personas.map((persona, pIndex) => (
                          <span key={pIndex} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {persona}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Outcome:</h4>
                      <p className="text-sm text-gray-600">{useCase.outcome}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-blue-600">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Ready to Start Collaborating?
            </h2>
            <p className="mt-4 text-xl text-blue-100">
              Join professionals who are already using AI Council for creative breakthroughs and strategic insights.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/dashboard"
                className="bg-white hover:bg-gray-100 text-blue-600 px-8 py-4 rounded-lg text-lg font-medium transition-colors"
              >
                Start Free Trial
              </Link>
              <Link
                href="/starter"
                className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-4 rounded-lg text-lg font-medium transition-colors"
              >
                Try Demo
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">AC</span>
                  </div>
                  <span className="text-xl font-semibold">AI Council</span>
                </div>
                <p className="text-gray-400">
                  Professional AI collaboration platform for creative and strategic innovation.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-4">Product</h3>
                <ul className="space-y-2 text-gray-400">
                  <li><Link href="/templates" className="hover:text-white transition-colors">Templates</Link></li>
                  <li><Link href="/personas" className="hover:text-white transition-colors">Personas</Link></li>
                  <li><Link href="/flows" className="hover:text-white transition-colors">Flows</Link></li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-4">Resources</h3>
                <ul className="space-y-2 text-gray-400">
                  <li><Link href="/starter" className="hover:text-white transition-colors">Demo</Link></li>
                  <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-4">Company</h3>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
              <p>&copy; 2025 AI Council. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </PublicLayout>
  )
}
