import * as THREE from 'three';

/**
 * Dimension Annotation System for Blueprint CAD
 * 
 * Provides parametric dimension annotations that drive geometry through
 * the constraint solver. Dimensions are bidirectional - they can be set
 * by the user to drive geometry, or automatically update when geometry changes.
 */

export type DimensionType = 'linear' | 'radial' | 'angular';
export type LinearDimensionSubtype = 'horizontal' | 'vertical' | 'aligned' | 'parallel';
export type RadialDimensionSubtype = 'radius' | 'diameter';
export type DimensionStyle = 'standard' | 'minimal' | 'detailed';

export interface DimensionBase {
  id: string;
  type: DimensionType;
  entityIds: string[];
  value: number; // Current dimension value
  nominalValue?: number; // Target value (for driving dimensions)
  isDriving: boolean; // If true, dimension drives geometry; if false, it's reference only
  constraintId?: string; // Associated constraint ID in solver
  
  // Visual properties
  textPosition?: THREE.Vector2; // Override text position
  textOffset?: number; // Offset from dimension line (default: 5)
  precision?: number; // Decimal places (default: 2)
  units?: string; // Display units (default: 'mm')
  tolerance?: { upper: number; lower: number };
  
  // Style
  style?: DimensionStyle;
  color?: string;
  textSize?: number;
  arrowSize?: number;
  
  // Metadata
  label?: string; // Optional label like "Width" or "Height"
  locked?: boolean;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface LinearDimension extends DimensionBase {
  type: 'linear';
  subtype: LinearDimensionSubtype;
  startPoint: THREE.Vector2;
  endPoint: THREE.Vector2;
  extensionLineOffset?: number; // Distance from entity to dimension line (default: 10)
  dimensionLinePosition?: number; // Position along perpendicular axis
}

export interface RadialDimension extends DimensionBase {
  type: 'radial';
  subtype: RadialDimensionSubtype;
  center: THREE.Vector2;
  radiusPoint?: THREE.Vector2; // Point on circumference
  angle?: number; // Angle for dimension line placement (radians)
}

export interface AngularDimension extends DimensionBase {
  type: 'angular';
  vertex: THREE.Vector2; // Common vertex point
  startRay: THREE.Vector2; // Direction of first ray
  endRay: THREE.Vector2; // Direction of second ray
  arcRadius?: number; // Radius of dimension arc (default: auto)
  isReflex?: boolean; // If true, measures reflex angle (>180°)
}

export type Dimension = LinearDimension | RadialDimension | AngularDimension;

export interface DimensionAnnotationSystem {
  dimensions: Map<string, Dimension>;
  selectedDimensionId: string | null;
  editingDimensionId: string | null;
}

/**
 * Calculate dimension value from geometry
 */
export function calculateDimensionValue(dimension: Dimension): number {
  if (dimension.type === 'linear') {
    const dx = dimension.endPoint.x - dimension.startPoint.x;
    const dy = dimension.endPoint.y - dimension.startPoint.y;
    
    switch (dimension.subtype) {
      case 'horizontal':
        return Math.abs(dx);
      case 'vertical':
        return Math.abs(dy);
      case 'aligned':
      case 'parallel':
        return Math.sqrt(dx * dx + dy * dy);
      default:
        return 0;
    }
  } else if (dimension.type === 'radial') {
    if (dimension.radiusPoint) {
      const dx = dimension.radiusPoint.x - dimension.center.x;
      const dy = dimension.radiusPoint.y - dimension.center.y;
      const radius = Math.sqrt(dx * dx + dy * dy);
      return dimension.subtype === 'diameter' ? radius * 2 : radius;
    }
    return dimension.value;
  } else if (dimension.type === 'angular') {
    const angle1 = Math.atan2(dimension.startRay.y, dimension.startRay.x);
    const angle2 = Math.atan2(dimension.endRay.y, dimension.endRay.x);
    let diff = angle2 - angle1;
    
    // Normalize to [0, 2π]
    while (diff < 0) diff += Math.PI * 2;
    while (diff > Math.PI * 2) diff -= Math.PI * 2;
    
    // Handle reflex angle
    if (dimension.isReflex && diff < Math.PI) {
      diff = Math.PI * 2 - diff;
    } else if (!dimension.isReflex && diff > Math.PI) {
      diff = Math.PI * 2 - diff;
    }
    
    // Convert to degrees
    return (diff * 180) / Math.PI;
  }
  
  return 0;
}

/**
 * Calculate dimension line geometry for rendering
 */
export interface DimensionGeometry {
  dimensionLine: { start: THREE.Vector2; end: THREE.Vector2 };
  extensionLines?: Array<{ start: THREE.Vector2; end: THREE.Vector2 }>;
  arrowStart?: { position: THREE.Vector2; direction: THREE.Vector2 };
  arrowEnd?: { position: THREE.Vector2; direction: THREE.Vector2 };
  textPosition: THREE.Vector2;
  textRotation: number;
  arcPath?: THREE.Vector2[]; // For angular dimensions
}

export function calculateDimensionGeometry(dimension: Dimension): DimensionGeometry {
  if (dimension.type === 'linear') {
    return calculateLinearDimensionGeometry(dimension);
  } else if (dimension.type === 'radial') {
    return calculateRadialDimensionGeometry(dimension);
  } else if (dimension.type === 'angular') {
    return calculateAngularDimensionGeometry(dimension);
  }
  
  throw new Error(`Unknown dimension type: ${(dimension as any).type}`);
}

function calculateLinearDimensionGeometry(dimension: LinearDimension): DimensionGeometry {
  const offset = dimension.extensionLineOffset ?? 10;
  const dimLinePos = dimension.dimensionLinePosition ?? offset;
  
  const dx = dimension.endPoint.x - dimension.startPoint.x;
  const dy = dimension.endPoint.y - dimension.startPoint.y;
  
  let perpDir: THREE.Vector2;
  let dimStart: THREE.Vector2;
  let dimEnd: THREE.Vector2;
  let ext1Start: THREE.Vector2;
  let ext1End: THREE.Vector2;
  let ext2Start: THREE.Vector2;
  let ext2End: THREE.Vector2;
  
  if (dimension.subtype === 'horizontal') {
    perpDir = new THREE.Vector2(0, 1);
    dimStart = new THREE.Vector2(dimension.startPoint.x, dimension.startPoint.y + dimLinePos);
    dimEnd = new THREE.Vector2(dimension.endPoint.x, dimension.startPoint.y + dimLinePos);
    ext1Start = dimension.startPoint.clone();
    ext1End = new THREE.Vector2(dimension.startPoint.x, dimension.startPoint.y + dimLinePos + 2);
    ext2Start = new THREE.Vector2(dimension.endPoint.x, dimension.startPoint.y);
    ext2End = new THREE.Vector2(dimension.endPoint.x, dimension.startPoint.y + dimLinePos + 2);
  } else if (dimension.subtype === 'vertical') {
    perpDir = new THREE.Vector2(1, 0);
    dimStart = new THREE.Vector2(dimension.startPoint.x + dimLinePos, dimension.startPoint.y);
    dimEnd = new THREE.Vector2(dimension.startPoint.x + dimLinePos, dimension.endPoint.y);
    ext1Start = dimension.startPoint.clone();
    ext1End = new THREE.Vector2(dimension.startPoint.x + dimLinePos + 2, dimension.startPoint.y);
    ext2Start = new THREE.Vector2(dimension.startPoint.x, dimension.endPoint.y);
    ext2End = new THREE.Vector2(dimension.startPoint.x + dimLinePos + 2, dimension.endPoint.y);
  } else {
    // Aligned or parallel
    const length = Math.sqrt(dx * dx + dy * dy);
    const dirX = dx / length;
    const dirY = dy / length;
    perpDir = new THREE.Vector2(-dirY, dirX);
    
    dimStart = new THREE.Vector2(
      dimension.startPoint.x + perpDir.x * dimLinePos,
      dimension.startPoint.y + perpDir.y * dimLinePos
    );
    dimEnd = new THREE.Vector2(
      dimension.endPoint.x + perpDir.x * dimLinePos,
      dimension.endPoint.y + perpDir.y * dimLinePos
    );
    ext1Start = dimension.startPoint.clone();
    ext1End = new THREE.Vector2(
      dimension.startPoint.x + perpDir.x * (dimLinePos + 2),
      dimension.startPoint.y + perpDir.y * (dimLinePos + 2)
    );
    ext2Start = dimension.endPoint.clone();
    ext2End = new THREE.Vector2(
      dimension.endPoint.x + perpDir.x * (dimLinePos + 2),
      dimension.endPoint.y + perpDir.y * (dimLinePos + 2)
    );
  }
  
  const textOffset = dimension.textOffset ?? 5;
  const textPosition = dimension.textPosition ?? new THREE.Vector2(
    (dimStart.x + dimEnd.x) / 2 + perpDir.x * textOffset,
    (dimStart.y + dimEnd.y) / 2 + perpDir.y * textOffset
  );
  
  const textRotation = Math.atan2(dimEnd.y - dimStart.y, dimEnd.x - dimStart.x);
  
  const dimDir = new THREE.Vector2(dimEnd.x - dimStart.x, dimEnd.y - dimStart.y).normalize();
  
  return {
    dimensionLine: { start: dimStart, end: dimEnd },
    extensionLines: [
      { start: ext1Start, end: ext1End },
      { start: ext2Start, end: ext2End }
    ],
    arrowStart: { position: dimStart, direction: dimDir },
    arrowEnd: { position: dimEnd, direction: dimDir.clone().multiplyScalar(-1) },
    textPosition,
    textRotation
  };
}

function calculateRadialDimensionGeometry(dimension: RadialDimension): DimensionGeometry {
  const angle = dimension.angle ?? 0;
  const radiusPoint = dimension.radiusPoint ?? new THREE.Vector2(
    dimension.center.x + dimension.value * Math.cos(angle),
    dimension.center.y + dimension.value * Math.sin(angle)
  );
  
  const dx = radiusPoint.x - dimension.center.x;
  const dy = radiusPoint.y - dimension.center.y;
  const actualRadius = Math.sqrt(dx * dx + dy * dy);
  
  let dimStart: THREE.Vector2;
  let dimEnd: THREE.Vector2;
  
  if (dimension.subtype === 'diameter') {
    // Diameter line goes through center
    const oppositePoint = new THREE.Vector2(
      dimension.center.x - dx,
      dimension.center.y - dy
    );
    dimStart = oppositePoint;
    dimEnd = radiusPoint;
  } else {
    // Radius line from center
    dimStart = dimension.center.clone();
    dimEnd = radiusPoint;
  }
  
  const textOffset = dimension.textOffset ?? 5;
  const midX = (dimStart.x + dimEnd.x) / 2;
  const midY = (dimStart.y + dimEnd.y) / 2;
  const perpX = -(dimEnd.y - dimStart.y) / actualRadius;
  const perpY = (dimEnd.x - dimStart.x) / actualRadius;
  
  const textPosition = dimension.textPosition ?? new THREE.Vector2(
    midX + perpX * textOffset,
    midY + perpY * textOffset
  );
  
  const textRotation = Math.atan2(dimEnd.y - dimStart.y, dimEnd.x - dimStart.x);
  
  const dimDir = new THREE.Vector2(dimEnd.x - dimStart.x, dimEnd.y - dimStart.y).normalize();
  
  return {
    dimensionLine: { start: dimStart, end: dimEnd },
    arrowEnd: { position: dimEnd, direction: dimDir.clone().multiplyScalar(-1) },
    textPosition,
    textRotation
  };
}

function calculateAngularDimensionGeometry(dimension: AngularDimension): DimensionGeometry {
  const angle1 = Math.atan2(dimension.startRay.y, dimension.startRay.x);
  const angle2 = Math.atan2(dimension.endRay.y, dimension.endRay.x);
  
  let startAngle = angle1;
  let endAngle = angle2;
  
  // Normalize angles
  if (dimension.isReflex) {
    if (endAngle > startAngle) {
      startAngle += Math.PI * 2;
    }
  } else {
    if (endAngle < startAngle) {
      endAngle += Math.PI * 2;
    }
  }
  
  const radius = dimension.arcRadius ?? 20;
  
  // Generate arc points
  const arcPoints: THREE.Vector2[] = [];
  const segments = 32;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = startAngle + (endAngle - startAngle) * t;
    arcPoints.push(new THREE.Vector2(
      dimension.vertex.x + radius * Math.cos(angle),
      dimension.vertex.y + radius * Math.sin(angle)
    ));
  }
  
  const midAngle = (startAngle + endAngle) / 2;
  const textOffset = dimension.textOffset ?? 5;
  const textPosition = dimension.textPosition ?? new THREE.Vector2(
    dimension.vertex.x + (radius + textOffset) * Math.cos(midAngle),
    dimension.vertex.y + (radius + textOffset) * Math.sin(midAngle)
  );
  
  const startPoint = arcPoints[0];
  const endPoint = arcPoints[arcPoints.length - 1];
  
  const startDir = new THREE.Vector2(
    startPoint.x - dimension.vertex.x,
    startPoint.y - dimension.vertex.y
  ).normalize();
  const endDir = new THREE.Vector2(
    endPoint.x - dimension.vertex.x,
    endPoint.y - dimension.vertex.y
  ).normalize();
  
  return {
    dimensionLine: { start: startPoint, end: endPoint },
    arcPath: arcPoints,
    arrowStart: { position: startPoint, direction: new THREE.Vector2(-startDir.y, startDir.x) },
    arrowEnd: { position: endPoint, direction: new THREE.Vector2(endDir.y, -endDir.x) },
    textPosition,
    textRotation: 0
  };
}

/**
 * Format dimension value for display
 */
export function formatDimensionValue(dimension: Dimension): string {
  const value = dimension.value;
  const precision = dimension.precision ?? 2;
  const units = dimension.units ?? 'mm';
  
  let valueStr: string;
  
  if (dimension.type === 'angular') {
    valueStr = `${value.toFixed(precision)}°`;
  } else {
    valueStr = `${value.toFixed(precision)}${units}`;
  }
  
  // Add tolerance if present
  if (dimension.tolerance) {
    const upper = dimension.tolerance.upper.toFixed(precision);
    const lower = dimension.tolerance.lower.toFixed(precision);
    valueStr += ` +${upper}/-${lower}`;
  }
  
  // Add label if present
  if (dimension.label) {
    valueStr = `${dimension.label}: ${valueStr}`;
  }
  
  return valueStr;
}

/**
 * Create a new dimension
 */
export function createLinearDimension(
  entityIds: string[],
  startPoint: THREE.Vector2,
  endPoint: THREE.Vector2,
  subtype: LinearDimensionSubtype,
  isDriving: boolean = true
): LinearDimension {
  const dimension: LinearDimension = {
    id: `dim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'linear',
    subtype,
    entityIds,
    startPoint,
    endPoint,
    value: 0,
    isDriving,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1
  };
  
  dimension.value = calculateDimensionValue(dimension);
  if (isDriving) {
    dimension.nominalValue = dimension.value;
  }
  
  return dimension;
}

export function createRadialDimension(
  entityIds: string[],
  center: THREE.Vector2,
  radiusPoint: THREE.Vector2,
  subtype: RadialDimensionSubtype,
  isDriving: boolean = true
): RadialDimension {
  const dimension: RadialDimension = {
    id: `dim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'radial',
    subtype,
    entityIds,
    center,
    radiusPoint,
    value: 0,
    isDriving,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1
  };
  
  dimension.value = calculateDimensionValue(dimension);
  if (isDriving) {
    dimension.nominalValue = dimension.value;
  }
  
  return dimension;
}

export function createAngularDimension(
  entityIds: string[],
  vertex: THREE.Vector2,
  startRay: THREE.Vector2,
  endRay: THREE.Vector2,
  isDriving: boolean = true
): AngularDimension {
  const dimension: AngularDimension = {
    id: `dim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'angular',
    entityIds,
    vertex,
    startRay,
    endRay,
    value: 0,
    isDriving,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1
  };
  
  dimension.value = calculateDimensionValue(dimension);
  if (isDriving) {
    dimension.nominalValue = dimension.value;
  }
  
  return dimension;
}
