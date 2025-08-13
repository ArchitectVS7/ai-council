import { NextRequest } from 'next/server';
import { z } from 'zod';
import { marked } from 'marked';
import { PDFGenerator } from '../../../lib/deliverables/pdf-generator';
import { DOCXGenerator } from '../../../lib/deliverables/docx-generator';
import { getTemplate } from '../../../lib/deliverables/templates';
import { 
  DeliverableConfig, 
  DeliverableContent, 
  DeliverableFormat, 
  DeliverableType, 
  StakeholderType 
} from '../../../types/deliverables';
import { rateLimit, defaultRateLimits, getClientIdentifier } from '../../../lib/ratelimit';

export const dynamic = 'force-dynamic';

const deliverableRequestSchema = z.object({
  config: z.object({
    type: z.enum(['creative-brief', 'strategic-plan', 'research-summary', 'implementation-roadmap']),
    format: z.enum(['pdf', 'docx', 'markdown', 'json']),
    stakeholder: z.enum(['executive', 'technical', 'creative', 'general']),
    sessionId: z.string(),
    customizations: z.object({
      includeCharts: z.boolean().optional(),
      includeAppendices: z.boolean().optional(),
      branding: z.object({
        logo: z.string().optional(),
        colors: z.array(z.string()).optional(),
        font: z.string().optional(),
      }).optional(),
    }).optional(),
  }),
  content: z.object({
    title: z.string().min(1),
    executiveSummary: z.string().min(1),
    mainContent: z.string().min(1),
    recommendations: z.array(z.string()),
    appendices: z.array(z.string()).optional(),
    metadata: z.object({
      generatedAt: z.string().transform(str => new Date(str)),
      sessionDuration: z.number(),
      participants: z.array(z.string()),
      tags: z.array(z.string()),
    }),
  }),
});

async function applyRateLimit(req: NextRequest, action: string) {
  const clientId = getClientIdentifier(req);
  const rateLimitResult = await rateLimit(clientId, defaultRateLimits.workflow, action);
  
  if (!rateLimitResult.success) {
    return Response.json(
      { error: 'Rate limit exceeded' },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString(),
        }
      }
    );
  }
  
  return rateLimitResult;
}

// POST /api/deliverables - Generate a deliverable
export async function POST(req: NextRequest) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'deliverable-generate');
    if (rateLimitResult instanceof Response) return rateLimitResult;

    const body = await req.json();
    const validationResult = deliverableRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return Response.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { config, content } = validationResult.data;

    // Get appropriate template
    const template = getTemplate(config.type, config.stakeholder);
    if (!template) {
      return Response.json(
        { error: `Template not found for type: ${config.type}, stakeholder: ${config.stakeholder}` },
        { status: 404 }
      );
    }

    // Apply customizations to template if provided
    const customizedTemplate = applyCustomizations(template, config.customizations);

    // Generate deliverable based on format
    let result: Buffer | string;
    let mimeType: string;
    let filename: string;

    switch (config.format) {
      case 'pdf':
        const pdfGenerator = new PDFGenerator();
        try {
          result = await pdfGenerator.generatePDF(content, customizedTemplate);
          mimeType = 'application/pdf';
          filename = `${sanitizeFilename(content.title)}.pdf`;
        } finally {
          await pdfGenerator.close();
        }
        break;

      case 'docx':
        const docxGenerator = new DOCXGenerator();
        result = await docxGenerator.generateDOCX(content, customizedTemplate);
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        filename = `${sanitizeFilename(content.title)}.docx`;
        break;

      case 'markdown':
        result = generateMarkdown(content, customizedTemplate);
        mimeType = 'text/markdown';
        filename = `${sanitizeFilename(content.title)}.md`;
        break;

      case 'json':
        result = JSON.stringify({ config, content, template: customizedTemplate }, null, 2);
        mimeType = 'application/json';
        filename = `${sanitizeFilename(content.title)}.json`;
        break;

      default:
        return Response.json(
          { error: `Unsupported format: ${config.format}` },
          { status: 400 }
        );
    }

    // Return file response
    const headers = new Headers({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-RateLimit-Limit': rateLimitResult.limit.toString(),
      'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      'X-RateLimit-Reset': rateLimitResult.reset.toString(),
    });

    return new Response(result, { headers });

  } catch (error: any) {
    console.error('Deliverable generation error:', error);
    return Response.json(
      { error: error.message || 'Failed to generate deliverable' },
      { status: 500 }
    );
  }
}

function applyCustomizations(template: any, customizations?: DeliverableConfig['customizations']) {
  if (!customizations) return template;

  const customizedTemplate = { ...template };

  // Apply branding customizations
  if (customizations.branding) {
    if (!customizedTemplate.structure.formatting.branding) {
      customizedTemplate.structure.formatting.branding = {
        includeHeader: true,
        includeLogo: true,
        colorScheme: ['#3b82f6', '#1f2937', '#6b7280'],
      };
    }

    if (customizations.branding.colors) {
      customizedTemplate.structure.formatting.branding.colorScheme = customizations.branding.colors;
    }

    if (customizations.branding.font) {
      customizedTemplate.structure.formatting.bodyStyle.fontFamily = customizations.branding.font;
    }
  }

  return customizedTemplate;
}

function generateMarkdown(content: DeliverableContent, template: any): string {
  const { sections } = template.structure;
  const relevantSections = sections.filter((section: any) => 
    section.includeFor.includes(template.stakeholder)
  );

  let markdown = '';

  // Title page
  markdown += `# ${content.title}\n\n`;
  markdown += `**Type:** ${template.type.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}\n`;
  markdown += `**Stakeholder:** ${template.stakeholder.charAt(0).toUpperCase() + template.stakeholder.slice(1)}\n`;
  markdown += `**Generated:** ${content.metadata.generatedAt.toLocaleDateString()}\n`;
  markdown += `**Session Duration:** ${Math.round(content.metadata.sessionDuration / 60)} minutes\n`;
  markdown += `**Participants:** ${content.metadata.participants.join(', ')}\n`;
  if (content.metadata.tags.length > 0) {
    markdown += `**Tags:** ${content.metadata.tags.join(', ')}\n`;
  }
  markdown += '\n---\n\n';

  // Table of contents
  markdown += '## Table of Contents\n\n';
  relevantSections
    .filter((section: any) => section.required || section.content)
    .forEach((section: any, index: number) => {
      markdown += `${index + 1}. [${section.title}](#${section.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')})\n`;
    });
  markdown += '\n---\n\n';

  // Content sections
  relevantSections
    .filter((section: any) => section.required || section.content)
    .forEach((section: any) => {
      markdown += `## ${section.title}\n\n`;

      switch (section.id) {
        case 'executive-summary':
          markdown += `> ${content.executiveSummary}\n\n`;
          break;
        case 'recommendations':
          markdown += '### Key Recommendations\n\n';
          content.recommendations.forEach((rec, index) => {
            markdown += `${index + 1}. ${rec}\n`;
          });
          markdown += '\n';
          break;
        default:
          markdown += `${section.content}\n\n`;
          if (section.id.includes('main') || section.id.includes('content')) {
            markdown += `**Main Content:**\n\n${content.mainContent}\n\n`;
          }
          break;
      }

      // Handle subsections
      if (section.subsections && section.subsections.length > 0) {
        section.subsections.forEach((subsection: any) => {
          markdown += `### ${subsection.title}\n\n`;
          markdown += `${subsection.content}\n\n`;
        });
      }

      markdown += '---\n\n';
    });

  // Appendices
  if (content.appendices && content.appendices.length > 0) {
    markdown += '## Appendices\n\n';
    content.appendices.forEach((appendix, index) => {
      markdown += `### Appendix ${String.fromCharCode(65 + index)}\n\n`;
      markdown += `${appendix}\n\n`;
    });
  }

  return markdown;
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
}

// GET /api/deliverables - List available templates
export async function GET(req: NextRequest) {
  try {
    const rateLimitResult = await applyRateLimit(req, 'deliverable-list');
    if (rateLimitResult instanceof Response) return rateLimitResult;

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') as DeliverableType;
    const stakeholder = searchParams.get('stakeholder') as StakeholderType;

    const availableTypes: DeliverableType[] = ['creative-brief', 'strategic-plan', 'research-summary', 'implementation-roadmap'];
    const availableStakeholders: StakeholderType[] = ['executive', 'technical', 'creative', 'general'];
    const availableFormats: DeliverableFormat[] = ['pdf', 'docx', 'markdown', 'json'];

    let templates = [];

    if (type && stakeholder) {
      // Get specific template
      const template = getTemplate(type, stakeholder);
      if (template) {
        templates.push({
          type,
          stakeholder,
          template: {
            sections: template.structure.sections.map(s => ({
              id: s.id,
              title: s.title,
              required: s.required,
              includeFor: s.includeFor,
            })),
            formatting: template.structure.formatting,
          },
        });
      }
    } else {
      // Get all available combinations
      availableTypes.forEach(t => {
        availableStakeholders.forEach(s => {
          const template = getTemplate(t, s);
          if (template) {
            templates.push({
              type: t,
              stakeholder: s,
              sectionCount: template.structure.sections.length,
            });
          }
        });
      });
    }

    return Response.json({
      availableTypes,
      availableStakeholders,
      availableFormats,
      templates,
    }, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      }
    });

  } catch (error: any) {
    return Response.json(
      { error: error.message || 'Failed to fetch deliverable templates' },
      { status: 500 }
    );
  }
}
