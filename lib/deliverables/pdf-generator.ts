import puppeteer, { Browser, Page } from 'puppeteer';
import { DeliverableContent, DeliverableTemplate, DeliverableSection } from '../../types/deliverables';

export class PDFGenerator {
  private browser: Browser | null = null;

  async initialize(): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
  }

  async generatePDF(content: DeliverableContent, template: DeliverableTemplate): Promise<Buffer> {
    await this.initialize();
    
    if (!this.browser) {
      throw new Error('Failed to initialize browser');
    }

    const page = await this.browser.newPage();
    
    try {
      const html = this.generateHTML(content, template);
      
      await page.setContent(html, {
        waitUntil: 'networkidle0',
      });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: `${template.structure.formatting.pageLayout.margins.top}in`,
          bottom: `${template.structure.formatting.pageLayout.margins.bottom}in`,
          left: `${template.structure.formatting.pageLayout.margins.left}in`,
          right: `${template.structure.formatting.pageLayout.margins.right}in`,
        },
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: this.generateHeader(template),
        footerTemplate: this.generateFooter(content),
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await page.close();
    }
  }

  private generateHTML(content: DeliverableContent, template: DeliverableTemplate): string {
    const { sections, formatting } = template.structure;
    const relevantSections = sections.filter(section => 
      section.includeFor.includes(template.stakeholder)
    );

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${content.title}</title>
    <style>
        ${this.generateCSS(formatting)}
    </style>
</head>
<body>
    <div class="document">
        ${this.generateTitlePage(content, template)}
        ${this.generateTableOfContents(relevantSections)}
        ${this.generateContent(content, relevantSections)}
        ${this.generateAppendices(content)}
    </div>
</body>
</html>`;
  }

  private generateCSS(formatting: DeliverableTemplate['structure']['formatting']): string {
    const { headerStyle, bodyStyle, branding } = formatting;
    
    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: ${bodyStyle.fontFamily};
            font-size: ${bodyStyle.fontSize}pt;
            line-height: ${bodyStyle.lineHeight};
            color: #333;
        }
        
        .document {
            max-width: 100%;
            margin: 0 auto;
        }
        
        .title-page {
            page-break-after: always;
            text-align: center;
            padding: 2in 0;
        }
        
        .title {
            font-size: 24pt;
            font-weight: bold;
            color: ${headerStyle.color};
            margin-bottom: 1in;
        }
        
        .subtitle {
            font-size: 16pt;
            color: #666;
            margin-bottom: 0.5in;
        }
        
        .metadata {
            font-size: 12pt;
            color: #888;
            margin-top: 2in;
        }
        
        .toc {
            page-break-after: always;
            padding: 1in 0;
        }
        
        .toc h1 {
            font-size: ${headerStyle.fontSize}pt;
            font-weight: ${headerStyle.fontWeight};
            color: ${headerStyle.color};
            margin-bottom: 0.5in;
            border-bottom: 2px solid ${branding?.colorScheme?.[0] || headerStyle.color};
            padding-bottom: 0.1in;
        }
        
        .toc-item {
            display: flex;
            justify-content: space-between;
            margin: 0.1in 0;
            border-bottom: 1px dotted #ccc;
        }
        
        .toc-title {
            flex: 1;
        }
        
        .toc-page {
            margin-left: 0.2in;
        }
        
        .section {
            margin-bottom: 1in;
            page-break-inside: avoid;
        }
        
        .section h1 {
            font-size: ${headerStyle.fontSize}pt;
            font-weight: ${headerStyle.fontWeight};
            color: ${headerStyle.color};
            margin-bottom: 0.3in;
            padding-bottom: 0.1in;
            border-bottom: 2px solid ${branding?.colorScheme?.[0] || headerStyle.color};
        }
        
        .section h2 {
            font-size: ${headerStyle.fontSize - 2}pt;
            font-weight: ${headerStyle.fontWeight};
            color: ${branding?.colorScheme?.[1] || '#666'};
            margin: 0.3in 0 0.2in 0;
        }
        
        .section p {
            margin-bottom: 0.15in;
            text-align: justify;
        }
        
        .executive-summary {
            background-color: ${branding?.colorScheme?.[0]}10;
            border-left: 4px solid ${branding?.colorScheme?.[0] || headerStyle.color};
            padding: 0.3in;
            margin: 0.3in 0;
        }
        
        .recommendations {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            padding: 0.3in;
            margin: 0.3in 0;
        }
        
        .recommendations h3 {
            color: ${branding?.colorScheme?.[0] || headerStyle.color};
            margin-bottom: 0.2in;
        }
        
        .recommendations ul {
            list-style-type: none;
            padding-left: 0;
        }
        
        .recommendations li {
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 2px;
            padding: 0.15in;
            margin: 0.1in 0;
            position: relative;
            padding-left: 0.4in;
        }
        
        .recommendations li:before {
            content: "→";
            color: ${branding?.colorScheme?.[0] || headerStyle.color};
            font-weight: bold;
            position: absolute;
            left: 0.15in;
        }
        
        .metadata-table {
            width: 100%;
            border-collapse: collapse;
            margin: 0.3in 0;
        }
        
        .metadata-table th,
        .metadata-table td {
            border: 1px solid #dee2e6;
            padding: 0.1in;
            text-align: left;
        }
        
        .metadata-table th {
            background-color: ${branding?.colorScheme?.[0] || headerStyle.color};
            color: white;
            font-weight: bold;
        }
        
        .appendix {
            page-break-before: always;
            margin-top: 1in;
        }
        
        .page-break {
            page-break-before: always;
        }
        
        .branding-header {
            text-align: center;
            border-bottom: 2px solid ${branding?.colorScheme?.[0] || headerStyle.color};
            padding-bottom: 0.2in;
            margin-bottom: 0.5in;
        }
        
        .highlight {
            background-color: ${branding?.colorScheme?.[2] || '#fef3c7'};
            padding: 0.1in 0.2in;
            border-radius: 2px;
        }
    `;
  }

  private generateTitlePage(content: DeliverableContent, template: DeliverableTemplate): string {
    return `
        <div class="title-page">
            ${template.structure.formatting.branding?.includeHeader ? '<div class="branding-header">AI Council</div>' : ''}
            <h1 class="title">${content.title}</h1>
            <div class="subtitle">${template.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} for ${template.stakeholder.charAt(0).toUpperCase() + template.stakeholder.slice(1)} Stakeholders</div>
            <div class="metadata">
                <div><strong>Generated:</strong> ${content.metadata.generatedAt.toLocaleDateString()}</div>
                <div><strong>Session Duration:</strong> ${Math.round(content.metadata.sessionDuration / 60)} minutes</div>
                <div><strong>Participants:</strong> ${content.metadata.participants.join(', ')}</div>
                ${content.metadata.tags.length > 0 ? `<div><strong>Tags:</strong> ${content.metadata.tags.join(', ')}</div>` : ''}
            </div>
        </div>
    `;
  }

  private generateTableOfContents(sections: DeliverableSection[]): string {
    const tocItems = sections
      .filter(section => section.required || section.content)
      .map((section, index) => `
        <div class="toc-item">
            <span class="toc-title">${section.title}</span>
            <span class="toc-page">${index + 3}</span>
        </div>
      `)
      .join('');

    return `
        <div class="toc">
            <h1>Table of Contents</h1>
            ${tocItems}
        </div>
    `;
  }

  private generateContent(content: DeliverableContent, sections: DeliverableSection[]): string {
    return sections
      .filter(section => section.required || section.content)
      .map(section => this.generateSection(content, section))
      .join('');
  }

  private generateSection(content: DeliverableContent, section: DeliverableSection): string {
    let sectionContent = '';

    // Handle special sections
    switch (section.id) {
      case 'executive-summary':
        sectionContent = `<div class="executive-summary">${content.executiveSummary}</div>`;
        break;
      case 'recommendations':
        sectionContent = this.generateRecommendations(content.recommendations);
        break;
      default:
        sectionContent = `<p>${section.content}</p>`;
        if (section.id.includes('main') || section.id.includes('content')) {
          sectionContent += `<div class="highlight">${content.mainContent}</div>`;
        }
        break;
    }

    // Handle subsections
    if (section.subsections && section.subsections.length > 0) {
      const subsectionContent = section.subsections
        .map(subsection => `
          <h2>${subsection.title}</h2>
          <p>${subsection.content}</p>
        `)
        .join('');
      sectionContent += subsectionContent;
    }

    return `
        <div class="section">
            <h1>${section.title}</h1>
            ${sectionContent}
        </div>
    `;
  }

  private generateRecommendations(recommendations: string[]): string {
    const recommendationItems = recommendations
      .map(rec => `<li>${rec}</li>`)
      .join('');

    return `
        <div class="recommendations">
            <h3>Key Recommendations</h3>
            <ul>
                ${recommendationItems}
            </ul>
        </div>
    `;
  }

  private generateAppendices(content: DeliverableContent): string {
    if (!content.appendices || content.appendices.length === 0) {
      return '';
    }

    const appendixContent = content.appendices
      .map((appendix, index) => `
        <div class="section">
            <h1>Appendix ${String.fromCharCode(65 + index)}</h1>
            <p>${appendix}</p>
        </div>
      `)
      .join('');

    return `
        <div class="appendix">
            <h1>Appendices</h1>
            ${appendixContent}
        </div>
    `;
  }

  private generateHeader(template: DeliverableTemplate): string {
    if (!template.structure.formatting.branding?.includeHeader) {
      return '<div></div>';
    }

    return `
        <div style="font-size: 10px; color: #666; text-align: center; width: 100%; padding: 10px 0;">
            AI Council - ${template.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </div>
    `;
  }

  private generateFooter(content: DeliverableContent): string {
    return `
        <div style="font-size: 10px; color: #666; text-align: center; width: 100%; padding: 10px 0;">
            <span>Generated on ${content.metadata.generatedAt.toLocaleDateString()}</span>
            <span style="float: right;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
    `;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
