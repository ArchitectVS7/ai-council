import { PDFGenerator } from '../../lib/deliverables/pdf-generator';
import { DOCXGenerator } from '../../lib/deliverables/docx-generator';
import { getTemplate } from '../../lib/deliverables/templates';
import { DeliverableContent, DeliverableTemplate } from '../../types/deliverables';

// Mock Puppeteer for PDF generation tests
jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      setContent: jest.fn(),
      pdf: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
      close: jest.fn(),
    }),
    close: jest.fn(),
  }),
}));

describe('Deliverable Generation', () => {
  const mockContent: DeliverableContent = {
    title: 'Test Creative Brief',
    executiveSummary: 'This is a test executive summary for the creative brief.',
    mainContent: 'This is the main content of the creative brief with detailed information.',
    recommendations: [
      'Implement a bold visual identity',
      'Focus on emotional storytelling',
      'Leverage social media platforms',
    ],
    appendices: [
      'Market research data',
      'Competitive analysis',
    ],
    metadata: {
      generatedAt: new Date('2025-08-13T10:00:00Z'),
      sessionDuration: 3600, // 1 hour in seconds
      participants: ['Creative Director', 'Brand Strategist', 'Marketing Manager'],
      tags: ['brand', 'creative', 'strategy'],
    },
  };

  describe('PDF Generator', () => {
    let pdfGenerator: PDFGenerator;

    beforeEach(() => {
      pdfGenerator = new PDFGenerator();
    });

    afterEach(async () => {
      await pdfGenerator.close();
    });

    test('should generate PDF for creative brief - executive stakeholder', async () => {
      const template = getTemplate('creative-brief', 'executive');
      
      const result = await pdfGenerator.generatePDF(mockContent, template);
      
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
      expect(result.toString()).toContain('mock-pdf-content');
    });

    test('should generate PDF for strategic plan - technical stakeholder', async () => {
      const template = getTemplate('strategic-plan', 'technical');
      
      const result = await pdfGenerator.generatePDF(mockContent, template);
      
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    test('should generate PDF for research summary - creative stakeholder', async () => {
      const template = getTemplate('research-summary', 'creative');
      
      const result = await pdfGenerator.generatePDF(mockContent, template);
      
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    test('should generate PDF for implementation roadmap - general stakeholder', async () => {
      const template = getTemplate('implementation-roadmap', 'general');
      
      const result = await pdfGenerator.generatePDF(mockContent, template);
      
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    test('should handle custom formatting options', async () => {
      const template = getTemplate('creative-brief', 'creative');
      
      // Modify template formatting
      const customTemplate = {
        ...template,
        structure: {
          ...template.structure,
          formatting: {
            ...template.structure.formatting,
            headerStyle: {
              fontSize: 20,
              fontWeight: 'bold' as const,
              color: '#FF0000',
            },
          },
        },
      };
      
      const result = await pdfGenerator.generatePDF(mockContent, customTemplate);
      
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    test('should handle content without appendices', async () => {
      const contentWithoutAppendices = {
        ...mockContent,
        appendices: undefined,
      };
      
      const template = getTemplate('creative-brief', 'executive');
      const result = await pdfGenerator.generatePDF(contentWithoutAppendices, template);
      
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('DOCX Generator', () => {
    let docxGenerator: DOCXGenerator;

    beforeEach(() => {
      docxGenerator = new DOCXGenerator();
    });

    test('should generate DOCX for creative brief - executive stakeholder', async () => {
      const template = getTemplate('creative-brief', 'executive');
      
      const result = await docxGenerator.generateDOCX(mockContent, template);
      
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
      
      // Check if it's a valid DOCX file (ZIP signature)
      const zipSignature = result.slice(0, 4);
      expect(zipSignature.toString('hex')).toBe('504b0304'); // ZIP file signature
    });

    test('should generate DOCX for strategic plan - technical stakeholder', async () => {
      const template = getTemplate('strategic-plan', 'technical');
      
      const result = await docxGenerator.generateDOCX(mockContent, template);
      
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
      expect(result.slice(0, 4).toString('hex')).toBe('504b0304');
    });

    test('should generate DOCX for research summary - creative stakeholder', async () => {
      const template = getTemplate('research-summary', 'creative');
      
      const result = await docxGenerator.generateDOCX(mockContent, template);
      
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
      expect(result.slice(0, 4).toString('hex')).toBe('504b0304');
    });

    test('should generate DOCX for implementation roadmap - general stakeholder', async () => {
      const template = getTemplate('implementation-roadmap', 'general');
      
      const result = await docxGenerator.generateDOCX(mockContent, template);
      
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
      expect(result.slice(0, 4).toString('hex')).toBe('504b0304');
    });

    test('should handle custom branding in DOCX', async () => {
      const template = getTemplate('creative-brief', 'creative');
      
      // Modify template with custom branding
      const brandedTemplate = {
        ...template,
        structure: {
          ...template.structure,
          formatting: {
            ...template.structure.formatting,
            branding: {
              includeHeader: true,
              includeLogo: true,
              colorScheme: ['#FF6B35', '#F7931E', '#FFD23F'],
            },
          },
        },
      };
      
      const result = await docxGenerator.generateDOCX(mockContent, brandedTemplate);
      
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
      expect(result.slice(0, 4).toString('hex')).toBe('504b0304');
    });

    test('should handle content with empty recommendations', async () => {
      const contentWithoutRecommendations = {
        ...mockContent,
        recommendations: [],
      };
      
      const template = getTemplate('strategic-plan', 'executive');
      const result = await docxGenerator.generateDOCX(contentWithoutRecommendations, template);
      
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    test('should handle content with long text', async () => {
      const longContent = {
        ...mockContent,
        mainContent: 'A'.repeat(5000), // Very long content
        executiveSummary: 'B'.repeat(1000),
      };
      
      const template = getTemplate('research-summary', 'technical');
      const result = await docxGenerator.generateDOCX(longContent, template);
      
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Template System', () => {
    test('should retrieve all deliverable types', () => {
      const types = ['creative-brief', 'strategic-plan', 'research-summary', 'implementation-roadmap'];
      const stakeholders = ['executive', 'technical', 'creative', 'general'];
      
      types.forEach(type => {
        stakeholders.forEach(stakeholder => {
          const template = getTemplate(type as any, stakeholder as any);
          expect(template).toBeDefined();
          expect(template.type).toBe(type);
          expect(template.stakeholder).toBe(stakeholder);
          expect(template.structure).toBeDefined();
          expect(template.structure.sections).toBeInstanceOf(Array);
          expect(template.structure.sections.length).toBeGreaterThan(0);
        });
      });
    });

    test('should have required sections for each template', () => {
      const template = getTemplate('creative-brief', 'executive');
      
      const requiredSections = template.structure.sections.filter(section => section.required);
      expect(requiredSections.length).toBeGreaterThan(0);
      
      const relevantSections = template.structure.sections.filter(section => 
        section.includeFor.includes('executive')
      );
      expect(relevantSections.length).toBeGreaterThan(0);
    });

    test('should have proper formatting configuration', () => {
      const template = getTemplate('strategic-plan', 'technical');
      
      expect(template.structure.formatting).toBeDefined();
      expect(template.structure.formatting.headerStyle).toBeDefined();
      expect(template.structure.formatting.bodyStyle).toBeDefined();
      expect(template.structure.formatting.pageLayout).toBeDefined();
      
      expect(typeof template.structure.formatting.headerStyle.fontSize).toBe('number');
      expect(typeof template.structure.formatting.bodyStyle.fontSize).toBe('number');
      expect(typeof template.structure.formatting.bodyStyle.lineHeight).toBe('number');
    });

    test('should have stakeholder-specific content filtering', () => {
      const executiveTemplate = getTemplate('research-summary', 'executive');
      const technicalTemplate = getTemplate('research-summary', 'technical');
      
      const executiveSections = executiveTemplate.structure.sections.filter(section => 
        section.includeFor.includes('executive')
      );
      const technicalSections = technicalTemplate.structure.sections.filter(section => 
        section.includeFor.includes('technical')
      );
      
      expect(executiveSections.length).toBeGreaterThan(0);
      expect(technicalSections.length).toBeGreaterThan(0);
      
      // Technical template should have technical-specific sections
      const techSpecificSections = technicalSections.filter(section => 
        section.includeFor.includes('technical') && !section.includeFor.includes('executive')
      );
      expect(techSpecificSections.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid template gracefully', async () => {
      const invalidTemplate = {
        type: 'creative-brief',
        stakeholder: 'executive',
        structure: {
          sections: [], // Empty sections
          formatting: {
            headerStyle: { fontSize: 16, fontWeight: 'bold', color: '#000' },
            bodyStyle: { fontSize: 12, lineHeight: 1.5, fontFamily: 'Arial' },
            pageLayout: { margins: { top: 1, bottom: 1, left: 1, right: 1 }, orientation: 'portrait' },
          },
        },
      } as DeliverableTemplate;
      
      const docxGenerator = new DOCXGenerator();
      const result = await docxGenerator.generateDOCX(mockContent, invalidTemplate);
      
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    test('should handle missing content fields', async () => {
      const incompleteContent = {
        title: 'Test Title',
        executiveSummary: '',
        mainContent: '',
        recommendations: [],
        metadata: mockContent.metadata,
      } as DeliverableContent;
      
      const template = getTemplate('creative-brief', 'general');
      const docxGenerator = new DOCXGenerator();
      
      const result = await docxGenerator.generateDOCX(incompleteContent, template);
      
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    test('should generate documents within reasonable time limits', async () => {
      const start = Date.now();
      
      const template = getTemplate('strategic-plan', 'executive');
      const docxGenerator = new DOCXGenerator();
      
      await docxGenerator.generateDOCX(mockContent, template);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    test('should handle multiple concurrent generations', async () => {
      const template = getTemplate('creative-brief', 'creative');
      
      const promises = Array.from({ length: 3 }, async () => {
        const docxGenerator = new DOCXGenerator();
        return docxGenerator.generateDOCX(mockContent, template);
      });
      
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result).toBeInstanceOf(Buffer);
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });
});
