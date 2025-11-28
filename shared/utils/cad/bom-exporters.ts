import jsPDF from 'jspdf';
import { BOMDocument, BOMItem, BOMColumn } from './bom-generator';

/**
 * BOM Export Utilities
 * Export BOM documents to PDF, SVG, and DXF formats
 */

export class BOMPDFExporter {
  /**
   * Export BOM to PDF
   */
  static exportToPDF(doc: BOMDocument, filename?: string): void {
    const { sheetSettings, titleBlock, items, columns, summary } = doc;
    
    // Get sheet dimensions
    const dimensions = this.getSheetDimensions(doc);
    const orientation = sheetSettings.orientation === 'landscape' ? 'l' : 'p';
    
    // Create PDF
    const pdf = new jsPDF({
      orientation: orientation,
      unit: sheetSettings.units,
      format: [dimensions.width, dimensions.height]
    });

    // Set metadata
    pdf.setProperties({
      title: `${titleBlock.assemblyName} - Bill of Materials`,
      author: titleBlock.author,
      subject: 'Bill of Materials',
      keywords: 'BOM, Assembly, Parts List'
    });

    let yPosition = sheetSettings.margins.top;

    // Draw title block
    yPosition = this.drawTitleBlock(pdf, doc, yPosition);
    yPosition += 10;

    // Draw BOM table
    this.drawBOMTable(pdf, doc, yPosition);

    // Draw footer with summary
    this.drawFooter(pdf, doc, summary);

    // Save PDF
    const pdfFilename = filename || `${titleBlock.assemblyName}_BOM_${new Date().getTime()}.pdf`;
    pdf.save(pdfFilename);
  }

  private static getSheetDimensions(doc: BOMDocument): { width: number; height: number } {
    const sizes: Record<string, { width: number; height: number }> = {
      'A0': { width: 841, height: 1189 },
      'A1': { width: 594, height: 841 },
      'A2': { width: 420, height: 594 },
      'A3': { width: 297, height: 420 },
      'A4': { width: 210, height: 297 },
      'Letter': { width: 215.9, height: 279.4 },
      'Legal': { width: 215.9, height: 355.6 },
      'Tabloid': { width: 279.4, height: 431.8 }
    };

    const size = sizes[doc.sheetSettings.size];
    if (doc.sheetSettings.orientation === 'landscape') {
      return { width: size.height, height: size.width };
    }
    return size;
  }

  private static drawTitleBlock(pdf: jsPDF, doc: BOMDocument, startY: number): number {
    const { titleBlock, sheetSettings } = doc;
    const { margins } = sheetSettings;
    const dimensions = this.getSheetDimensions(doc);
    const pageWidth = dimensions.width;

    let y = startY;

    // Title
    pdf.setFontSize(sheetSettings.fontSize.title);
    pdf.setFont('helvetica', 'bold');
    pdf.text('BILL OF MATERIALS', pageWidth / 2, y, { align: 'center' });
    y += 8;

    // Assembly info
    pdf.setFontSize(sheetSettings.fontSize.body);
    pdf.setFont('helvetica', 'normal');
    
    const leftCol = margins.left;
    const rightCol = pageWidth / 2 + 10;

    // Left column
    pdf.text(`Assembly: ${titleBlock.assemblyName}`, leftCol, y);
    y += 5;
    if (titleBlock.assemblyNumber) {
      pdf.text(`Assembly No: ${titleBlock.assemblyNumber}`, leftCol, y);
      y += 5;
    }
    if (titleBlock.projectName) {
      pdf.text(`Project: ${titleBlock.projectName}`, leftCol, y);
      y += 5;
    }

    // Right column
    let rightY = startY + 8;
    pdf.text(`Revision: ${titleBlock.revision}`, rightCol, rightY);
    rightY += 5;
    pdf.text(`Date: ${titleBlock.date}`, rightCol, rightY);
    rightY += 5;
    pdf.text(`Author: ${titleBlock.author}`, rightCol, rightY);
    
    if (titleBlock.approvedBy) {
      rightY += 5;
      pdf.text(`Approved By: ${titleBlock.approvedBy}`, rightCol, rightY);
    }

    y = Math.max(y, rightY) + 5;

    // Border around title block
    if (sheetSettings.showBorders) {
      pdf.setDrawColor(sheetSettings.colors.border);
      pdf.rect(
        margins.left, 
        startY - 3, 
        pageWidth - margins.left - margins.right, 
        y - startY + 3
      );
    }

    return y;
  }

  private static drawBOMTable(pdf: jsPDF, doc: BOMDocument, startY: number): void {
    const { items, sheetSettings, columns } = doc;
    const { margins, colors, fontSize } = sheetSettings;
    const dimensions = this.getSheetDimensions(doc);
    const pageWidth = dimensions.width;
    const pageHeight = dimensions.height;

    const visibleColumns = columns.filter(col => col.visible);
    const tableWidth = pageWidth - margins.left - margins.right;
    
    // Calculate column widths
    const colWidths = visibleColumns.map(col => (col.width / 100) * tableWidth);

    let y = startY;
    const rowHeight = 7;
    const headerHeight = 8;

    // Draw table header
    pdf.setFillColor(colors.headerBackground);
    pdf.rect(margins.left, y, tableWidth, headerHeight, 'F');

    pdf.setTextColor(colors.headerText);
    pdf.setFontSize(fontSize.header);
    pdf.setFont('helvetica', 'bold');

    let x = margins.left;
    visibleColumns.forEach((col, i) => {
      const text = col.label;
      const colWidth = colWidths[i];
      const textX = x + (col.align === 'center' ? colWidth / 2 : col.align === 'right' ? colWidth - 2 : 2);
      pdf.text(text, textX, y + 5.5, { align: col.align });
      
      // Draw vertical separator
      if (i < visibleColumns.length - 1 && sheetSettings.showGrid) {
        pdf.setDrawColor(colors.border);
        pdf.line(x + colWidth, y, x + colWidth, y + headerHeight);
      }
      
      x += colWidth;
    });

    y += headerHeight;

    // Draw table rows
    pdf.setTextColor(colors.text);
    pdf.setFontSize(fontSize.body);
    pdf.setFont('helvetica', 'normal');

    items.forEach((item, rowIndex) => {
      // Check if we need a new page
      if (y + rowHeight > pageHeight - margins.bottom - 20) {
        pdf.addPage();
        y = margins.top;
        
        // Redraw header on new page
        pdf.setFillColor(colors.headerBackground);
        pdf.rect(margins.left, y, tableWidth, headerHeight, 'F');
        pdf.setTextColor(colors.headerText);
        pdf.setFontSize(fontSize.header);
        pdf.setFont('helvetica', 'bold');
        
        let headerX = margins.left;
        visibleColumns.forEach((col, i) => {
          const colWidth = colWidths[i];
          const textX = headerX + (col.align === 'center' ? colWidth / 2 : col.align === 'right' ? colWidth - 2 : 2);
          pdf.text(col.label, textX, y + 5.5, { align: col.align });
          headerX += colWidth;
        });
        
        y += headerHeight;
        pdf.setTextColor(colors.text);
        pdf.setFontSize(fontSize.body);
        pdf.setFont('helvetica', 'normal');
      }

      // Alternate row background
      if (rowIndex % 2 === 1 && colors.alternateRow) {
        pdf.setFillColor(colors.alternateRow);
        pdf.rect(margins.left, y, tableWidth, rowHeight, 'F');
      }

      // Draw row data
      x = margins.left;
      visibleColumns.forEach((col, i) => {
        const value = item[col.field as keyof BOMItem];
        const formatted = col.format ? col.format(value) : String(value || '');
        const colWidth = colWidths[i];
        const textX = x + (col.align === 'center' ? colWidth / 2 : col.align === 'right' ? colWidth - 2 : 2);
        
        // Indent for hierarchy
        const indent = item.level > 0 ? item.level * 3 : 0;
        const finalX = col.field === 'description' ? textX + indent : textX;
        
        pdf.text(formatted, finalX, y + 5, { align: col.align, maxWidth: colWidth - 4 - indent });
        
        // Draw vertical grid lines
        if (i < visibleColumns.length - 1 && sheetSettings.showGrid) {
          pdf.setDrawColor(colors.border);
          pdf.line(x + colWidth, y, x + colWidth, y + rowHeight);
        }
        
        x += colWidth;
      });

      // Draw horizontal grid line
      if (sheetSettings.showGrid) {
        pdf.setDrawColor(colors.border);
        pdf.line(margins.left, y + rowHeight, pageWidth - margins.right, y + rowHeight);
      }

      y += rowHeight;
    });

    // Draw table border
    if (sheetSettings.showBorders) {
      pdf.setDrawColor(colors.border);
      const tableHeight = y - startY;
      pdf.rect(margins.left, startY, tableWidth, tableHeight);
    }
  }

  private static drawFooter(pdf: jsPDF, doc: BOMDocument, summary: BOMDocument['summary']): void {
    const { sheetSettings } = doc;
    const dimensions = this.getSheetDimensions(doc);
    const pageWidth = dimensions.width;
    const pageHeight = dimensions.height;
    
    const y = pageHeight - sheetSettings.margins.bottom + 5;

    pdf.setFontSize(sheetSettings.fontSize.footer);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(sheetSettings.colors.text);

    // Summary info
    const summaryText: string[] = [];
    summaryText.push(`Total Parts: ${summary.totalParts}`);
    summaryText.push(`Unique Parts: ${summary.uniqueParts}`);
    if (summary.totalWeight) {
      summaryText.push(`Total Weight: ${summary.totalWeight.toFixed(2)} kg`);
    }
    if (summary.totalCost) {
      summaryText.push(`Total Cost: $${summary.totalCost.toFixed(2)}`);
    }

    pdf.text(summaryText.join(' | '), sheetSettings.margins.left, y);

    // Page number
    if (sheetSettings.includePageNumbers) {
      const pageNum = pdf.getCurrentPageInfo().pageNumber;
      pdf.text(`Page ${pageNum}`, pageWidth - sheetSettings.margins.right, y, { align: 'right' });
    }
  }
}

export class BOMSVGExporter {
  /**
   * Export BOM to SVG
   */
  static exportToSVG(doc: BOMDocument, filename?: string): void {
    const { sheetSettings, titleBlock, items, columns, summary } = doc;
    const dimensions = this.getSheetDimensions(doc);

    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${dimensions.width}${sheetSettings.units}" height="${dimensions.height}${sheetSettings.units}" 
     xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dimensions.width} ${dimensions.height}">
  <defs>
    <style>
      .title { font-size: ${sheetSettings.fontSize.title}px; font-weight: bold; }
      .header { font-size: ${sheetSettings.fontSize.header}px; font-weight: bold; fill: ${sheetSettings.colors.headerText}; }
      .body { font-size: ${sheetSettings.fontSize.body}px; fill: ${sheetSettings.colors.text}; }
      .footer { font-size: ${sheetSettings.fontSize.footer}px; fill: ${sheetSettings.colors.text}; }
    </style>
  </defs>
  <rect width="${dimensions.width}" height="${dimensions.height}" fill="white"/>
`;

    let y = sheetSettings.margins.top;

    // Title block
    svg += `  <g id="title-block">
    <text x="${dimensions.width / 2}" y="${y}" class="title" text-anchor="middle">BILL OF MATERIALS</text>
`;
    y += 10;
    
    svg += `    <text x="${sheetSettings.margins.left}" y="${y}" class="body">Assembly: ${this.escapeXml(titleBlock.assemblyName)}</text>
    <text x="${dimensions.width / 2 + 10}" y="${y}" class="body">Revision: ${titleBlock.revision}</text>
`;
    y += 6;
    svg += `    <text x="${sheetSettings.margins.left}" y="${y}" class="body">Date: ${titleBlock.date}</text>
    <text x="${dimensions.width / 2 + 10}" y="${y}" class="body">Author: ${this.escapeXml(titleBlock.author)}</text>
  </g>
`;
    y += 10;

    // Table
    const visibleColumns = columns.filter(col => col.visible);
    const tableWidth = dimensions.width - sheetSettings.margins.left - sheetSettings.margins.right;
    const colWidths = visibleColumns.map(col => (col.width / 100) * tableWidth);
    const rowHeight = 7;
    const headerHeight = 8;

    svg += `  <g id="bom-table">
    <rect x="${sheetSettings.margins.left}" y="${y}" width="${tableWidth}" height="${headerHeight}" 
          fill="${sheetSettings.colors.headerBackground}"/>
`;

    // Header
    let x = sheetSettings.margins.left;
    visibleColumns.forEach((col, i) => {
      const colWidth = colWidths[i];
      const textX = x + (col.align === 'center' ? colWidth / 2 : col.align === 'right' ? colWidth - 2 : 2);
      const anchor = col.align === 'center' ? 'middle' : col.align === 'right' ? 'end' : 'start';
      
      svg += `    <text x="${textX}" y="${y + 5.5}" class="header" text-anchor="${anchor}">${this.escapeXml(col.label)}</text>
`;
      x += colWidth;
    });

    y += headerHeight;

    // Rows
    items.forEach((item, rowIndex) => {
      if (rowIndex % 2 === 1 && sheetSettings.colors.alternateRow) {
        svg += `    <rect x="${sheetSettings.margins.left}" y="${y}" width="${tableWidth}" height="${rowHeight}" fill="${sheetSettings.colors.alternateRow}"/>
`;
      }

      x = sheetSettings.margins.left;
      visibleColumns.forEach((col, i) => {
        const value = item[col.field as keyof BOMItem];
        const formatted = col.format ? col.format(value) : String(value || '');
        const colWidth = colWidths[i];
        const indent = item.level > 0 && col.field === 'description' ? item.level * 3 : 0;
        const textX = x + (col.align === 'center' ? colWidth / 2 : col.align === 'right' ? colWidth - 2 : 2) + indent;
        const anchor = col.align === 'center' ? 'middle' : col.align === 'right' ? 'end' : 'start';
        
        svg += `    <text x="${textX}" y="${y + 5}" class="body" text-anchor="${anchor}">${this.escapeXml(formatted)}</text>
`;
        x += colWidth;
      });

      y += rowHeight;
    });

    // Table border
    if (sheetSettings.showBorders) {
      const tableHeight = y - (sheetSettings.margins.top + 20 + headerHeight);
      svg += `    <rect x="${sheetSettings.margins.left}" y="${sheetSettings.margins.top + 20}" 
            width="${tableWidth}" height="${tableHeight}" fill="none" 
            stroke="${sheetSettings.colors.border}" stroke-width="0.5"/>
`;
    }

    svg += `  </g>
`;

    // Footer
    const footerY = dimensions.height - sheetSettings.margins.bottom + 5;
    const summaryText = `Total Parts: ${summary.totalParts} | Unique Parts: ${summary.uniqueParts}`;
    svg += `  <g id="footer">
    <text x="${sheetSettings.margins.left}" y="${footerY}" class="footer">${this.escapeXml(summaryText)}</text>
  </g>
`;

    svg += `</svg>`;

    // Download SVG
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `${titleBlock.assemblyName}_BOM_${new Date().getTime()}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private static getSheetDimensions(doc: BOMDocument): { width: number; height: number } {
    const sizes: Record<string, { width: number; height: number }> = {
      'A0': { width: 841, height: 1189 },
      'A1': { width: 594, height: 841 },
      'A2': { width: 420, height: 594 },
      'A3': { width: 297, height: 420 },
      'A4': { width: 210, height: 297 },
      'Letter': { width: 215.9, height: 279.4 },
      'Legal': { width: 215.9, height: 355.6 },
      'Tabloid': { width: 279.4, height: 431.8 }
    };

    const size = sizes[doc.sheetSettings.size];
    if (doc.sheetSettings.orientation === 'landscape') {
      return { width: size.height, height: size.width };
    }
    return size;
  }

  private static escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export class BOMDXFExporter {
  /**
   * Export BOM to DXF (as table entities)
   */
  static exportToDXF(doc: BOMDocument, filename?: string): void {
    const { items, columns, sheetSettings } = doc;
    const dimensions = this.getSheetDimensions(doc);

    let dxf = '';

    // Header
    dxf += this.generateHeader();

    // Tables section
    dxf += this.generateTables();

    // Entities
    dxf += '0\nSECTION\n2\nENTITIES\n';

    // Draw border
    dxf += this.generateRectangle(
      0, 0,
      dimensions.width, dimensions.height,
      'BORDER'
    );

    // Draw title
    let y = sheetSettings.margins.top;
    dxf += this.generateText(
      'BILL OF MATERIALS',
      dimensions.width / 2,
      y,
      sheetSettings.fontSize.title,
      'TITLE',
      'center'
    );

    y += 20;

    // Draw table
    const visibleColumns = columns.filter(col => col.visible);
    const tableWidth = dimensions.width - sheetSettings.margins.left - sheetSettings.margins.right;
    const colWidths = visibleColumns.map(col => (col.width / 100) * tableWidth);
    const rowHeight = 7;

    // Table header
    let x = sheetSettings.margins.left;
    visibleColumns.forEach((col, i) => {
      const colWidth = colWidths[i];
      dxf += this.generateText(
        col.label,
        x + colWidth / 2,
        y,
        sheetSettings.fontSize.header,
        'HEADER',
        'center'
      );
      x += colWidth;
    });

    y += rowHeight;

    // Table rows
    items.forEach(item => {
      x = sheetSettings.margins.left;
      visibleColumns.forEach((col, i) => {
        const value = item[col.field as keyof BOMItem];
        const formatted = col.format ? col.format(value) : String(value || '');
        const colWidth = colWidths[i];
        const textX = x + (col.align === 'center' ? colWidth / 2 : col.align === 'right' ? colWidth - 2 : 2);
        
        dxf += this.generateText(
          formatted,
          textX,
          y,
          sheetSettings.fontSize.body,
          'TEXT',
          col.align
        );
        x += colWidth;
      });
      y += rowHeight;
    });

    // End entities
    dxf += 'ENDSEC\n';

    // EOF
    dxf += '0\nEOF\n';

    // Download DXF
    const blob = new Blob([dxf], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `${doc.titleBlock.assemblyName}_BOM_${new Date().getTime()}.dxf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private static getSheetDimensions(doc: BOMDocument): { width: number; height: number } {
    const sizes: Record<string, { width: number; height: number }> = {
      'A0': { width: 841, height: 1189 },
      'A1': { width: 594, height: 841 },
      'A2': { width: 420, height: 594 },
      'A3': { width: 297, height: 420 },
      'A4': { width: 210, height: 297 },
      'Letter': { width: 215.9, height: 279.4 },
      'Legal': { width: 215.9, height: 355.6 },
      'Tabloid': { width: 279.4, height: 431.8 }
    };

    const size = sizes[doc.sheetSettings.size];
    if (doc.sheetSettings.orientation === 'landscape') {
      return { width: size.height, height: size.width };
    }
    return size;
  }

  private static generateHeader(): string {
    return `0
SECTION
2
HEADER
9
$ACADVER
1
AC1015
9
$INSUNITS
70
4
0
ENDSEC
`;
  }

  private static generateTables(): string {
    return `0
SECTION
2
TABLES
0
TABLE
2
LAYER
70
5
0
LAYER
2
BORDER
70
0
62
7
6
CONTINUOUS
0
LAYER
2
TITLE
70
0
62
1
6
CONTINUOUS
0
LAYER
2
HEADER
70
0
62
2
6
CONTINUOUS
0
LAYER
2
TEXT
70
0
62
7
6
CONTINUOUS
0
ENDTAB
0
ENDSEC
`;
  }

  private static generateText(
    text: string,
    x: number,
    y: number,
    height: number,
    layer: string,
    align: string = 'left'
  ): string {
    const alignCode = align === 'center' ? 1 : align === 'right' ? 2 : 0;
    
    return `0
TEXT
8
${layer}
10
${x}
20
${y}
40
${height}
1
${text}
72
${alignCode}
`;
  }

  private static generateRectangle(
    x: number,
    y: number,
    width: number,
    height: number,
    layer: string
  ): string {
    let dxf = '';
    
    // Draw 4 lines for rectangle
    const points = [
      { x1: x, y1: y, x2: x + width, y2: y },
      { x1: x + width, y1: y, x2: x + width, y2: y + height },
      { x1: x + width, y1: y + height, x2: x, y2: y + height },
      { x1: x, y1: y + height, x2: x, y2: y }
    ];

    points.forEach(line => {
      dxf += `0
LINE
8
${layer}
10
${line.x1}
20
${line.y1}
11
${line.x2}
21
${line.y2}
`;
    });

    return dxf;
  }
}
