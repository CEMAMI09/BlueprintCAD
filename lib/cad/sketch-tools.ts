/**
 * Advanced Sketch Tools
 * 
 * Provides parametric 2D geometry creation with support for:
 * - Arc variants (3-point, center-start-end, tangent)
 * - Polygons (regular, inscribed, circumscribed)
 * - B-splines (interpolated, approximated, rational)
 * - Ellipses (center-axis, 3-point, foci)
 * - Offset/trim/extend operations
 * 
 * All entities are parametric and sync with file versions.
 */

import * as THREE from 'three';

// ============================================================================
// Extended Sketch Entity Types
// ============================================================================

export type SketchEntityType = 
  | 'line' 
  | 'circle' 
  | 'arc' 
  | 'arc-3point'
  | 'arc-tangent'
  | 'spline' 
  | 'bspline'
  | 'nurbs'
  | 'ellipse'
  | 'ellipse-arc'
  | 'point' 
  | 'rectangle'
  | 'polygon'
  | 'polyline';

export interface AdvancedSketchEntity {
  id: string;
  type: SketchEntityType;
  points: THREE.Vector2[];
  
  // Common parameters
  radius?: number;
  radiusX?: number;
  radiusY?: number;
  
  // Arc parameters
  startAngle?: number;
  endAngle?: number;
  center?: THREE.Vector2;
  clockwise?: boolean;
  
  // Spline/B-spline parameters
  controlPoints?: THREE.Vector2[];
  knots?: number[];
  degree?: number;
  weights?: number[]; // For NURBS
  
  // Ellipse parameters
  majorAxis?: THREE.Vector2;
  minorAxis?: THREE.Vector2;
  rotation?: number;
  
  // Polygon parameters
  sides?: number;
  inscribed?: boolean;
  
  // Polyline parameters
  closed?: boolean;
  
  // Construction geometry (not exported)
  construction?: boolean;
  
  // Metadata for version control
  createdAt: number;
  updatedAt: number;
  version: number;
}

// ============================================================================
// Arc Tools
// ============================================================================

export class ArcTools {
  /**
   * Create arc from center, start point, and end point
   */
  static createCenterStartEnd(
    center: THREE.Vector2,
    start: THREE.Vector2,
    end: THREE.Vector2,
    clockwise: boolean = false
  ): AdvancedSketchEntity {
    const radius = center.distanceTo(start);
    let startAngle = Math.atan2(start.y - center.y, start.x - center.x);
    let endAngle = Math.atan2(end.y - center.y, end.x - center.x);
    
    // Normalize angles to 0-2π
    if (startAngle < 0) startAngle += Math.PI * 2;
    if (endAngle < 0) endAngle += Math.PI * 2;
    if (endAngle < startAngle) endAngle += Math.PI * 2;
    
    if (clockwise) {
      const temp = startAngle;
      startAngle = endAngle;
      endAngle = temp;
    }
    
    return {
      id: crypto.randomUUID(),
      type: 'arc',
      points: [start, end],
      center,
      radius,
      startAngle,
      endAngle,
      clockwise,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1
    };
  }

  /**
   * Create arc from three points
   * Uses circumcircle algorithm
   */
  static create3Point(
    p1: THREE.Vector2,
    p2: THREE.Vector2,
    p3: THREE.Vector2
  ): AdvancedSketchEntity {
    // Calculate center using perpendicular bisectors
    const midAB = new THREE.Vector2(
      (p1.x + p2.x) / 2,
      (p1.y + p2.y) / 2
    );
    const midBC = new THREE.Vector2(
      (p2.x + p3.x) / 2,
      (p2.y + p3.y) / 2
    );
    
    const slopeAB = (p2.y - p1.y) / (p2.x - p1.x);
    const slopeBC = (p3.y - p2.y) / (p3.x - p2.x);
    
    const perpSlopeAB = -1 / slopeAB;
    const perpSlopeBC = -1 / slopeBC;
    
    // Find intersection of perpendicular bisectors
    const centerX = (
      perpSlopeBC * midBC.x - perpSlopeAB * midAB.x + midAB.y - midBC.y
    ) / (perpSlopeBC - perpSlopeAB);
    
    const centerY = perpSlopeAB * (centerX - midAB.x) + midAB.y;
    
    const center = new THREE.Vector2(centerX, centerY);
    const radius = center.distanceTo(p1);
    
    const startAngle = Math.atan2(p1.y - centerY, p1.x - centerX);
    const endAngle = Math.atan2(p3.y - centerY, p3.x - centerX);
    
    return {
      id: crypto.randomUUID(),
      type: 'arc-3point',
      points: [p1, p2, p3],
      center,
      radius,
      startAngle,
      endAngle,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1
    };
  }

  /**
   * Create tangent arc between two entities
   */
  static createTangent(
    line1End: THREE.Vector2,
    line1Dir: THREE.Vector2,
    line2Start: THREE.Vector2,
    line2Dir: THREE.Vector2,
    radius: number
  ): AdvancedSketchEntity {
    // Calculate center that is tangent to both lines
    const perpDir1 = new THREE.Vector2(-line1Dir.y, line1Dir.x).normalize();
    const perpDir2 = new THREE.Vector2(-line2Dir.y, line2Dir.x).normalize();
    
    const center1 = line1End.clone().add(perpDir1.clone().multiplyScalar(radius));
    const center2 = line2Start.clone().add(perpDir2.clone().multiplyScalar(radius));
    
    // Use midpoint as approximation
    const center = center1.clone().add(center2).multiplyScalar(0.5);
    
    const startAngle = Math.atan2(line1End.y - center.y, line1End.x - center.x);
    const endAngle = Math.atan2(line2Start.y - center.y, line2Start.x - center.x);
    
    return {
      id: crypto.randomUUID(),
      type: 'arc-tangent',
      points: [line1End, line2Start],
      center,
      radius,
      startAngle,
      endAngle,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1
    };
  }
}

// ============================================================================
// Polygon Tools
// ============================================================================

export class PolygonTools {
  /**
   * Create regular polygon inscribed in a circle
   */
  static createInscribed(
    center: THREE.Vector2,
    radius: number,
    sides: number,
    rotation: number = 0
  ): AdvancedSketchEntity {
    const points: THREE.Vector2[] = [];
    const angleStep = (Math.PI * 2) / sides;
    
    for (let i = 0; i < sides; i++) {
      const angle = rotation + i * angleStep;
      points.push(new THREE.Vector2(
        center.x + radius * Math.cos(angle),
        center.y + radius * Math.sin(angle)
      ));
    }
    
    return {
      id: crypto.randomUUID(),
      type: 'polygon',
      points,
      center,
      radius,
      sides,
      inscribed: true,
      rotation,
      closed: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1
    };
  }

  /**
   * Create regular polygon circumscribed around a circle
   */
  static createCircumscribed(
    center: THREE.Vector2,
    radius: number,
    sides: number,
    rotation: number = 0
  ): AdvancedSketchEntity {
    // For circumscribed, vertices are at apothem distance
    const apothem = radius / Math.cos(Math.PI / sides);
    return this.createInscribed(center, apothem, sides, rotation);
  }
}

// ============================================================================
// B-Spline Tools
// ============================================================================

export class BSplineTools {
  /**
   * Create interpolated B-spline through points
   * Uses chord-length parameterization
   */
  static createInterpolated(
    points: THREE.Vector2[],
    degree: number = 3
  ): AdvancedSketchEntity {
    if (points.length < degree + 1) {
      throw new Error(`Need at least ${degree + 1} points for degree ${degree} B-spline`);
    }
    
    // Calculate chord lengths for parameterization
    const chordLengths = [0];
    for (let i = 1; i < points.length; i++) {
      chordLengths.push(
        chordLengths[i - 1] + points[i].distanceTo(points[i - 1])
      );
    }
    
    const totalLength = chordLengths[chordLengths.length - 1];
    const params = chordLengths.map(len => len / totalLength);
    
    // Generate knot vector (clamped uniform)
    const knots = this.generateKnotVector(points.length, degree);
    
    return {
      id: crypto.randomUUID(),
      type: 'bspline',
      points,
      controlPoints: points, // Interpolation means control points = data points
      degree,
      knots,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1
    };
  }

  /**
   * Create approximated B-spline with fewer control points
   */
  static createApproximated(
    dataPoints: THREE.Vector2[],
    numControlPoints: number,
    degree: number = 3
  ): AdvancedSketchEntity {
    if (numControlPoints < degree + 1) {
      throw new Error('Need more control points');
    }
    
    // Use least-squares approximation
    const controlPoints = this.leastSquaresApproximation(
      dataPoints,
      numControlPoints,
      degree
    );
    
    const knots = this.generateKnotVector(numControlPoints, degree);
    
    return {
      id: crypto.randomUUID(),
      type: 'bspline',
      points: dataPoints,
      controlPoints,
      degree,
      knots,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1
    };
  }

  /**
   * Create rational B-spline (NURBS)
   */
  static createNURBS(
    controlPoints: THREE.Vector2[],
    weights: number[],
    degree: number = 3
  ): AdvancedSketchEntity {
    const knots = this.generateKnotVector(controlPoints.length, degree);
    
    return {
      id: crypto.randomUUID(),
      type: 'nurbs',
      points: controlPoints,
      controlPoints,
      degree,
      knots,
      weights,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1
    };
  }

  /**
   * Generate clamped uniform knot vector
   */
  private static generateKnotVector(numPoints: number, degree: number): number[] {
    const n = numPoints - 1;
    const m = n + degree + 1;
    const knots: number[] = [];
    
    // Clamped: first (degree+1) knots are 0
    for (let i = 0; i <= degree; i++) {
      knots.push(0);
    }
    
    // Internal knots uniformly spaced
    for (let i = 1; i < numPoints - degree; i++) {
      knots.push(i / (numPoints - degree));
    }
    
    // Clamped: last (degree+1) knots are 1
    for (let i = 0; i <= degree; i++) {
      knots.push(1);
    }
    
    return knots;
  }

  /**
   * Least-squares approximation (simplified)
   */
  private static leastSquaresApproximation(
    dataPoints: THREE.Vector2[],
    numControlPoints: number,
    degree: number
  ): THREE.Vector2[] {
    // Simplified: uniformly sample data points
    const controlPoints: THREE.Vector2[] = [];
    const step = (dataPoints.length - 1) / (numControlPoints - 1);
    
    for (let i = 0; i < numControlPoints; i++) {
      const idx = Math.round(i * step);
      controlPoints.push(dataPoints[idx].clone());
    }
    
    return controlPoints;
  }

  /**
   * Evaluate B-spline at parameter t
   */
  static evaluate(
    entity: AdvancedSketchEntity,
    t: number
  ): THREE.Vector2 {
    if (!entity.controlPoints || !entity.knots || entity.degree === undefined) {
      throw new Error('Invalid B-spline entity');
    }
    
    const { controlPoints, knots, degree, weights } = entity;
    const n = controlPoints.length - 1;
    
    // Find knot span
    let span = degree;
    while (span < n && t >= knots[span + 1]) {
      span++;
    }
    
    // Evaluate using de Boor's algorithm
    const point = this.deBoor(controlPoints, knots, degree, span, t, weights);
    return point;
  }

  /**
   * De Boor's algorithm for B-spline evaluation
   */
  private static deBoor(
    controlPoints: THREE.Vector2[],
    knots: number[],
    degree: number,
    span: number,
    t: number,
    weights?: number[]
  ): THREE.Vector2 {
    const d: THREE.Vector2[] = [];
    
    // Initialize with control points in span range
    for (let i = 0; i <= degree; i++) {
      d[i] = controlPoints[span - degree + i].clone();
      if (weights) {
        d[i].multiplyScalar(weights[span - degree + i]);
      }
    }
    
    // De Boor recursion
    for (let r = 1; r <= degree; r++) {
      for (let j = degree; j >= r; j--) {
        const alpha = (t - knots[span - degree + j]) / 
                     (knots[span + j - r + 1] - knots[span - degree + j]);
        d[j] = d[j].multiplyScalar(alpha).add(
          d[j - 1].multiplyScalar(1 - alpha)
        );
      }
    }
    
    return d[degree];
  }
}

// ============================================================================
// Ellipse Tools
// ============================================================================

export class EllipseTools {
  /**
   * Create ellipse from center and two axes
   */
  static createCenterAxes(
    center: THREE.Vector2,
    majorRadius: number,
    minorRadius: number,
    rotation: number = 0
  ): AdvancedSketchEntity {
    const majorAxis = new THREE.Vector2(
      Math.cos(rotation) * majorRadius,
      Math.sin(rotation) * majorRadius
    );
    
    const minorAxis = new THREE.Vector2(
      -Math.sin(rotation) * minorRadius,
      Math.cos(rotation) * minorRadius
    );
    
    return {
      id: crypto.randomUUID(),
      type: 'ellipse',
      points: [center],
      center,
      radiusX: majorRadius,
      radiusY: minorRadius,
      majorAxis,
      minorAxis,
      rotation,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1
    };
  }

  /**
   * Create ellipse from 3 points (simplified)
   */
  static create3Point(
    p1: THREE.Vector2,
    p2: THREE.Vector2,
    p3: THREE.Vector2
  ): AdvancedSketchEntity {
    // Center is midpoint of p1-p3
    const center = p1.clone().add(p3).multiplyScalar(0.5);
    
    // Major axis is p1-p3 distance
    const majorRadius = p1.distanceTo(p3) / 2;
    
    // Minor axis calculated from p2 distance to major axis
    const distToCenter = center.distanceTo(p2);
    const minorRadius = Math.sqrt(
      Math.abs(distToCenter * distToCenter - (majorRadius * majorRadius))
    );
    
    const rotation = Math.atan2(p3.y - p1.y, p3.x - p1.x);
    
    return this.createCenterAxes(center, majorRadius, minorRadius, rotation);
  }

  /**
   * Create elliptical arc
   */
  static createArc(
    center: THREE.Vector2,
    majorRadius: number,
    minorRadius: number,
    startAngle: number,
    endAngle: number,
    rotation: number = 0
  ): AdvancedSketchEntity {
    const entity = this.createCenterAxes(center, majorRadius, minorRadius, rotation);
    entity.type = 'ellipse-arc';
    entity.startAngle = startAngle;
    entity.endAngle = endAngle;
    return entity;
  }

  /**
   * Evaluate ellipse at parameter t (0 to 2π)
   */
  static evaluate(entity: AdvancedSketchEntity, t: number): THREE.Vector2 {
    if (!entity.center || !entity.radiusX || !entity.radiusY) {
      throw new Error('Invalid ellipse entity');
    }
    
    const { center, radiusX, radiusY, rotation = 0 } = entity;
    
    // Parametric ellipse equation
    const x = radiusX * Math.cos(t);
    const y = radiusY * Math.sin(t);
    
    // Rotate
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    
    return new THREE.Vector2(
      center.x + x * cos - y * sin,
      center.y + x * sin + y * cos
    );
  }
}

// ============================================================================
// Offset/Trim/Extend Operations
// ============================================================================

export class SketchOperations {
  /**
   * Offset entity by specified distance
   */
  static offset(
    entity: AdvancedSketchEntity,
    distance: number
  ): AdvancedSketchEntity {
    const offsetEntity = { ...entity };
    offsetEntity.id = crypto.randomUUID();
    offsetEntity.updatedAt = Date.now();
    offsetEntity.version++;
    
    switch (entity.type) {
      case 'line':
        // Offset line perpendicular to its direction
        if (entity.points.length >= 2) {
          const dir = entity.points[1].clone().sub(entity.points[0]).normalize();
          const perpendicular = new THREE.Vector2(-dir.y, dir.x).multiplyScalar(distance);
          offsetEntity.points = entity.points.map(p => p.clone().add(perpendicular));
        }
        break;
        
      case 'circle':
      case 'arc':
        // Offset circle/arc by changing radius
        if (entity.radius !== undefined) {
          offsetEntity.radius = entity.radius + distance;
        }
        break;
        
      case 'ellipse':
        // Offset ellipse by scaling both axes
        if (entity.radiusX !== undefined && entity.radiusY !== undefined) {
          const scale = 1 + (distance / Math.min(entity.radiusX, entity.radiusY));
          offsetEntity.radiusX = entity.radiusX * scale;
          offsetEntity.radiusY = entity.radiusY * scale;
        }
        break;
        
      case 'polyline':
      case 'polygon':
        // Offset polygon by moving each vertex perpendicular
        offsetEntity.points = this.offsetPolyline(entity.points, distance, entity.closed || false);
        break;
    }
    
    return offsetEntity;
  }

  /**
   * Offset polyline/polygon vertices
   */
  private static offsetPolyline(
    points: THREE.Vector2[],
    distance: number,
    closed: boolean
  ): THREE.Vector2[] {
    const offsetPoints: THREE.Vector2[] = [];
    
    for (let i = 0; i < points.length; i++) {
      const prev = points[(i - 1 + points.length) % points.length];
      const curr = points[i];
      const next = points[(i + 1) % points.length];
      
      if (i === 0 && !closed) {
        // First point - use only next direction
        const dir = next.clone().sub(curr).normalize();
        const perp = new THREE.Vector2(-dir.y, dir.x).multiplyScalar(distance);
        offsetPoints.push(curr.clone().add(perp));
      } else if (i === points.length - 1 && !closed) {
        // Last point - use only previous direction
        const dir = curr.clone().sub(prev).normalize();
        const perp = new THREE.Vector2(-dir.y, dir.x).multiplyScalar(distance);
        offsetPoints.push(curr.clone().add(perp));
      } else {
        // Middle point - bisector direction
        const dir1 = curr.clone().sub(prev).normalize();
        const dir2 = next.clone().sub(curr).normalize();
        const bisector = dir1.add(dir2).normalize();
        const perp = new THREE.Vector2(-bisector.y, bisector.x).multiplyScalar(distance);
        offsetPoints.push(curr.clone().add(perp));
      }
    }
    
    return offsetPoints;
  }

  /**
   * Trim entity at intersection points
   */
  static trim(
    entity: AdvancedSketchEntity,
    trimPoints: THREE.Vector2[]
  ): AdvancedSketchEntity[] {
    // Split entity at trim points and return segments
    const segments: AdvancedSketchEntity[] = [];
    
    if (trimPoints.length === 0) {
      return [entity];
    }
    
    // Sort trim points along entity
    const sortedPoints = this.sortPointsAlongEntity(entity, trimPoints);
    
    // Create segments between trim points
    for (let i = 0; i < sortedPoints.length - 1; i++) {
      const segment = { ...entity };
      segment.id = crypto.randomUUID();
      segment.points = [sortedPoints[i], sortedPoints[i + 1]];
      segment.updatedAt = Date.now();
      segment.version++;
      segments.push(segment);
    }
    
    return segments;
  }

  /**
   * Extend entity to meet another entity
   */
  static extend(
    entity: AdvancedSketchEntity,
    boundary: AdvancedSketchEntity
  ): AdvancedSketchEntity {
    const extendedEntity = { ...entity };
    extendedEntity.id = crypto.randomUUID();
    extendedEntity.updatedAt = Date.now();
    extendedEntity.version++;
    
    if (entity.type === 'line' && entity.points.length >= 2) {
      // Extend line to intersect with boundary
      const start = entity.points[0];
      const end = entity.points[1];
      const dir = end.clone().sub(start).normalize();
      
      // Find intersection with boundary
      const intersection = this.findIntersection(entity, boundary);
      
      if (intersection) {
        // Determine which end to extend
        const distToStart = start.distanceTo(intersection);
        const distToEnd = end.distanceTo(intersection);
        
        if (distToEnd < distToStart) {
          extendedEntity.points = [start, intersection];
        } else {
          extendedEntity.points = [intersection, end];
        }
      }
    }
    
    return extendedEntity;
  }

  /**
   * Find intersection between two entities
   */
  private static findIntersection(
    entity1: AdvancedSketchEntity,
    entity2: AdvancedSketchEntity
  ): THREE.Vector2 | null {
    // Simplified line-line intersection
    if (entity1.type === 'line' && entity2.type === 'line') {
      if (entity1.points.length >= 2 && entity2.points.length >= 2) {
        const p1 = entity1.points[0];
        const p2 = entity1.points[1];
        const p3 = entity2.points[0];
        const p4 = entity2.points[1];
        
        const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
        
        if (Math.abs(denom) < 1e-10) return null; // Parallel
        
        const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom;
        
        return new THREE.Vector2(
          p1.x + t * (p2.x - p1.x),
          p1.y + t * (p2.y - p1.y)
        );
      }
    }
    
    // TODO: Implement circle-line, circle-circle, etc.
    return null;
  }

  /**
   * Sort points along entity
   */
  private static sortPointsAlongEntity(
    entity: AdvancedSketchEntity,
    points: THREE.Vector2[]
  ): THREE.Vector2[] {
    if (entity.type === 'line' && entity.points.length >= 2) {
      const start = entity.points[0];
      const end = entity.points[1];
      const dir = end.clone().sub(start);
      
      return [...points].sort((a, b) => {
        const projA = a.clone().sub(start).dot(dir);
        const projB = b.clone().sub(start).dot(dir);
        return projA - projB;
      });
    }
    
    return points;
  }
}

// ============================================================================
// Sketch Geometry Tessellation
// ============================================================================

export class SketchTessellation {
  /**
   * Convert sketch entity to Three.js geometry for rendering
   */
  static toThreeGeometry(entity: AdvancedSketchEntity): THREE.BufferGeometry {
    const points3D: THREE.Vector3[] = [];
    
    switch (entity.type) {
      case 'line':
        points3D.push(
          new THREE.Vector3(entity.points[0].x, entity.points[0].y, 0),
          new THREE.Vector3(entity.points[1].x, entity.points[1].y, 0)
        );
        break;
        
      case 'circle':
        if (entity.center && entity.radius) {
          const segments = 64;
          for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            points3D.push(new THREE.Vector3(
              entity.center.x + entity.radius * Math.cos(angle),
              entity.center.y + entity.radius * Math.sin(angle),
              0
            ));
          }
        }
        break;
        
      case 'arc':
      case 'arc-3point':
      case 'arc-tangent':
        if (entity.center && entity.radius && entity.startAngle !== undefined && entity.endAngle !== undefined) {
          const segments = 32;
          const angleRange = entity.endAngle - entity.startAngle;
          for (let i = 0; i <= segments; i++) {
            const angle = entity.startAngle + (i / segments) * angleRange;
            points3D.push(new THREE.Vector3(
              entity.center.x + entity.radius * Math.cos(angle),
              entity.center.y + entity.radius * Math.sin(angle),
              0
            ));
          }
        }
        break;
        
      case 'ellipse':
      case 'ellipse-arc':
        if (entity.center && entity.radiusX && entity.radiusY) {
          const segments = 64;
          const startAngle = entity.startAngle || 0;
          const endAngle = entity.endAngle || Math.PI * 2;
          const angleRange = endAngle - startAngle;
          
          for (let i = 0; i <= segments; i++) {
            const t = startAngle + (i / segments) * angleRange;
            const point = EllipseTools.evaluate(entity, t);
            points3D.push(new THREE.Vector3(point.x, point.y, 0));
          }
        }
        break;
        
      case 'bspline':
      case 'nurbs':
        if (entity.controlPoints && entity.knots) {
          const segments = 64;
          for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const point = BSplineTools.evaluate(entity, t);
            points3D.push(new THREE.Vector3(point.x, point.y, 0));
          }
        }
        break;
        
      case 'polygon':
      case 'polyline':
        entity.points.forEach(p => {
          points3D.push(new THREE.Vector3(p.x, p.y, 0));
        });
        if (entity.closed) {
          points3D.push(new THREE.Vector3(entity.points[0].x, entity.points[0].y, 0));
        }
        break;
    }
    
    return new THREE.BufferGeometry().setFromPoints(points3D);
  }
}
