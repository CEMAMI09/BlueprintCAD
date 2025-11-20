import { jsPDF } from 'jspdf';
import { DrawingSheet, DrawingEdge, Dimension, DrawingAnnotation } from './drawing-system';

/**
 * Export drawing sheet to PDF
 */
export class PDFExporter {
  /**
   * Export a drawing sheet to PDF
   */
  static exportToPDF(sheet: DrawingSheet): void {
    // Create PDF with sheet dimensions
    const pdf = new jsPDF({
      orientation: sheet.orientation === 'landscape' ? 'l' : 'p',
      unit: 'mm',
      format: [sheet.width, sheet.height]
    });

    // Set PDF metadata
    pdf.setProperties({
      title: sheet.titleBlock.title,
      subject: `Drawing Sheet ${sheet.name}`,
      author: sheet.titleBlock.drawnBy || 'Unknown',
      keywords: 'CAD, Drawing, Engineering',
      creator: 'Blueprint CAD System'
    });

    // Draw sheet border
    pdf.setDrawColor(100, 100, 100);
    pdf.setLineWidth(0.5);
    pdf.rect(10, 10, sheet.width - 20, sheet.height - 20);

    // Draw title block
    this.drawTitleBlock(pdf, sheet);

    // Draw all views
    for (const view of sheet.views) {
      this.drawView(pdf, view, sheet);
    }

    // Save PDF
    pdf.save(`${sheet.name}.pdf`);
  }

  /**
   * Draw title block
   */
  private static drawTitleBlock(pdf: jsPDF, sheet: DrawingSheet): void {
    const x = sheet.width - 210;
    const y = sheet.height - 60;
    const w = 200;
    const h = 50;

    // Border
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    pdf.rect(x, y, w, h);

    // Title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(sheet.titleBlock.title, x + 5, y + 10);

    // Details grid
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');

    const details = [
      [`Drawing: ${sheet.name}`, `Scale: ${sheet.titleBlock.scale}`],
      [`Part Number: ${sheet.titleBlock.partNumber || 'N/A'}`, `Revision: ${sheet.titleBlock.revision}`],
      [`Drawn By: ${sheet.titleBlock.drawnBy || 'N/A'}`, `Material: ${sheet.titleBlock.material || 'N/A'}`],
      [`Date: ${new Date(sheet.updatedAt).toLocaleDateString()}`, ``],
    ];

    let yOffset = y + 20;
    for (const [left, right] of details) {
      pdf.text(left, x + 5, yOffset);
      pdf.text(right, x + w / 2 + 5, yOffset);
      yOffset += 7;
    }
  }

  /**
   * Draw a view
   */
  private static drawView(pdf: jsPDF, view: any, sheet: DrawingSheet): void {
    // Save graphics state
    pdf.saveGraphicsState();

    // Apply view transform
    const scaleX = view.position.x;
    const scaleY = view.position.y;

    // Draw view label
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(view.name, scaleX, scaleY - 5);

    // Draw edges
    for (const edge of view.edges) {
      this.drawEdge(pdf, edge, view, scaleX, scaleY);
    }

    // Draw dimensions
    if (view.showDimensions) {
      for (const dim of view.dimensions) {
        this.drawDimension(pdf, dim, view, scaleX, scaleY);
      }
    }

    // Draw annotations
    if (view.showAnnotations) {
      for (const annotation of view.annotations) {
        this.drawAnnotation(pdf, annotation, view, scaleX, scaleY);
      }
    }

    // Restore graphics state
    pdf.restoreGraphicsState();
  }

  /**
   * Draw an edge
   */
  private static drawEdge(pdf: jsPDF, edge: DrawingEdge, view: any, offsetX: number, offsetY: number): void {
    if (edge.points.length < 2) return;

    // Set line style based on edge type
    switch (edge.type) {
      case 'visible':
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.3);
        break;
      case 'hidden':
        pdf.setDrawColor(150, 150, 150);
        pdf.setLineWidth(0.2);
        break;
      case 'centerline':
        pdf.setDrawColor(0, 0, 255);
        pdf.setLineWidth(0.2);
        break;
      case 'section':
        pdf.setDrawColor(255, 0, 0);
        pdf.setLineWidth(0.5);
        break;
      case 'phantom':
        pdf.setDrawColor(150, 0, 150);
        pdf.setLineWidth(0.2);
        break;
    }

    // Draw polyline
    const p1 = edge.points[0];
    pdf.line(
      offsetX + p1.x * view.scale,
      offsetY + p1.y * view.scale,
      offsetX + edge.points[1].x * view.scale,
      offsetY + edge.points[1].y * view.scale
    );

    for (let i = 1; i < edge.points.length - 1; i++) {
      const p = edge.points[i];
      const pNext = edge.points[i + 1];
      pdf.line(
        offsetX + p.x * view.scale,
        offsetY + p.y * view.scale,
        offsetX + pNext.x * view.scale,
        offsetY + pNext.y * view.scale
      );
    }
  }

  /**
   * Draw a dimension
   */
  private static drawDimension(pdf: jsPDF, dim: Dimension, view: any, offsetX: number, offsetY: number): void {
    // Apply dimension style
    const style = dim.style || {
      color: '#0066cc',
      textSize: 3,
      lineWeight: 0.2,
      arrowSize: 2,
      arrowStyle: 'filled',
      font: 'helvetica'
    };

    // Parse color (hex to RGB)
    const color = this.hexToRgb(style.color);
    pdf.setDrawColor(color.r, color.g, color.b);
    pdf.setTextColor(color.r, color.g, color.b);
    pdf.setLineWidth(style.lineWeight);
    pdf.setFontSize(style.textSize);
    pdf.setFont(style.font, 'normal');

    const start = dim.startPoint;
    const end = dim.endPoint;
    const dimPt = dim.dimensionPoint;

    // Handle different dimension types
    switch (dim.type) {
      case 'linear':
        this.drawLinearDimension(pdf, start, end, dimPt, dim.value, style, view, offsetX, offsetY);
        break;
      case 'angular':
        this.drawAngularDimension(pdf, start, end, dimPt, dim.value, style, view, offsetX, offsetY);
        break;
      case 'radial':
        this.drawRadialDimension(pdf, start, end, dim.value, style, view, offsetX, offsetY, false);
        break;
      case 'diameter':
        this.drawRadialDimension(pdf, start, end, dim.value, style, view, offsetX, offsetY, true);
        break;
      default:
        this.drawLinearDimension(pdf, start, end, dimPt, dim.value, style, view, offsetX, offsetY);
    }
  }

  /**
   * Draw linear dimension
   */
  private static drawLinearDimension(
    pdf: jsPDF,
    start: { x: number; y: number },
    end: { x: number; y: number },
    dimPt: { x: number; y: number },
    value: number,
    style: any,
    view: any,
    offsetX: number,
    offsetY: number
  ): void {
    const scale = view.scale;
    const x1 = offsetX + start.x * scale;
    const y1 = offsetY + start.y * scale;
    const x2 = offsetX + end.x * scale;
    const y2 = offsetY + end.y * scale;
    const xDim = offsetX + dimPt.x * scale;
    const yDim = offsetY + dimPt.y * scale;

    // Extension lines
    pdf.line(x1, y1, xDim, y1);
    pdf.line(x2, y2, xDim, y2);

    // Dimension line
    pdf.line(xDim, y1, xDim, y2);

    // Arrows
    const arrowSize = style.arrowSize;
    this.drawArrow(pdf, xDim, y1, 'down', arrowSize, style.arrowStyle);
    this.drawArrow(pdf, xDim, y2, 'up', arrowSize, style.arrowStyle);

    // Dimension text
    const text = value.toFixed(2);
    const textY = (y1 + y2) / 2;
    pdf.text(text, xDim + 2, textY);
  }

  /**
   * Draw angular dimension
   */
  private static drawAngularDimension(
    pdf: jsPDF,
    center: { x: number; y: number },
    start: { x: number; y: number },
    end: { x: number; y: number },
    angle: number,
    style: any,
    view: any,
    offsetX: number,
    offsetY: number
  ): void {
    const scale = view.scale;
    const cx = offsetX + center.x * scale;
    const cy = offsetY + center.y * scale;
    const x1 = offsetX + start.x * scale;
    const y1 = offsetY + start.y * scale;
    const x2 = offsetX + end.x * scale;
    const y2 = offsetY + end.y * scale;

    // Radii lines
    pdf.line(cx, cy, x1, y1);
    pdf.line(cx, cy, x2, y2);

    // Arc (approximate with line segments)
    const radius = Math.sqrt((x1 - cx) ** 2 + (y1 - cy) ** 2);
    const angle1 = Math.atan2(y1 - cy, x1 - cx);
    const angle2 = Math.atan2(y2 - cy, x2 - cx);
    const segments = 20;
    for (let i = 0; i < segments; i++) {
      const a1 = angle1 + (angle2 - angle1) * (i / segments);
      const a2 = angle1 + (angle2 - angle1) * ((i + 1) / segments);
      pdf.line(
        cx + radius * Math.cos(a1),
        cy + radius * Math.sin(a1),
        cx + radius * Math.cos(a2),
        cy + radius * Math.sin(a2)
      );
    }

    // Dimension text
    const midAngle = (angle1 + angle2) / 2;
    const textX = cx + (radius + 5) * Math.cos(midAngle);
    const textY = cy + (radius + 5) * Math.sin(midAngle);
    pdf.text(`${angle.toFixed(1)}°`, textX, textY);
  }

  /**
   * Draw radial/diameter dimension
   */
  private static drawRadialDimension(
    pdf: jsPDF,
    center: { x: number; y: number },
    edge: { x: number; y: number },
    value: number,
    style: any,
    view: any,
    offsetX: number,
    offsetY: number,
    isDiameter: boolean
  ): void {
    const scale = view.scale;
    const cx = offsetX + center.x * scale;
    const cy = offsetY + center.y * scale;
    const ex = offsetX + edge.x * scale;
    const ey = offsetY + edge.y * scale;

    // Leader line
    pdf.line(cx, cy, ex, ey);

    // Arrow
    const angle = Math.atan2(ey - cy, ex - cx);
    this.drawArrow(pdf, ex, ey, angle, style.arrowSize, style.arrowStyle);

    // Dimension text
    const prefix = isDiameter ? 'Ø' : 'R';
    const text = `${prefix}${value.toFixed(2)}`;
    pdf.text(text, ex + 2, ey);
  }

  /**
   * Draw arrow
   */
  private static drawArrow(pdf: jsPDF, x: number, y: number, direction: number | string, size: number, style: string): void {
    let angle: number;
    if (typeof direction === 'string') {
      switch (direction) {
        case 'up': angle = -Math.PI / 2; break;
        case 'down': angle = Math.PI / 2; break;
        case 'left': angle = Math.PI; break;
        case 'right': angle = 0; break;
        default: angle = 0;
      }
    } else {
      angle = direction;
    }

    const ax1 = x + size * Math.cos(angle + Math.PI - Math.PI / 6);
    const ay1 = y + size * Math.sin(angle + Math.PI - Math.PI / 6);
    const ax2 = x + size * Math.cos(angle + Math.PI + Math.PI / 6);
    const ay2 = y + size * Math.sin(angle + Math.PI + Math.PI / 6);

    if (style === 'filled' || style === 'closed') {
      // Filled triangle
      pdf.triangle(x, y, ax1, ay1, ax2, ay2, 'F');
    } else if (style === 'open') {
      // Open arrow
      pdf.line(x, y, ax1, ay1);
      pdf.line(x, y, ax2, ay2);
    } else {
      // Default: closed arrow
      pdf.line(x, y, ax1, ay1);
      pdf.line(ax1, ay1, ax2, ay2);
      pdf.line(ax2, ay2, x, y);
    }
  }

  /**
   * Convert hex color to RGB
   */
  private static hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 102, b: 204 }; // Default blue
  }

  /**
   * Draw an annotation
   */
  private static drawAnnotation(pdf: jsPDF, annotation: DrawingAnnotation, view: any, offsetX: number, offsetY: number): void {
    // Apply annotation style
    const style = annotation.style || {
      color: '#000000',
      textSize: 3,
      lineWeight: 0.2,
      font: 'helvetica'
    };

    const color = this.hexToRgb(style.color);
    pdf.setTextColor(color.r, color.g, color.b);
    pdf.setDrawColor(color.r, color.g, color.b);
    pdf.setFontSize(style.textSize);
    pdf.setFont(style.font, 'normal');
    pdf.setLineWidth(style.lineWeight);

    const x = offsetX + annotation.position.x * view.scale;
    const y = offsetY + annotation.position.y * view.scale;

    switch (annotation.type) {
      case 'text':
      case 'note':
        pdf.text(annotation.text || '', x, y);
        break;
      case 'leader':
        // Draw leader line with arrow
        if (annotation.leaderPoints && annotation.leaderPoints.length >= 2) {
          for (let i = 0; i < annotation.leaderPoints.length - 1; i++) {
            const p1 = annotation.leaderPoints[i];
            const p2 = annotation.leaderPoints[i + 1];
            const x1 = offsetX + p1.x * view.scale;
            const y1 = offsetY + p1.y * view.scale;
            const x2 = offsetX + p2.x * view.scale;
            const y2 = offsetY + p2.y * view.scale;
            pdf.line(x1, y1, x2, y2);
            
            // Arrow at first segment end
            if (i === 0) {
              const angle = Math.atan2(y2 - y1, x2 - x1);
              this.drawArrow(pdf, x2, y2, angle, 2, 'filled');
            }
          }
        }
        // Text at end of leader
        pdf.text(annotation.text || '', x + 2, y);
        break;
      case 'balloon':
        // Draw circle
        pdf.setLineWidth(0.3);
        pdf.circle(x, y, 3);
        // Center text
        pdf.setFontSize(style.textSize * 0.8);
        const textWidth = pdf.getTextWidth(annotation.text || '');
        pdf.text(annotation.text || '', x - textWidth / 2, y + 1);
        break;
      case 'gdt':
        // Draw GD&T feature control frame
        this.drawGDTFrame(pdf, annotation, x, y, style);
        break;
      case 'surface-finish':
        // Draw surface finish symbol
        this.drawSurfaceFinish(pdf, annotation, x, y, style);
        break;
      case 'welding':
        // Draw welding symbol
        this.drawWeldingSymbol(pdf, annotation, x, y, style);
        break;
    }
  }

  /**
   * Draw GD&T feature control frame
   */
  private static drawGDTFrame(pdf: jsPDF, annotation: DrawingAnnotation, x: number, y: number, style: any): void {
    const frameHeight = 6;
    const symbolWidth = 8;
    const textPadding = 2;
    
    // Parse GD&T content (e.g., "⊕|Ø0.05|A|B|C")
    const parts = (annotation.text || '').split('|');
    const totalWidth = parts.length * (symbolWidth + textPadding);

    // Frame border
    pdf.setLineWidth(0.3);
    pdf.rect(x, y - frameHeight / 2, totalWidth, frameHeight);

    // Draw compartments
    let currentX = x;
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) {
        pdf.line(currentX, y - frameHeight / 2, currentX, y + frameHeight / 2);
      }
      
      // Draw text/symbol
      pdf.setFontSize(style.textSize * 0.9);
      const text = parts[i].trim();
      const textWidth = pdf.getTextWidth(text);
      pdf.text(text, currentX + (symbolWidth - textWidth) / 2, y + 1);
      
      currentX += symbolWidth + textPadding;
    }
  }

  /**
   * Draw surface finish symbol
   */
  private static drawSurfaceFinish(pdf: jsPDF, annotation: DrawingAnnotation, x: number, y: number, style: any): void {
    // Draw checkmark symbol for surface finish
    const size = 5;
    pdf.setLineWidth(0.3);
    pdf.line(x, y, x + size, y - size);
    pdf.line(x + size, y - size, x + size, y + size);
    
    // Roughness value
    if (annotation.text) {
      pdf.setFontSize(style.textSize * 0.8);
      pdf.text(annotation.text, x + size + 2, y);
    }
  }

  /**
   * Draw welding symbol
   */
  private static drawWeldingSymbol(pdf: jsPDF, annotation: DrawingAnnotation, x: number, y: number, style: any): void {
    // Reference line
    pdf.setLineWidth(0.3);
    pdf.line(x - 10, y, x + 10, y);
    
    // Arrow line
    const angle = -Math.PI / 4;
    const length = 8;
    const x2 = x - length * Math.cos(angle);
    const y2 = y - length * Math.sin(angle);
    pdf.line(x, y, x2, y2);
    this.drawArrow(pdf, x2, y2, angle + Math.PI, 2, 'filled');
    
    // Weld symbol text
    if (annotation.text) {
      pdf.setFontSize(style.textSize * 0.8);
      pdf.text(annotation.text, x + 2, y - 3);
    }
  }
}

/**
 * Export drawing sheet to DXF
 */
export class DXFExporter {
  /**
   * Export a drawing sheet to DXF
   */
  static exportToDXF(sheet: DrawingSheet): void {
    let dxf = '';

    // Header section
    dxf += this.generateHeader(sheet);

    // Tables section (layers)
    dxf += this.generateTables();

    // Entities section
    dxf += this.generateEntities(sheet);

    // End of file
    dxf += '0\nEOF\n';

    // Download DXF file
    this.downloadFile(dxf, `${sheet.name}.dxf`);
  }

  /**
   * Generate DXF header
   */
  private static generateHeader(sheet: DrawingSheet): string {
    let header = '';
    header += '0\nSECTION\n2\nHEADER\n';
    header += '9\n$ACADVER\n1\nAC1015\n'; // AutoCAD 2000 format
    header += '9\n$INSUNITS\n70\n4\n'; // Millimeters
    header += '9\n$MEASUREMENT\n70\n1\n'; // Metric
    header += '0\nENDSEC\n';
    return header;
  }

  /**
   * Generate DXF tables (layers)
   */
  private static generateTables(): string {
    let tables = '';
    tables += '0\nSECTION\n2\nTABLES\n';
    tables += '0\nTABLE\n2\nLAYER\n70\n5\n'; // 5 layers

    const layers = [
      { name: 'VISIBLE', color: 7, linetype: 'CONTINUOUS' },
      { name: 'HIDDEN', color: 8, linetype: 'DASHED' },
      { name: 'CENTERLINE', color: 5, linetype: 'CENTER' },
      { name: 'SECTION', color: 1, linetype: 'CONTINUOUS' },
      { name: 'DIMENSION', color: 5, linetype: 'CONTINUOUS' },
    ];

    for (const layer of layers) {
      tables += '0\nLAYER\n';
      tables += `2\n${layer.name}\n`;
      tables += '70\n0\n';
      tables += `62\n${layer.color}\n`;
      tables += `6\n${layer.linetype}\n`;
    }

    tables += '0\nENDTAB\n';
    tables += '0\nENDSEC\n';
    return tables;
  }

  /**
   * Generate DXF entities
   */
  private static generateEntities(sheet: DrawingSheet): string {
    let entities = '';
    entities += '0\nSECTION\n2\nENTITIES\n';

    // Draw sheet border
    entities += this.generateRectangle('0', 10, 10, sheet.width - 10, sheet.height - 10);

    // Draw all views
    for (const view of sheet.views) {
      entities += this.generateViewEntities(view, sheet);
    }

    // Title block
    entities += this.generateTitleBlock(sheet);

    entities += '0\nENDSEC\n';
    return entities;
  }

  /**
   * Generate entities for a view
   */
  private static generateViewEntities(view: any, sheet: DrawingSheet): string {
    let entities = '';

    const offsetX = view.position.x;
    const offsetY = view.position.y;

    // Draw edges
    for (const edge of view.edges) {
      const layerName = edge.type.toUpperCase();
      if (edge.points.length >= 2) {
        for (let i = 0; i < edge.points.length - 1; i++) {
          const p1 = edge.points[i];
          const p2 = edge.points[i + 1];

          entities += '0\nLINE\n';
          entities += `8\n${layerName}\n`; // Layer
          entities += `10\n${(offsetX + p1.x * view.scale).toFixed(4)}\n`; // Start X
          entities += `20\n${(offsetY + p1.y * view.scale).toFixed(4)}\n`; // Start Y
          entities += `30\n0.0\n`; // Start Z
          entities += `11\n${(offsetX + p2.x * view.scale).toFixed(4)}\n`; // End X
          entities += `21\n${(offsetY + p2.y * view.scale).toFixed(4)}\n`; // End Y
          entities += `31\n0.0\n`; // End Z
        }
      }
    }

    // Draw dimensions
    if (view.showDimensions) {
      for (const dim of view.dimensions) {
        entities += this.generateDimension(dim, view, offsetX, offsetY);
      }
    }

    // Draw annotations as text
    if (view.showAnnotations) {
      for (const annotation of view.annotations) {
        entities += this.generateAnnotation(annotation, view, offsetX, offsetY);
      }
    }

    return entities;
  }

  /**
   * Generate rectangle
   */
  private static generateRectangle(layer: string, x1: number, y1: number, x2: number, y2: number): string {
    let rect = '';
    rect += `0\nLINE\n8\n${layer}\n10\n${x1}\n20\n${y1}\n30\n0.0\n11\n${x2}\n21\n${y1}\n31\n0.0\n`;
    rect += `0\nLINE\n8\n${layer}\n10\n${x2}\n20\n${y1}\n30\n0.0\n11\n${x2}\n21\n${y2}\n31\n0.0\n`;
    rect += `0\nLINE\n8\n${layer}\n10\n${x2}\n20\n${y2}\n30\n0.0\n11\n${x1}\n21\n${y2}\n31\n0.0\n`;
    rect += `0\nLINE\n8\n${layer}\n10\n${x1}\n20\n${y2}\n30\n0.0\n11\n${x1}\n21\n${y1}\n31\n0.0\n`;
    return rect;
  }

  /**
   * Generate dimension entity
   */
  private static generateDimension(dim: Dimension, view: any, offsetX: number, offsetY: number): string {
    let entity = '';

    const start = dim.startPoint;
    const end = dim.endPoint;
    const dimPt = dim.dimensionPoint;
    const scale = view.scale;

    switch (dim.type) {
      case 'linear':
        // Aligned dimension
        entity += '0\nDIMENSION\n';
        entity += '8\nDIMENSION\n'; // Layer
        entity += '100\nAcDbEntity\n';
        entity += '100\nAcDbDimension\n';
        entity += '2\n*D1\n'; // Block name
        entity += `10\n${(offsetX + dimPt.x * scale).toFixed(4)}\n`; // Dimension line point X
        entity += `20\n${(offsetY + (start.y + end.y) / 2 * scale).toFixed(4)}\n`; // Dimension line point Y
        entity += '30\n0.0\n';
        entity += `13\n${(offsetX + start.x * scale).toFixed(4)}\n`; // Start point X
        entity += `23\n${(offsetY + start.y * scale).toFixed(4)}\n`; // Start point Y
        entity += '33\n0.0\n';
        entity += `14\n${(offsetX + end.x * scale).toFixed(4)}\n`; // End point X
        entity += `24\n${(offsetY + end.y * scale).toFixed(4)}\n`; // End point Y
        entity += '34\n0.0\n';
        entity += '100\nAcDbAlignedDimension\n';
        entity += `1\n${dim.value.toFixed(2)}\n`; // Dimension text
        break;

      case 'angular':
        // Angular dimension
        entity += '0\nDIMENSION\n';
        entity += '8\nDIMENSION\n';
        entity += '100\nAcDbEntity\n';
        entity += '100\nAcDbDimension\n';
        entity += '2\n*D2\n';
        entity += `10\n${(offsetX + start.x * scale).toFixed(4)}\n`;
        entity += `20\n${(offsetY + start.y * scale).toFixed(4)}\n`;
        entity += '30\n0.0\n';
        entity += '100\nAcDb3PointAngularDimension\n';
        entity += `13\n${(offsetX + start.x * scale).toFixed(4)}\n`;
        entity += `23\n${(offsetY + start.y * scale).toFixed(4)}\n`;
        entity += `14\n${(offsetX + end.x * scale).toFixed(4)}\n`;
        entity += `24\n${(offsetY + end.y * scale).toFixed(4)}\n`;
        entity += `15\n${(offsetX + dimPt.x * scale).toFixed(4)}\n`;
        entity += `25\n${(offsetY + dimPt.y * scale).toFixed(4)}\n`;
        entity += `1\n${dim.value.toFixed(1)}°\n`;
        break;

      case 'radial':
        // Radial dimension
        entity += '0\nDIMENSION\n';
        entity += '8\nDIMENSION\n';
        entity += '100\nAcDbEntity\n';
        entity += '100\nAcDbDimension\n';
        entity += '2\n*D3\n';
        entity += `10\n${(offsetX + start.x * scale).toFixed(4)}\n`;
        entity += `20\n${(offsetY + start.y * scale).toFixed(4)}\n`;
        entity += '30\n0.0\n';
        entity += '100\nAcDbRadialDimension\n';
        entity += `15\n${(offsetX + end.x * scale).toFixed(4)}\n`;
        entity += `25\n${(offsetY + end.y * scale).toFixed(4)}\n`;
        entity += '40\n0.0\n'; // Leader length
        entity += `1\nR${dim.value.toFixed(2)}\n`;
        break;

      case 'diameter':
        // Diameter dimension
        entity += '0\nDIMENSION\n';
        entity += '8\nDIMENSION\n';
        entity += '100\nAcDbEntity\n';
        entity += '100\nAcDbDimension\n';
        entity += '2\n*D4\n';
        entity += `10\n${(offsetX + start.x * scale).toFixed(4)}\n`;
        entity += `20\n${(offsetY + start.y * scale).toFixed(4)}\n`;
        entity += '30\n0.0\n';
        entity += '100\nAcDbDiametricDimension\n';
        entity += `15\n${(offsetX + end.x * scale).toFixed(4)}\n`;
        entity += `25\n${(offsetY + end.y * scale).toFixed(4)}\n`;
        entity += '40\n0.0\n';
        entity += `1\nØ${dim.value.toFixed(2)}\n`;
        break;

      default:
        // Fallback to simple text
        entity += '0\nTEXT\n';
        entity += '8\nDIMENSION\n';
        entity += `10\n${(offsetX + dimPt.x * scale).toFixed(4)}\n`;
        entity += `20\n${(offsetY + dimPt.y * scale).toFixed(4)}\n`;
        entity += '30\n0.0\n';
        entity += '40\n2.5\n';
        entity += `1\n${dim.value.toFixed(2)}\n`;
    }

    return entity;
  }

  /**
   * Generate annotation entity
   */
  private static generateAnnotation(annotation: DrawingAnnotation, view: any, offsetX: number, offsetY: number): string {
    let entity = '';
    const scale = view.scale;
    const x = offsetX + annotation.position.x * scale;
    const y = offsetY + annotation.position.y * scale;

    // Get text height from style
    const style = annotation.style || { textSize: 2.5 };
    const textHeight = style.textSize || 2.5;

    switch (annotation.type) {
      case 'text':
      case 'note':
        entity += '0\nTEXT\n';
        entity += '8\n0\n'; // Layer
        entity += `10\n${x.toFixed(4)}\n`;
        entity += `20\n${y.toFixed(4)}\n`;
        entity += '30\n0.0\n';
        entity += `40\n${textHeight}\n`;
        entity += `1\n${annotation.text || ''}\n`;
        break;

      case 'leader':
        // Leader with MTEXT
        if (annotation.leaderPoints && annotation.leaderPoints.length >= 2) {
          entity += '0\nLEADER\n';
          entity += '8\n0\n';
          entity += '100\nAcDbEntity\n';
          entity += '100\nAcDbLeader\n';
          entity += '3\nSTANDARD\n'; // Dimension style
          entity += '71\n1\n'; // Arrowhead flag
          entity += '72\n0\n'; // Leader type (straight line)
          entity += '73\n3\n'; // Leader creation flag
          entity += '74\n1\n'; // Hookline direction
          entity += '75\n0\n'; // Hookline flag
          entity += `40\n${textHeight}\n`; // Text height
          entity += `41\n${textHeight}\n`; // Text width
          entity += `76\n${annotation.leaderPoints.length}\n`; // Number of vertices

          // Vertices
          for (const pt of annotation.leaderPoints) {
            entity += `10\n${(offsetX + pt.x * scale).toFixed(4)}\n`;
            entity += `20\n${(offsetY + pt.y * scale).toFixed(4)}\n`;
            entity += '30\n0.0\n';
          }

          // Annotation offset
          entity += `10\n${x.toFixed(4)}\n`;
          entity += `20\n${y.toFixed(4)}\n`;
          entity += '30\n0.0\n';
          entity += '340\n0\n'; // Hard-pointer ID
        }
        
        // Add MTEXT for leader text
        entity += '0\nMTEXT\n';
        entity += '8\n0\n';
        entity += `10\n${x.toFixed(4)}\n`;
        entity += `20\n${y.toFixed(4)}\n`;
        entity += '30\n0.0\n';
        entity += `40\n${textHeight}\n`;
        entity += '71\n1\n'; // Attachment point (top left)
        entity += `1\n${annotation.text || ''}\n`;
        break;

      case 'balloon':
        // Circle with text (using CIRCLE + TEXT)
        entity += '0\nCIRCLE\n';
        entity += '8\n0\n';
        entity += `10\n${x.toFixed(4)}\n`;
        entity += `20\n${y.toFixed(4)}\n`;
        entity += '30\n0.0\n';
        entity += '40\n3.0\n'; // Radius
        
        // Centered text
        entity += '0\nTEXT\n';
        entity += '8\n0\n';
        entity += `10\n${x.toFixed(4)}\n`;
        entity += `20\n${(y - textHeight / 2).toFixed(4)}\n`;
        entity += '30\n0.0\n';
        entity += `40\n${textHeight * 0.8}\n`;
        entity += '72\n1\n'; // Horizontal justification (center)
        entity += '73\n2\n'; // Vertical justification (middle)
        entity += `11\n${x.toFixed(4)}\n`; // Alignment point
        entity += `21\n${y.toFixed(4)}\n`;
        entity += `1\n${annotation.text || ''}\n`;
        break;

      case 'gdt':
        // GD&T Feature Control Frame
        // Use MTEXT with special formatting
        entity += '0\nMTEXT\n';
        entity += '8\n0\n';
        entity += `10\n${x.toFixed(4)}\n`;
        entity += `20\n${y.toFixed(4)}\n`;
        entity += '30\n0.0\n';
        entity += `40\n${textHeight}\n`;
        entity += '71\n1\n';
        // Format: {\\fGDT|b0|i0|c0|p34;symboltext}
        entity += `1\n{\\fGDT|b0|i0|c0|p34;${annotation.text || ''}}\n`;
        
        // Add bounding box for frame
        const frameWidth = (annotation.text || '').length * textHeight * 1.2;
        const frameHeight = textHeight * 1.5;
        entity += '0\nLINE\n8\n0\n';
        entity += `10\n${x.toFixed(4)}\n20\n${y.toFixed(4)}\n30\n0.0\n`;
        entity += `11\n${(x + frameWidth).toFixed(4)}\n21\n${y.toFixed(4)}\n31\n0.0\n`;
        entity += '0\nLINE\n8\n0\n';
        entity += `10\n${(x + frameWidth).toFixed(4)}\n20\n${y.toFixed(4)}\n30\n0.0\n`;
        entity += `11\n${(x + frameWidth).toFixed(4)}\n21\n${(y + frameHeight).toFixed(4)}\n31\n0.0\n`;
        entity += '0\nLINE\n8\n0\n';
        entity += `10\n${(x + frameWidth).toFixed(4)}\n20\n${(y + frameHeight).toFixed(4)}\n30\n0.0\n`;
        entity += `11\n${x.toFixed(4)}\n21\n${(y + frameHeight).toFixed(4)}\n31\n0.0\n`;
        entity += '0\nLINE\n8\n0\n';
        entity += `10\n${x.toFixed(4)}\n20\n${(y + frameHeight).toFixed(4)}\n30\n0.0\n`;
        entity += `11\n${x.toFixed(4)}\n21\n${y.toFixed(4)}\n31\n0.0\n`;
        break;

      case 'surface-finish':
      case 'welding':
        // Surface finish and welding symbols as MTEXT with special formatting
        entity += '0\nMTEXT\n';
        entity += '8\n0\n';
        entity += `10\n${x.toFixed(4)}\n`;
        entity += `20\n${y.toFixed(4)}\n`;
        entity += '30\n0.0\n';
        entity += `40\n${textHeight}\n`;
        entity += '71\n1\n';
        entity += `1\n${annotation.text || ''}\n`;
        break;

      default:
        // Default to simple text
        entity += '0\nTEXT\n';
        entity += '8\n0\n';
        entity += `10\n${x.toFixed(4)}\n`;
        entity += `20\n${y.toFixed(4)}\n`;
        entity += '30\n0.0\n';
        entity += `40\n${textHeight}\n`;
        entity += `1\n${annotation.text || ''}\n`;
    }

    return entity;
  }

  /**
   * Generate title block
   */
  private static generateTitleBlock(sheet: DrawingSheet): string {
    let titleBlock = '';

    const x = sheet.width - 210;
    const y = sheet.height - 60;
    const w = 200;
    const h = 50;

    // Border
    titleBlock += this.generateRectangle('0', x, y, x + w, y + h);

    // Title text
    titleBlock += '0\nTEXT\n';
    titleBlock += '8\n0\n';
    titleBlock += `10\n${x + 5}\n`;
    titleBlock += `20\n${y + 10}\n`;
    titleBlock += '30\n0.0\n';
    titleBlock += '40\n5.0\n'; // Text height
    titleBlock += `1\n${sheet.titleBlock.title}\n`;

    return titleBlock;
  }

  /**
   * Download file
   */
  private static downloadFile(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
