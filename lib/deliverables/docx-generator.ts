import { Document, Packer, Paragraph, HeadingLevel, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType, BorderStyle, ShadingType, TableOfContents, PageBreak, Footer, Header } from 'docx';
import { DeliverableContent, DeliverableTemplate, DeliverableSection } from '../../types/deliverables';

export class DOCXGenerator {
  async generateDOCX(content: DeliverableContent, template: DeliverableTemplate): Promise<Buffer> {
    const { sections, formatting } = template.structure;
    const relevantSections = sections.filter(section => 
      section.includeFor.includes(template.stakeholder)
    );

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: formatting.pageLayout.margins.top * 1440, // Convert inches to twips
              bottom: formatting.pageLayout.margins.bottom * 1440,
              left: formatting.pageLayout.margins.left * 1440,
              right: formatting.pageLayout.margins.right * 1440,
            },
          },
        },
        headers: {
          default: this.generateDocHeader(template),
        },
        footers: {
          default: this.generateDocFooter(content),
        },
        children: [
          ...this.generateTitlePage(content, template),
          new PageBreak(),
          ...this.generateTableOfContents(relevantSections),
          new PageBreak(),
          ...this.generateDocContent(content, relevantSections, formatting),
          ...this.generateDocAppendices(content),
        ],
      }],
      styles: {
        paragraphStyles: [
          {
            id: "Heading1",
            name: "Heading 1",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: {
              size: formatting.headerStyle.fontSize * 2, // Convert to half-points
              bold: formatting.headerStyle.fontWeight === 'bold',
              color: formatting.headerStyle.color.replace('#', ''),
            },
            paragraph: {
              spacing: {
                after: 240,
                before: 240,
              },
            },
          },
          {
            id: "Heading2",
            name: "Heading 2",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: {
              size: (formatting.headerStyle.fontSize - 2) * 2,
              bold: true,
              color: formatting.branding?.colorScheme?.[1]?.replace('#', '') || '666666',
            },
            paragraph: {
              spacing: {
                after: 120,
                before: 180,
              },
            },
          },
          {
            id: "Normal",
            name: "Normal",
            run: {
              size: formatting.bodyStyle.fontSize * 2,
              font: formatting.bodyStyle.fontFamily.split(',')[0].trim(),
            },
            paragraph: {
              spacing: {
                line: Math.round(formatting.bodyStyle.lineHeight * 240),
                after: 120,
              },
            },
          },
          {
            id: "ExecutiveSummary",
            name: "Executive Summary",
            basedOn: "Normal",
            paragraph: {
              shading: {
                type: ShadingType.CLEAR,
                color: "auto",
                fill: formatting.branding?.colorScheme?.[0]?.replace('#', '') + '10' || 'F0F8FF',
              },
              border: {
                left: {
                  color: formatting.branding?.colorScheme?.[0]?.replace('#', '') || '3B82F6',
                  space: 1,
                  style: BorderStyle.SINGLE,
                  size: 12,
                },
              },
              indent: {
                left: 240,
              },
              spacing: {
                after: 240,
              },
            },
          },
        ],
      },
    });

    return await Packer.toBuffer(doc);
  }

  private generateTitlePage(content: DeliverableContent, template: DeliverableTemplate): Paragraph[] {
    const titleElements: Paragraph[] = [];

    // Add branding header if enabled
    if (template.structure.formatting.branding?.includeHeader) {
      titleElements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "AI Council",
              size: 32,
              bold: true,
              color: template.structure.formatting.branding.colorScheme?.[0]?.replace('#', '') || '3B82F6',
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 480 },
        })
      );
    }

    // Document title
    titleElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: content.title,
            size: 48,
            bold: true,
            color: template.structure.formatting.headerStyle.color.replace('#', ''),
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `${template.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} for ${template.stakeholder.charAt(0).toUpperCase() + template.stakeholder.slice(1)} Stakeholders`,
            size: 24,
            color: "666666",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 720 },
      })
    );

    // Metadata table
    const metadataTable = new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "Generated:", bold: true })] })],
              width: { size: 30, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: content.metadata.generatedAt.toLocaleDateString() })] })],
              width: { size: 70, type: WidthType.PERCENTAGE },
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "Session Duration:", bold: true })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: `${Math.round(content.metadata.sessionDuration / 60)} minutes` })] })],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "Participants:", bold: true })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: content.metadata.participants.join(', ') })] })],
            }),
          ],
        }),
        ...(content.metadata.tags.length > 0 ? [
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: "Tags:", bold: true })] })],
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: content.metadata.tags.join(', ') })] })],
              }),
            ],
          })
        ] : []),
      ],
      margins: {
        top: 100,
        bottom: 100,
        left: 100,
        right: 100,
      },
    });

    titleElements.push(
      new Paragraph({ children: [], spacing: { before: 720 } }),
      new Paragraph({ children: [metadataTable] })
    );

    return titleElements;
  }

  private generateTableOfContents(sections: DeliverableSection[]): Paragraph[] {
    const tocElements: Paragraph[] = [
      new Paragraph({
        children: [
          new TextRun({
            text: "Table of Contents",
            size: 32,
            bold: true,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 360 },
      }),
    ];

    const relevantSections = sections.filter(section => section.required || section.content);
    
    relevantSections.forEach((section, index) => {
      tocElements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${index + 1}. ${section.title}`,
            }),
            new TextRun({
              text: `\t${index + 3}`,
              tabStops: [{
                type: "right",
                position: 8000,
                leader: "dot",
              }],
            }),
          ],
          spacing: { after: 120 },
        })
      );
    });

    return tocElements;
  }

  private generateDocContent(content: DeliverableContent, sections: DeliverableSection[], formatting: DeliverableTemplate['structure']['formatting']): Paragraph[] {
    const contentElements: Paragraph[] = [];

    sections
      .filter(section => section.required || section.content)
      .forEach(section => {
        contentElements.push(...this.generateDocSection(content, section, formatting));
      });

    return contentElements;
  }

  private generateDocSection(content: DeliverableContent, section: DeliverableSection, formatting: DeliverableTemplate['structure']['formatting']): Paragraph[] {
    const sectionElements: Paragraph[] = [];

    // Section heading
    sectionElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: section.title,
            size: formatting.headerStyle.fontSize * 2,
            bold: formatting.headerStyle.fontWeight === 'bold',
            color: formatting.headerStyle.color.replace('#', ''),
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 360, after: 240 },
      })
    );

    // Section content based on type
    switch (section.id) {
      case 'executive-summary':
        sectionElements.push(
          new Paragraph({
            children: [
              new TextRun({
                text: content.executiveSummary,
              }),
            ],
            style: "ExecutiveSummary",
          })
        );
        break;

      case 'recommendations':
        sectionElements.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "Key Recommendations",
                bold: true,
                size: formatting.headerStyle.fontSize * 2 - 4,
                color: formatting.branding?.colorScheme?.[0]?.replace('#', '') || '3B82F6',
              }),
            ],
            spacing: { after: 120 },
          })
        );

        content.recommendations.forEach((recommendation, index) => {
          sectionElements.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `${index + 1}. ${recommendation}`,
                }),
              ],
              spacing: { after: 120 },
              indent: { left: 360 },
            })
          );
        });
        break;

      default:
        // Standard section content
        sectionElements.push(
          new Paragraph({
            children: [new TextRun({ text: section.content })],
            spacing: { after: 240 },
          })
        );

        // Add main content if this is a content section
        if (section.id.includes('main') || section.id.includes('content')) {
          sectionElements.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: content.mainContent,
                  highlight: formatting.branding?.colorScheme?.[2]?.replace('#', '') || 'FFFF00',
                }),
              ],
              spacing: { after: 240 },
            })
          );
        }
        break;
    }

    // Handle subsections
    if (section.subsections && section.subsections.length > 0) {
      section.subsections.forEach(subsection => {
        sectionElements.push(
          new Paragraph({
            children: [
              new TextRun({
                text: subsection.title,
                size: (formatting.headerStyle.fontSize - 2) * 2,
                bold: true,
                color: formatting.branding?.colorScheme?.[1]?.replace('#', '') || '666666',
              }),
            ],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 },
          }),
          new Paragraph({
            children: [new TextRun({ text: subsection.content })],
            spacing: { after: 180 },
          })
        );
      });
    }

    return sectionElements;
  }

  private generateDocAppendices(content: DeliverableContent): Paragraph[] {
    if (!content.appendices || content.appendices.length === 0) {
      return [];
    }

    const appendixElements: Paragraph[] = [
      new PageBreak(),
      new Paragraph({
        children: [
          new TextRun({
            text: "Appendices",
            size: 32,
            bold: true,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 360 },
      }),
    ];

    content.appendices.forEach((appendix, index) => {
      appendixElements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Appendix ${String.fromCharCode(65 + index)}`,
              size: 24,
              bold: true,
            }),
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
        }),
        new Paragraph({
          children: [new TextRun({ text: appendix })],
          spacing: { after: 240 },
        })
      );
    });

    return appendixElements;
  }

  private generateDocHeader(template: DeliverableTemplate): Header {
    if (!template.structure.formatting.branding?.includeHeader) {
      return new Header({
        children: [new Paragraph({ children: [] })],
      });
    }

    return new Header({
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: `AI Council - ${template.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
              size: 16,
              color: "666666",
            }),
          ],
          alignment: AlignmentType.CENTER,
          border: {
            bottom: {
              color: template.structure.formatting.branding.colorScheme?.[0]?.replace('#', '') || '3B82F6',
              space: 1,
              style: BorderStyle.SINGLE,
              size: 6,
            },
          },
          spacing: { after: 120 },
        }),
      ],
    });
  }

  private generateDocFooter(content: DeliverableContent): Footer {
    return new Footer({
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: `Generated on ${content.metadata.generatedAt.toLocaleDateString()}`,
              size: 16,
              color: "666666",
            }),
            new TextRun({
              text: "\tPage ",
              size: 16,
              color: "666666",
            }),
          ],
          alignment: AlignmentType.CENTER,
          border: {
            top: {
              color: "CCCCCC",
              space: 1,
              style: BorderStyle.SINGLE,
              size: 6,
            },
          },
          spacing: { before: 120 },
        }),
      ],
    });
  }
}
