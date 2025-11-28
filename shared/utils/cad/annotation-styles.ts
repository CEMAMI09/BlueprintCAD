/**
 * Annotation and dimension styling system for engineering drawings
 */

export interface AnnotationStyle {
  id: string;
  name: string;
  
  // Text styling
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  textColor: string;
  
  // Line styling
  lineWidth: number;
  lineColor: string;
  arrowSize: number;
  arrowStyle: 'filled' | 'open' | 'dot' | 'slash' | 'none';
  
  // Dimension specific
  dimensionLineGap: number; // Gap for dimension text
  extensionLineOverhang: number;
  extensionLineOffset: number;
  decimalPlaces: number;
  showUnits: boolean;
  units: 'mm' | 'in' | 'cm' | 'm';
  
  // Tolerance
  toleranceFormat: 'symmetric' | 'deviation' | 'limits' | 'basic';
  upperTolerance?: number;
  lowerTolerance?: number;
  
  // Leader lines
  leaderStyle: 'straight' | 'spline' | 'stepped';
  leaderArrow: boolean;
}

export interface DimensionStyle extends AnnotationStyle {
  // Dimension-specific overrides
  dimLineColor?: string;
  extensionLineColor?: string;
  witnessLineColor?: string;
  textAboveLine: boolean;
  textAlignment: 'left' | 'center' | 'right';
}

/**
 * Standard annotation style presets
 */
export const STANDARD_ANNOTATION_STYLES: Record<string, AnnotationStyle> = {
  iso: {
    id: 'iso',
    name: 'ISO Standard',
    fontSize: 3.5,
    fontFamily: 'Arial',
    fontWeight: 'normal',
    textColor: '#000000',
    lineWidth: 0.35,
    lineColor: '#000000',
    arrowSize: 2.5,
    arrowStyle: 'filled',
    dimensionLineGap: 1,
    extensionLineOverhang: 2,
    extensionLineOffset: 1,
    decimalPlaces: 2,
    showUnits: false,
    units: 'mm',
    toleranceFormat: 'symmetric',
    leaderStyle: 'straight',
    leaderArrow: true
  },
  
  asme: {
    id: 'asme',
    name: 'ASME Y14.5',
    fontSize: 3,
    fontFamily: 'Arial',
    fontWeight: 'normal',
    textColor: '#000000',
    lineWidth: 0.3,
    lineColor: '#000000',
    arrowSize: 3,
    arrowStyle: 'filled',
    dimensionLineGap: 1,
    extensionLineOverhang: 1.5,
    extensionLineOffset: 1.5,
    decimalPlaces: 3,
    showUnits: true,
    units: 'in',
    toleranceFormat: 'deviation',
    leaderStyle: 'straight',
    leaderArrow: true
  },
  
  architectural: {
    id: 'architectural',
    name: 'Architectural',
    fontSize: 4,
    fontFamily: 'Arial',
    fontWeight: 'normal',
    textColor: '#000000',
    lineWidth: 0.5,
    lineColor: '#000000',
    arrowSize: 4,
    arrowStyle: 'slash',
    dimensionLineGap: 2,
    extensionLineOverhang: 3,
    extensionLineOffset: 2,
    decimalPlaces: 1,
    showUnits: true,
    units: 'in',
    toleranceFormat: 'symmetric',
    leaderStyle: 'straight',
    leaderArrow: false
  },
  
  mechanical: {
    id: 'mechanical',
    name: 'Mechanical Engineering',
    fontSize: 3.5,
    fontFamily: 'Arial',
    fontWeight: 'bold',
    textColor: '#000000',
    lineWidth: 0.35,
    lineColor: '#000000',
    arrowSize: 2.5,
    arrowStyle: 'filled',
    dimensionLineGap: 1,
    extensionLineOverhang: 2,
    extensionLineOffset: 1,
    decimalPlaces: 3,
    showUnits: true,
    units: 'mm',
    toleranceFormat: 'deviation',
    leaderStyle: 'straight',
    leaderArrow: true
  }
};

/**
 * Draw dimension with applied style
 */
export function drawStyledDimension(
  ctx: CanvasRenderingContext2D,
  startPoint: { x: number; y: number },
  endPoint: { x: number; y: number },
  dimensionPoint: { x: number; y: number },
  value: number,
  style: AnnotationStyle,
  scale: number,
  darkMode: boolean
) {
  ctx.save();

  // Apply colors
  const lineColor = darkMode ? '#ffffff' : style.lineColor;
  const textColor = darkMode ? '#ffffff' : style.textColor;

  ctx.strokeStyle = lineColor;
  ctx.fillStyle = textColor;
  ctx.lineWidth = style.lineWidth * scale;
  ctx.font = `${style.fontWeight} ${style.fontSize * scale}px ${style.fontFamily}`;

  // Calculate dimension line endpoints with extension line offset
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const unitX = dx / length;
  const unitY = dy / length;

  // Extension lines
  const offsetStart = {
    x: startPoint.x * scale + unitX * style.extensionLineOffset * scale,
    y: startPoint.y * scale + unitY * style.extensionLineOffset * scale
  };
  const offsetEnd = {
    x: endPoint.x * scale + unitX * style.extensionLineOffset * scale,
    y: endPoint.y * scale + unitY * style.extensionLineOffset * scale
  };

  // Draw extension lines
  ctx.beginPath();
  ctx.moveTo(startPoint.x * scale, startPoint.y * scale);
  ctx.lineTo(
    dimensionPoint.x * scale + unitX * style.extensionLineOverhang * scale,
    dimensionPoint.y * scale
  );
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(endPoint.x * scale, endPoint.y * scale);
  ctx.lineTo(
    dimensionPoint.x * scale + unitX * style.extensionLineOverhang * scale,
    dimensionPoint.y * scale
  );
  ctx.stroke();

  // Dimension line
  const dimY = dimensionPoint.y * scale;
  ctx.beginPath();
  ctx.moveTo(startPoint.x * scale, dimY);
  ctx.lineTo(endPoint.x * scale, dimY);
  ctx.stroke();

  // Draw arrows
  drawArrow(ctx, startPoint.x * scale, dimY, Math.PI, style, scale);
  drawArrow(ctx, endPoint.x * scale, dimY, 0, style, scale);

  // Dimension text
  const text = formatDimensionValue(value, style);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  const textX = (startPoint.x + endPoint.x) / 2 * scale;
  const textY = dimY - style.dimensionLineGap * scale;
  ctx.fillText(text, textX, textY);

  // Tolerance if specified
  if (style.toleranceFormat !== 'basic' && style.upperTolerance !== undefined) {
    ctx.font = `${style.fontWeight} ${style.fontSize * 0.7 * scale}px ${style.fontFamily}`;
    ctx.textAlign = 'left';
    
    if (style.toleranceFormat === 'symmetric') {
      ctx.fillText(`±${style.upperTolerance.toFixed(style.decimalPlaces)}`, textX + 15 * scale, textY);
    } else if (style.toleranceFormat === 'deviation') {
      ctx.fillText(`+${style.upperTolerance.toFixed(style.decimalPlaces)}`, textX + 15 * scale, textY - 2 * scale);
      ctx.fillText(`-${(style.lowerTolerance || 0).toFixed(style.decimalPlaces)}`, textX + 15 * scale, textY + 2 * scale);
    }
  }

  ctx.restore();
}

/**
 * Draw arrow based on style
 */
function drawArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  style: AnnotationStyle,
  scale: number
) {
  const size = style.arrowSize * scale;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  switch (style.arrowStyle) {
    case 'filled':
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-size, -size / 2);
      ctx.lineTo(-size, size / 2);
      ctx.closePath();
      ctx.fill();
      break;

    case 'open':
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-size, -size / 2);
      ctx.moveTo(0, 0);
      ctx.lineTo(-size, size / 2);
      ctx.stroke();
      break;

    case 'dot':
      ctx.beginPath();
      ctx.arc(0, 0, size / 3, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'slash':
      ctx.beginPath();
      ctx.moveTo(-size / 2, -size / 2);
      ctx.lineTo(size / 2, size / 2);
      ctx.stroke();
      break;

    case 'none':
      // No arrow
      break;
  }

  ctx.restore();
}

/**
 * Format dimension value according to style
 */
function formatDimensionValue(value: number, style: AnnotationStyle): string {
  let text = value.toFixed(style.decimalPlaces);

  if (style.showUnits) {
    text += style.units === 'in' ? '"' : style.units;
  }

  return text;
}

/**
 * Draw angular dimension with style
 */
export function drawAngularDimension(
  ctx: CanvasRenderingContext2D,
  centerPoint: { x: number; y: number },
  startAngle: number,
  endAngle: number,
  radius: number,
  value: number,
  style: AnnotationStyle,
  scale: number,
  darkMode: boolean
) {
  ctx.save();

  const lineColor = darkMode ? '#ffffff' : style.lineColor;
  const textColor = darkMode ? '#ffffff' : style.textColor;

  ctx.strokeStyle = lineColor;
  ctx.fillStyle = textColor;
  ctx.lineWidth = style.lineWidth * scale;
  ctx.font = `${style.fontWeight} ${style.fontSize * scale}px ${style.fontFamily}`;

  const cx = centerPoint.x * scale;
  const cy = centerPoint.y * scale;
  const r = radius * scale;

  // Arc
  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, endAngle);
  ctx.stroke();

  // Extension lines
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + r * Math.cos(startAngle), cy + r * Math.sin(startAngle));
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + r * Math.cos(endAngle), cy + r * Math.sin(endAngle));
  ctx.stroke();

  // Arrows
  drawArrow(ctx, cx + r * Math.cos(startAngle), cy + r * Math.sin(startAngle), startAngle + Math.PI / 2, style, scale);
  drawArrow(ctx, cx + r * Math.cos(endAngle), cy + r * Math.sin(endAngle), endAngle - Math.PI / 2, style, scale);

  // Text
  const midAngle = (startAngle + endAngle) / 2;
  const textX = cx + r * Math.cos(midAngle);
  const textY = cy + r * Math.sin(midAngle);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${value.toFixed(1)}°`, textX, textY);

  ctx.restore();
}

/**
 * Draw radial dimension with style
 */
export function drawRadialDimension(
  ctx: CanvasRenderingContext2D,
  centerPoint: { x: number; y: number },
  edgePoint: { x: number; y: number },
  radius: number,
  isDiameter: boolean,
  style: AnnotationStyle,
  scale: number,
  darkMode: boolean
) {
  ctx.save();

  const lineColor = darkMode ? '#ffffff' : style.lineColor;
  const textColor = darkMode ? '#ffffff' : style.textColor;

  ctx.strokeStyle = lineColor;
  ctx.fillStyle = textColor;
  ctx.lineWidth = style.lineWidth * scale;
  ctx.font = `${style.fontWeight} ${style.fontSize * scale}px ${style.fontFamily}`;

  // Leader line from center to edge
  ctx.beginPath();
  ctx.moveTo(centerPoint.x * scale, centerPoint.y * scale);
  ctx.lineTo(edgePoint.x * scale, edgePoint.y * scale);
  ctx.stroke();

  // Arrow at edge
  const angle = Math.atan2(
    edgePoint.y - centerPoint.y,
    edgePoint.x - centerPoint.x
  );
  drawArrow(ctx, edgePoint.x * scale, edgePoint.y * scale, angle, style, scale);

  // Text with symbol
  const symbol = isDiameter ? 'Ø' : 'R';
  const value = isDiameter ? radius * 2 : radius;
  const text = `${symbol}${formatDimensionValue(value, style)}`;

  const textX = (centerPoint.x + edgePoint.x) / 2 * scale;
  const textY = (centerPoint.y + edgePoint.y) / 2 * scale - style.fontSize * scale;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(text, textX, textY);

  ctx.restore();
}

/**
 * Style editor interface
 */
export interface StyleEditorState {
  activeStyle: AnnotationStyle;
  customStyles: AnnotationStyle[];
  previewDimension: {
    start: { x: number; y: number };
    end: { x: number; y: number };
    value: number;
  };
}

/**
 * Create a new custom style from base
 */
export function createCustomStyle(base: AnnotationStyle, name: string): AnnotationStyle {
  return {
    ...base,
    id: `custom_${Date.now()}`,
    name
  };
}

/**
 * Validate style values
 */
export function validateStyle(style: Partial<AnnotationStyle>): string[] {
  const errors: string[] = [];

  if (style.fontSize && (style.fontSize < 1 || style.fontSize > 20)) {
    errors.push('Font size must be between 1 and 20');
  }

  if (style.lineWidth && (style.lineWidth < 0.1 || style.lineWidth > 5)) {
    errors.push('Line width must be between 0.1 and 5');
  }

  if (style.arrowSize && (style.arrowSize < 1 || style.arrowSize > 10)) {
    errors.push('Arrow size must be between 1 and 10');
  }

  if (style.decimalPlaces && (style.decimalPlaces < 0 || style.decimalPlaces > 6)) {
    errors.push('Decimal places must be between 0 and 6');
  }

  return errors;
}
