import { DeliverableTemplate, DeliverableType, StakeholderType } from '../../types/deliverables';

export const deliverableTemplates: Record<DeliverableType, Record<StakeholderType, DeliverableTemplate>> = {
  'creative-brief': {
    executive: {
      type: 'creative-brief',
      stakeholder: 'executive',
      structure: {
        sections: [
          {
            id: 'executive-summary',
            title: 'Executive Summary',
            content: 'High-level overview of the creative direction and strategic implications.',
            includeFor: ['executive', 'general'],
            required: true,
          },
          {
            id: 'project-overview',
            title: 'Project Overview',
            content: 'Strategic context and business objectives.',
            includeFor: ['executive', 'technical', 'creative', 'general'],
            required: true,
          },
          {
            id: 'creative-direction',
            title: 'Creative Direction',
            content: 'Key creative concepts and strategic positioning.',
            includeFor: ['executive', 'creative', 'general'],
            required: true,
          },
          {
            id: 'success-metrics',
            title: 'Success Metrics & ROI',
            content: 'Measurable outcomes and business impact projections.',
            includeFor: ['executive', 'general'],
            required: true,
          },
          {
            id: 'recommendations',
            title: 'Strategic Recommendations',
            content: 'Executive-level action items and next steps.',
            includeFor: ['executive', 'general'],
            required: true,
          },
        ],
        formatting: {
          headerStyle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: '#1f2937',
          },
          bodyStyle: {
            fontSize: 12,
            lineHeight: 1.6,
            fontFamily: 'Arial, sans-serif',
          },
          pageLayout: {
            margins: { top: 1, bottom: 1, left: 1, right: 1 },
            orientation: 'portrait',
          },
          branding: {
            includeHeader: true,
            includeLogo: true,
            colorScheme: ['#3b82f6', '#1f2937', '#6b7280'],
          },
        },
      },
    },
    technical: {
      type: 'creative-brief',
      stakeholder: 'technical',
      structure: {
        sections: [
          {
            id: 'project-overview',
            title: 'Project Overview',
            content: 'Technical requirements and implementation context.',
            includeFor: ['technical', 'general'],
            required: true,
          },
          {
            id: 'creative-direction',
            title: 'Creative Direction',
            content: 'Design specifications and technical requirements.',
            includeFor: ['technical', 'creative', 'general'],
            required: true,
          },
          {
            id: 'technical-specifications',
            title: 'Technical Specifications',
            content: 'Detailed technical requirements and constraints.',
            includeFor: ['technical'],
            required: true,
          },
          {
            id: 'implementation-guidelines',
            title: 'Implementation Guidelines',
            content: 'Technical implementation approach and considerations.',
            includeFor: ['technical', 'general'],
            required: true,
          },
          {
            id: 'deliverables-timeline',
            title: 'Deliverables & Timeline',
            content: 'Technical milestones and delivery schedule.',
            includeFor: ['technical', 'general'],
            required: true,
          },
        ],
        formatting: {
          headerStyle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#1f2937',
          },
          bodyStyle: {
            fontSize: 11,
            lineHeight: 1.5,
            fontFamily: 'Consolas, Monaco, monospace',
          },
          pageLayout: {
            margins: { top: 0.75, bottom: 0.75, left: 0.75, right: 0.75 },
            orientation: 'portrait',
          },
        },
      },
    },
    creative: {
      type: 'creative-brief',
      stakeholder: 'creative',
      structure: {
        sections: [
          {
            id: 'creative-vision',
            title: 'Creative Vision',
            content: 'Artistic direction and visual concept.',
            includeFor: ['creative', 'general'],
            required: true,
          },
          {
            id: 'brand-positioning',
            title: 'Brand Positioning',
            content: 'Brand personality and positioning strategy.',
            includeFor: ['creative', 'executive', 'general'],
            required: true,
          },
          {
            id: 'creative-elements',
            title: 'Creative Elements',
            content: 'Visual elements, tone, and style guidelines.',
            includeFor: ['creative', 'technical', 'general'],
            required: true,
          },
          {
            id: 'inspiration-references',
            title: 'Inspiration & References',
            content: 'Visual references and creative inspiration.',
            includeFor: ['creative'],
            required: false,
          },
          {
            id: 'creative-deliverables',
            title: 'Creative Deliverables',
            content: 'Specific creative outputs and assets required.',
            includeFor: ['creative', 'technical', 'general'],
            required: true,
          },
        ],
        formatting: {
          headerStyle: {
            fontSize: 20,
            fontWeight: 'bold',
            color: '#7c3aed',
          },
          bodyStyle: {
            fontSize: 12,
            lineHeight: 1.7,
            fontFamily: 'Georgia, serif',
          },
          pageLayout: {
            margins: { top: 1.25, bottom: 1.25, left: 1.25, right: 1.25 },
            orientation: 'portrait',
          },
          branding: {
            includeHeader: true,
            includeLogo: true,
            colorScheme: ['#7c3aed', '#a855f7', '#c084fc'],
          },
        },
      },
    },
    general: {
      type: 'creative-brief',
      stakeholder: 'general',
      structure: {
        sections: [
          {
            id: 'project-overview',
            title: 'Project Overview',
            content: 'Clear project description and objectives.',
            includeFor: ['general'],
            required: true,
          },
          {
            id: 'creative-direction',
            title: 'Creative Direction',
            content: 'Creative approach and key concepts.',
            includeFor: ['general'],
            required: true,
          },
          {
            id: 'key-messages',
            title: 'Key Messages',
            content: 'Primary communication points and messaging.',
            includeFor: ['general'],
            required: true,
          },
          {
            id: 'target-audience',
            title: 'Target Audience',
            content: 'Audience definition and insights.',
            includeFor: ['general'],
            required: true,
          },
          {
            id: 'next-steps',
            title: 'Next Steps',
            content: 'Action items and follow-up requirements.',
            includeFor: ['general'],
            required: true,
          },
        ],
        formatting: {
          headerStyle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#1f2937',
          },
          bodyStyle: {
            fontSize: 12,
            lineHeight: 1.6,
            fontFamily: 'Arial, sans-serif',
          },
          pageLayout: {
            margins: { top: 1, bottom: 1, left: 1, right: 1 },
            orientation: 'portrait',
          },
        },
      },
    },
  },
  'strategic-plan': {
    executive: {
      type: 'strategic-plan',
      stakeholder: 'executive',
      structure: {
        sections: [
          {
            id: 'executive-summary',
            title: 'Executive Summary',
            content: 'Strategic overview and key recommendations.',
            includeFor: ['executive', 'general'],
            required: true,
          },
          {
            id: 'strategic-analysis',
            title: 'Strategic Analysis',
            content: 'Market analysis and competitive positioning.',
            includeFor: ['executive', 'general'],
            required: true,
          },
          {
            id: 'strategic-objectives',
            title: 'Strategic Objectives',
            content: 'Key goals and success criteria.',
            includeFor: ['executive', 'general'],
            required: true,
          },
          {
            id: 'implementation-roadmap',
            title: 'Implementation Roadmap',
            content: 'High-level implementation phases and milestones.',
            includeFor: ['executive', 'technical', 'general'],
            required: true,
          },
          {
            id: 'resource-requirements',
            title: 'Resource Requirements',
            content: 'Budget, personnel, and resource allocation.',
            includeFor: ['executive'],
            required: true,
          },
          {
            id: 'risk-mitigation',
            title: 'Risk Assessment & Mitigation',
            content: 'Key risks and mitigation strategies.',
            includeFor: ['executive', 'general'],
            required: true,
          },
        ],
        formatting: {
          headerStyle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: '#059669',
          },
          bodyStyle: {
            fontSize: 12,
            lineHeight: 1.6,
            fontFamily: 'Arial, sans-serif',
          },
          pageLayout: {
            margins: { top: 1, bottom: 1, left: 1, right: 1 },
            orientation: 'portrait',
          },
          branding: {
            includeHeader: true,
            includeLogo: true,
            colorScheme: ['#059669', '#10b981', '#34d399'],
          },
        },
      },
    },
    technical: {
      type: 'strategic-plan',
      stakeholder: 'technical',
      structure: {
        sections: [
          {
            id: 'technical-overview',
            title: 'Technical Overview',
            content: 'Technical strategy and architecture overview.',
            includeFor: ['technical', 'general'],
            required: true,
          },
          {
            id: 'implementation-phases',
            title: 'Implementation Phases',
            content: 'Detailed technical implementation phases.',
            includeFor: ['technical', 'general'],
            required: true,
          },
          {
            id: 'technical-requirements',
            title: 'Technical Requirements',
            content: 'System requirements and technical specifications.',
            includeFor: ['technical'],
            required: true,
          },
          {
            id: 'architecture-design',
            title: 'Architecture Design',
            content: 'System architecture and design patterns.',
            includeFor: ['technical'],
            required: true,
          },
          {
            id: 'development-timeline',
            title: 'Development Timeline',
            content: 'Technical milestones and delivery schedule.',
            includeFor: ['technical', 'general'],
            required: true,
          },
          {
            id: 'technical-risks',
            title: 'Technical Risks',
            content: 'Technical challenges and mitigation strategies.',
            includeFor: ['technical', 'general'],
            required: true,
          },
        ],
        formatting: {
          headerStyle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#dc2626',
          },
          bodyStyle: {
            fontSize: 11,
            lineHeight: 1.5,
            fontFamily: 'Consolas, Monaco, monospace',
          },
          pageLayout: {
            margins: { top: 0.75, bottom: 0.75, left: 0.75, right: 0.75 },
            orientation: 'portrait',
          },
        },
      },
    },
    creative: {
      type: 'strategic-plan',
      stakeholder: 'creative',
      structure: {
        sections: [
          {
            id: 'creative-strategy',
            title: 'Creative Strategy',
            content: 'Overall creative direction and strategic approach.',
            includeFor: ['creative', 'general'],
            required: true,
          },
          {
            id: 'brand-evolution',
            title: 'Brand Evolution',
            content: 'Brand development and positioning strategy.',
            includeFor: ['creative', 'executive', 'general'],
            required: true,
          },
          {
            id: 'creative-execution',
            title: 'Creative Execution',
            content: 'Creative implementation and asset development.',
            includeFor: ['creative', 'technical', 'general'],
            required: true,
          },
          {
            id: 'visual-identity',
            title: 'Visual Identity System',
            content: 'Brand guidelines and visual system development.',
            includeFor: ['creative', 'general'],
            required: true,
          },
          {
            id: 'creative-timeline',
            title: 'Creative Timeline',
            content: 'Creative deliverables and production schedule.',
            includeFor: ['creative', 'technical', 'general'],
            required: true,
          },
        ],
        formatting: {
          headerStyle: {
            fontSize: 20,
            fontWeight: 'bold',
            color: '#7c3aed',
          },
          bodyStyle: {
            fontSize: 12,
            lineHeight: 1.7,
            fontFamily: 'Georgia, serif',
          },
          pageLayout: {
            margins: { top: 1.25, bottom: 1.25, left: 1.25, right: 1.25 },
            orientation: 'portrait',
          },
          branding: {
            includeHeader: true,
            includeLogo: true,
            colorScheme: ['#7c3aed', '#a855f7', '#c084fc'],
          },
        },
      },
    },
    general: {
      type: 'strategic-plan',
      stakeholder: 'general',
      structure: {
        sections: [
          {
            id: 'strategic-overview',
            title: 'Strategic Overview',
            content: 'Clear strategic direction and goals.',
            includeFor: ['general'],
            required: true,
          },
          {
            id: 'key-initiatives',
            title: 'Key Initiatives',
            content: 'Primary strategic initiatives and focus areas.',
            includeFor: ['general'],
            required: true,
          },
          {
            id: 'implementation-approach',
            title: 'Implementation Approach',
            content: 'How the strategy will be executed.',
            includeFor: ['general'],
            required: true,
          },
          {
            id: 'success-metrics',
            title: 'Success Metrics',
            content: 'How success will be measured and tracked.',
            includeFor: ['general'],
            required: true,
          },
          {
            id: 'timeline-milestones',
            title: 'Timeline & Milestones',
            content: 'Key dates and milestone achievements.',
            includeFor: ['general'],
            required: true,
          },
        ],
        formatting: {
          headerStyle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#1f2937',
          },
          bodyStyle: {
            fontSize: 12,
            lineHeight: 1.6,
            fontFamily: 'Arial, sans-serif',
          },
          pageLayout: {
            margins: { top: 1, bottom: 1, left: 1, right: 1 },
            orientation: 'portrait',
          },
        },
      },
    },
  },
  'research-summary': {
    // Add research summary templates for all stakeholders
    executive: {
      type: 'research-summary',
      stakeholder: 'executive',
      structure: {
        sections: [
          {
            id: 'executive-summary',
            title: 'Executive Summary',
            content: 'Key findings and business implications.',
            includeFor: ['executive', 'general'],
            required: true,
          },
          {
            id: 'key-insights',
            title: 'Key Insights',
            content: 'Primary research insights and discoveries.',
            includeFor: ['executive', 'general'],
            required: true,
          },
          {
            id: 'business-impact',
            title: 'Business Impact',
            content: 'Strategic implications and opportunities.',
            includeFor: ['executive', 'general'],
            required: true,
          },
          {
            id: 'recommendations',
            title: 'Recommendations',
            content: 'Action items based on research findings.',
            includeFor: ['executive', 'general'],
            required: true,
          },
        ],
        formatting: {
          headerStyle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: '#0ea5e9',
          },
          bodyStyle: {
            fontSize: 12,
            lineHeight: 1.6,
            fontFamily: 'Arial, sans-serif',
          },
          pageLayout: {
            margins: { top: 1, bottom: 1, left: 1, right: 1 },
            orientation: 'portrait',
          },
          branding: {
            includeHeader: true,
            includeLogo: true,
            colorScheme: ['#0ea5e9', '#38bdf8', '#7dd3fc'],
          },
        },
      },
    },
    technical: {
      type: 'research-summary',
      stakeholder: 'technical',
      structure: {
        sections: [
          {
            id: 'methodology',
            title: 'Research Methodology',
            content: 'Research approach and technical methods.',
            includeFor: ['technical', 'general'],
            required: true,
          },
          {
            id: 'data-analysis',
            title: 'Data Analysis',
            content: 'Technical analysis and statistical findings.',
            includeFor: ['technical'],
            required: true,
          },
          {
            id: 'technical-findings',
            title: 'Technical Findings',
            content: 'Detailed technical insights and discoveries.',
            includeFor: ['technical', 'general'],
            required: true,
          },
          {
            id: 'implementation-considerations',
            title: 'Implementation Considerations',
            content: 'Technical implications and requirements.',
            includeFor: ['technical', 'general'],
            required: true,
          },
        ],
        formatting: {
          headerStyle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#dc2626',
          },
          bodyStyle: {
            fontSize: 11,
            lineHeight: 1.5,
            fontFamily: 'Consolas, Monaco, monospace',
          },
          pageLayout: {
            margins: { top: 0.75, bottom: 0.75, left: 0.75, right: 0.75 },
            orientation: 'portrait',
          },
        },
      },
    },
    creative: {
      type: 'research-summary',
      stakeholder: 'creative',
      structure: {
        sections: [
          {
            id: 'creative-insights',
            title: 'Creative Insights',
            content: 'Design and creative research findings.',
            includeFor: ['creative', 'general'],
            required: true,
          },
          {
            id: 'user-experience',
            title: 'User Experience Findings',
            content: 'UX research and user behavior insights.',
            includeFor: ['creative', 'technical', 'general'],
            required: true,
          },
          {
            id: 'design-implications',
            title: 'Design Implications',
            content: 'How findings impact design decisions.',
            includeFor: ['creative', 'general'],
            required: true,
          },
          {
            id: 'creative-opportunities',
            title: 'Creative Opportunities',
            content: 'Design opportunities and recommendations.',
            includeFor: ['creative', 'general'],
            required: true,
          },
        ],
        formatting: {
          headerStyle: {
            fontSize: 20,
            fontWeight: 'bold',
            color: '#7c3aed',
          },
          bodyStyle: {
            fontSize: 12,
            lineHeight: 1.7,
            fontFamily: 'Georgia, serif',
          },
          pageLayout: {
            margins: { top: 1.25, bottom: 1.25, left: 1.25, right: 1.25 },
            orientation: 'portrait',
          },
          branding: {
            includeHeader: true,
            includeLogo: true,
            colorScheme: ['#7c3aed', '#a855f7', '#c084fc'],
          },
        },
      },
    },
    general: {
      type: 'research-summary',
      stakeholder: 'general',
      structure: {
        sections: [
          {
            id: 'research-overview',
            title: 'Research Overview',
            content: 'Clear overview of research conducted.',
            includeFor: ['general'],
            required: true,
          },
          {
            id: 'key-findings',
            title: 'Key Findings',
            content: 'Primary research discoveries and insights.',
            includeFor: ['general'],
            required: true,
          },
          {
            id: 'implications',
            title: 'Implications',
            content: 'What the findings mean for the project.',
            includeFor: ['general'],
            required: true,
          },
          {
            id: 'next-steps',
            title: 'Next Steps',
            content: 'Recommended actions based on research.',
            includeFor: ['general'],
            required: true,
          },
        ],
        formatting: {
          headerStyle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#1f2937',
          },
          bodyStyle: {
            fontSize: 12,
            lineHeight: 1.6,
            fontFamily: 'Arial, sans-serif',
          },
          pageLayout: {
            margins: { top: 1, bottom: 1, left: 1, right: 1 },
            orientation: 'portrait',
          },
        },
      },
    },
  },
  'implementation-roadmap': {
    // Add implementation roadmap templates for all stakeholders
    executive: {
      type: 'implementation-roadmap',
      stakeholder: 'executive',
      structure: {
        sections: [
          {
            id: 'executive-summary',
            title: 'Executive Summary',
            content: 'High-level implementation overview and timeline.',
            includeFor: ['executive', 'general'],
            required: true,
          },
          {
            id: 'strategic-phases',
            title: 'Strategic Implementation Phases',
            content: 'Major phases and strategic milestones.',
            includeFor: ['executive', 'general'],
            required: true,
          },
          {
            id: 'resource-allocation',
            title: 'Resource Allocation',
            content: 'Budget and resource requirements by phase.',
            includeFor: ['executive'],
            required: true,
          },
          {
            id: 'success-metrics',
            title: 'Success Metrics & KPIs',
            content: 'How success will be measured at each phase.',
            includeFor: ['executive', 'general'],
            required: true,
          },
          {
            id: 'risk-management',
            title: 'Risk Management',
            content: 'Key risks and mitigation strategies.',
            includeFor: ['executive', 'general'],
            required: true,
          },
        ],
        formatting: {
          headerStyle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: '#f59e0b',
          },
          bodyStyle: {
            fontSize: 12,
            lineHeight: 1.6,
            fontFamily: 'Arial, sans-serif',
          },
          pageLayout: {
            margins: { top: 1, bottom: 1, left: 1, right: 1 },
            orientation: 'portrait',
          },
          branding: {
            includeHeader: true,
            includeLogo: true,
            colorScheme: ['#f59e0b', '#fbbf24', '#fcd34d'],
          },
        },
      },
    },
    technical: {
      type: 'implementation-roadmap',
      stakeholder: 'technical',
      structure: {
        sections: [
          {
            id: 'technical-overview',
            title: 'Technical Implementation Overview',
            content: 'Technical approach and architecture overview.',
            includeFor: ['technical', 'general'],
            required: true,
          },
          {
            id: 'development-phases',
            title: 'Development Phases',
            content: 'Detailed technical development phases.',
            includeFor: ['technical', 'general'],
            required: true,
          },
          {
            id: 'technical-milestones',
            title: 'Technical Milestones',
            content: 'Key technical deliverables and deadlines.',
            includeFor: ['technical', 'general'],
            required: true,
          },
          {
            id: 'dependencies-prerequisites',
            title: 'Dependencies & Prerequisites',
            content: 'Technical dependencies and requirements.',
            includeFor: ['technical'],
            required: true,
          },
          {
            id: 'testing-deployment',
            title: 'Testing & Deployment Strategy',
            content: 'Quality assurance and deployment approach.',
            includeFor: ['technical', 'general'],
            required: true,
          },
        ],
        formatting: {
          headerStyle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#dc2626',
          },
          bodyStyle: {
            fontSize: 11,
            lineHeight: 1.5,
            fontFamily: 'Consolas, Monaco, monospace',
          },
          pageLayout: {
            margins: { top: 0.75, bottom: 0.75, left: 0.75, right: 0.75 },
            orientation: 'portrait',
          },
        },
      },
    },
    creative: {
      type: 'implementation-roadmap',
      stakeholder: 'creative',
      structure: {
        sections: [
          {
            id: 'creative-implementation',
            title: 'Creative Implementation Plan',
            content: 'Creative development and execution approach.',
            includeFor: ['creative', 'general'],
            required: true,
          },
          {
            id: 'creative-phases',
            title: 'Creative Development Phases',
            content: 'Design and creative development timeline.',
            includeFor: ['creative', 'technical', 'general'],
            required: true,
          },
          {
            id: 'asset-development',
            title: 'Asset Development Schedule',
            content: 'Creative asset production timeline.',
            includeFor: ['creative', 'general'],
            required: true,
          },
          {
            id: 'review-approval',
            title: 'Review & Approval Process',
            content: 'Creative review and approval workflow.',
            includeFor: ['creative', 'general'],
            required: true,
          },
          {
            id: 'creative-deliverables',
            title: 'Creative Deliverables',
            content: 'Final creative outputs and specifications.',
            includeFor: ['creative', 'technical', 'general'],
            required: true,
          },
        ],
        formatting: {
          headerStyle: {
            fontSize: 20,
            fontWeight: 'bold',
            color: '#7c3aed',
          },
          bodyStyle: {
            fontSize: 12,
            lineHeight: 1.7,
            fontFamily: 'Georgia, serif',
          },
          pageLayout: {
            margins: { top: 1.25, bottom: 1.25, left: 1.25, right: 1.25 },
            orientation: 'portrait',
          },
          branding: {
            includeHeader: true,
            includeLogo: true,
            colorScheme: ['#7c3aed', '#a855f7', '#c084fc'],
          },
        },
      },
    },
    general: {
      type: 'implementation-roadmap',
      stakeholder: 'general',
      structure: {
        sections: [
          {
            id: 'implementation-overview',
            title: 'Implementation Overview',
            content: 'Clear overview of implementation approach.',
            includeFor: ['general'],
            required: true,
          },
          {
            id: 'project-phases',
            title: 'Project Phases',
            content: 'Major phases and what happens in each.',
            includeFor: ['general'],
            required: true,
          },
          {
            id: 'timeline-milestones',
            title: 'Timeline & Milestones',
            content: 'Key dates and milestone achievements.',
            includeFor: ['general'],
            required: true,
          },
          {
            id: 'team-responsibilities',
            title: 'Team Responsibilities',
            content: 'Who does what and when.',
            includeFor: ['general'],
            required: true,
          },
          {
            id: 'success-criteria',
            title: 'Success Criteria',
            content: 'How we will know when we succeed.',
            includeFor: ['general'],
            required: true,
          },
        ],
        formatting: {
          headerStyle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#1f2937',
          },
          bodyStyle: {
            fontSize: 12,
            lineHeight: 1.6,
            fontFamily: 'Arial, sans-serif',
          },
          pageLayout: {
            margins: { top: 1, bottom: 1, left: 1, right: 1 },
            orientation: 'portrait',
          },
        },
      },
    },
  },
};

export function getTemplate(type: DeliverableType, stakeholder: StakeholderType): DeliverableTemplate {
  return deliverableTemplates[type][stakeholder];
}

export function getAllTemplatesForType(type: DeliverableType): DeliverableTemplate[] {
  return Object.values(deliverableTemplates[type]);
}

export function getAllTemplatesForStakeholder(stakeholder: StakeholderType): DeliverableTemplate[] {
  return Object.values(deliverableTemplates).map(templates => templates[stakeholder]);
}
