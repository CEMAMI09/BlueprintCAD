/**
 * BREP Boolean Operations
 * 
 * This module implements CSG (Constructive Solid Geometry) boolean operations
 * using BREP topology instead of mesh-based approaches.
 * 
 * Supports: Union (A ∪ B), Subtract (A - B), Intersect (A ∩ B)
 */

import * as THREE from 'three';
import {
  Vertex,
  Edge,
  Face,
  Shell,
  Solid,
  NURBSCurve,
  NURBSSurface,
  Loop,
  HalfEdge
} from './topology';
import { validateManifold, orientFaces } from './operations';

// ============================================================================
// Intersection Detection
// ============================================================================

export interface IntersectionPoint {
  position: THREE.Vector3;
  t1: number; // Parameter on first curve/edge
  t2?: number; // Parameter on second curve/edge (if applicable)
  edge1?: Edge;
  edge2?: Edge;
  face?: Face;
}

export interface EdgeFaceIntersection {
  point: THREE.Vector3;
  t: number; // Parameter along edge (0 to 1)
  u: number; // Parameter on face surface (U direction)
  v: number; // Parameter on face surface (V direction)
  edge: Edge;
  face: Face;
  isEntry: boolean; // True if edge enters face, false if exits
}

/**
 * Detect intersection between an edge and a face
 * Uses ray-triangle intersection for initial detection, then refines
 * 
 * @param edge - Edge to test
 * @param face - Face to test
 * @param tolerance - Distance tolerance for intersection
 * @returns Array of intersection points (usually 0, 1, or 2)
 */
export function detectEdgeFaceIntersection(
  edge: Edge,
  face: Face,
  tolerance: number = 1e-6
): EdgeFaceIntersection[] {
  const intersections: EdgeFaceIntersection[] = [];

  // Sample edge into line segments for intersection testing
  const edgePoints = edge.curve.getPoints(50);
  
  // Get face boundary as triangles for testing
  const faceVertices = face.outerLoop.getVertices();
  if (faceVertices.length < 3) return intersections;

  // Create raycaster for each edge segment
  for (let i = 0; i < edgePoints.length - 1; i++) {
    const p1 = edgePoints[i];
    const p2 = edgePoints[i + 1];
    
    const direction = new THREE.Vector3().subVectors(p2, p1);
    const distance = direction.length();
    direction.normalize();

    const raycaster = new THREE.Raycaster(p1, direction, 0, distance);

    // Test against face triangulation
    // Simple triangulation: fan from first vertex
    for (let j = 1; j < faceVertices.length - 1; j++) {
      const v0 = faceVertices[0].position;
      const v1 = faceVertices[j].position;
      const v2 = faceVertices[j + 1].position;

      const triangle = new THREE.Triangle(v0, v1, v2);
      const target = new THREE.Vector3();
      
      const hit = raycaster.ray.intersectTriangle(v0, v1, v2, false, target);
      
      if (hit) {
        const t = i / (edgePoints.length - 1) + (hit.distanceTo(p1) / distance) / (edgePoints.length - 1);
        
        // Determine if edge is entering or exiting face
        const edgeTangent = edge.curve.tangent(t);
        const faceNormal = face.normal || face.calculateNormal();
        const isEntry = edgeTangent.dot(faceNormal) < 0;

        // Approximate UV coordinates (simplified)
        const u = 0.5;
        const v = 0.5;

        intersections.push({
          point: hit.clone(),
          t,
          u,
          v,
          edge,
          face,
          isEntry
        });
        
        break; // Only one intersection per segment
      }
    }
  }

  // Remove duplicates within tolerance
  return removeDuplicateIntersections(intersections, tolerance);
}

/**
 * Detect all edge-edge intersections between two shells
 */
export function detectEdgeEdgeIntersections(
  shell1: Shell,
  shell2: Shell,
  tolerance: number = 1e-6
): IntersectionPoint[] {
  const intersections: IntersectionPoint[] = [];
  
  const edges1 = shell1.getEdges();
  const edges2 = shell2.getEdges();

  for (const edge1 of edges1) {
    for (const edge2 of edges2) {
      const points = intersectEdges(edge1, edge2, tolerance);
      intersections.push(...points);
    }
  }

  return intersections;
}

/**
 * Find intersection between two edges (3D line-line intersection)
 */
function intersectEdges(edge1: Edge, edge2: Edge, tolerance: number): IntersectionPoint[] {
  const intersections: IntersectionPoint[] = [];

  // Sample both edges
  const points1 = edge1.curve.getPoints(20);
  const points2 = edge2.curve.getPoints(20);

  // Check each segment pair for closest approach
  for (let i = 0; i < points1.length - 1; i++) {
    for (let j = 0; j < points2.length - 1; j++) {
      const p1 = points1[i];
      const p2 = points1[i + 1];
      const p3 = points2[j];
      const p4 = points2[j + 1];

      const intersection = lineSegmentIntersection3D(p1, p2, p3, p4, tolerance);
      if (intersection) {
        intersections.push({
          position: intersection,
          t1: i / (points1.length - 1),
          t2: j / (points2.length - 1),
          edge1,
          edge2
        });
      }
    }
  }

  return removeDuplicateIntersections(intersections, tolerance);
}

/**
 * Find closest approach between two 3D line segments
 */
function lineSegmentIntersection3D(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  p3: THREE.Vector3,
  p4: THREE.Vector3,
  tolerance: number
): THREE.Vector3 | null {
  const d1 = new THREE.Vector3().subVectors(p2, p1);
  const d2 = new THREE.Vector3().subVectors(p4, p3);
  const r = new THREE.Vector3().subVectors(p1, p3);

  const a = d1.dot(d1);
  const b = d1.dot(d2);
  const c = d2.dot(d2);
  const d = d1.dot(r);
  const e = d2.dot(r);

  const denom = a * c - b * b;
  
  if (Math.abs(denom) < 1e-10) return null; // Parallel lines

  const t1 = (b * e - c * d) / denom;
  const t2 = (a * e - b * d) / denom;

  if (t1 < 0 || t1 > 1 || t2 < 0 || t2 > 1) return null; // Outside segments

  const point1 = new THREE.Vector3().lerpVectors(p1, p2, t1);
  const point2 = new THREE.Vector3().lerpVectors(p3, p4, t2);

  const distance = point1.distanceTo(point2);
  if (distance > tolerance) return null;

  // Return midpoint
  return new THREE.Vector3().lerpVectors(point1, point2, 0.5);
}

/**
 * Remove duplicate intersections within tolerance
 */
function removeDuplicateIntersections<T extends { point: THREE.Vector3 }>(
  intersections: T[],
  tolerance: number
): T[] {
  const unique: T[] = [];
  
  for (const intersection of intersections) {
    const isDuplicate = unique.some(existing => 
      existing.point.distanceTo(intersection.point) < tolerance
    );
    
    if (!isDuplicate) {
      unique.push(intersection);
    }
  }
  
  return unique;
}

// ============================================================================
// Face Trimming and Splitting
// ============================================================================

export interface TrimmedFace {
  face: Face;
  trimCurves: THREE.Curve<THREE.Vector3>[];
  isInside: boolean; // Whether face is inside the other solid
}

/**
 * Trim a face using intersection points
 * Creates new edges along intersection curves
 * 
 * @param face - Face to trim
 * @param intersections - Intersection points on face
 * @returns Array of trimmed face fragments
 */
export function trimFace(
  face: Face,
  intersections: EdgeFaceIntersection[]
): TrimmedFace[] {
  if (intersections.length === 0) {
    // No intersections, return original face
    return [{
      face,
      trimCurves: [],
      isInside: false
    }];
  }

  // Sort intersections by parameter along face boundary
  const sortedIntersections = [...intersections].sort((a, b) => {
    // Simplified sorting - in reality would sort by position along loops
    return a.t - b.t;
  });

  // Create trim curves connecting intersection points
  const trimCurves: THREE.Curve<THREE.Vector3>[] = [];
  
  for (let i = 0; i < sortedIntersections.length - 1; i += 2) {
    const p1 = sortedIntersections[i].point;
    const p2 = sortedIntersections[i + 1].point;
    
    // Create linear trim curve (in reality would follow intersection curve)
    const curve = new THREE.LineCurve3(p1, p2);
    trimCurves.push(curve);
  }

  // TODO: Implement actual face splitting using trim curves
  // This is a complex operation involving:
  // 1. Inserting new edges at intersection points
  // 2. Splitting face loops
  // 3. Classifying resulting fragments as inside/outside
  
  // For now, return simplified result
  return [{
    face: face.clone(),
    trimCurves,
    isInside: false
  }];
}

/**
 * Split a face along a curve
 * Creates two new faces separated by the split curve
 */
export function splitFaceAlongCurve(
  face: Face,
  curve: THREE.Curve<THREE.Vector3>
): [Face, Face] | null {
  // Get curve endpoints
  const start = curve.getPoint(0);
  const end = curve.getPoint(1);

  // Find vertices closest to endpoints
  const vertices = face.getVertices();
  let startVertex = vertices[0];
  let endVertex = vertices[0];
  let minStartDist = Infinity;
  let minEndDist = Infinity;

  for (const vertex of vertices) {
    const startDist = vertex.position.distanceTo(start);
    const endDist = vertex.position.distanceTo(end);
    
    if (startDist < minStartDist) {
      minStartDist = startDist;
      startVertex = vertex;
    }
    if (endDist < minEndDist) {
      minEndDist = endDist;
      endVertex = vertex;
    }
  }

  // If no existing vertices at endpoints, create new ones
  if (minStartDist > 0.001) {
    startVertex = new Vertex(start);
  }
  if (minEndDist > 0.001) {
    endVertex = new Vertex(end);
  }

  // Create new edge along curve
  const nurbsCurve = new NURBSCurve({
    degree: 1,
    controlPoints: [startVertex.position.clone(), endVertex.position.clone()],
    knots: [0, 0, 1, 1]
  });
  
  const splitEdge = new Edge(startVertex, endVertex, nurbsCurve);

  // TODO: Implement actual face splitting logic
  // This would use the splitFace operation from operations.ts
  
  return null;
}

// ============================================================================
// Boolean Operations
// ============================================================================

export enum BooleanOperation {
  UNION = 'union',
  SUBTRACT = 'subtract',
  INTERSECT = 'intersect'
}

export interface BooleanResult {
  solid: Solid | null;
  success: boolean;
  errors: string[];
  intersectionCount: number;
  executionTime: number;
}

/**
 * Perform boolean operation between two solids
 * 
 * @param solidA - First solid (A)
 * @param solidB - Second solid (B)
 * @param operation - Operation type (union/subtract/intersect)
 * @returns Result solid and metadata
 */
export function booleanOperation(
  solidA: Solid,
  solidB: Solid,
  operation: BooleanOperation
): BooleanResult {
  const startTime = performance.now();
  const errors: string[] = [];

  try {
    // Step 1: Detect all intersections
    const intersections = detectAllIntersections(solidA, solidB);
    
    if (intersections.length === 0) {
      // No intersections - handle special cases
      return handleNonIntersectingCase(solidA, solidB, operation, startTime);
    }

    // Step 2: Split faces and edges at intersection points
    const splitResultA = splitSolidAtIntersections(solidA, intersections, solidB);
    const splitResultB = splitSolidAtIntersections(solidB, intersections, solidA);

    // Step 3: Classify face fragments (inside/outside/on boundary)
    const classifiedA = classifyFaces(splitResultA.faces, solidB);
    const classifiedB = classifyFaces(splitResultB.faces, solidA);

    // Step 4: Select faces based on operation
    const selectedFaces = selectFacesForOperation(
      classifiedA,
      classifiedB,
      operation
    );

    // Step 5: Construct result solid
    const resultShell = new Shell(selectedFaces);
    
    // Fix orientation
    orientFaces(resultShell);

    // Validate
    const validation = validateManifold(resultShell);
    if (!validation.isValid) {
      errors.push(...validation.errors);
    }

    const resultSolid = new Solid(resultShell);
    
    const executionTime = performance.now() - startTime;

    return {
      solid: resultSolid,
      success: true,
      errors,
      intersectionCount: intersections.length,
      executionTime
    };

  } catch (error) {
    const executionTime = performance.now() - startTime;
    errors.push(`Boolean operation failed: ${error}`);
    
    return {
      solid: null,
      success: false,
      errors,
      intersectionCount: 0,
      executionTime
    };
  }
}

/**
 * Detect all intersections between two solids
 */
function detectAllIntersections(
  solidA: Solid,
  solidB: Solid
): EdgeFaceIntersection[] {
  const intersections: EdgeFaceIntersection[] = [];

  const shellA = solidA.outerShell;
  const shellB = solidB.outerShell;

  // Test all edges of A against all faces of B
  for (const edge of shellA.getEdges()) {
    for (const face of shellB.faces) {
      const hits = detectEdgeFaceIntersection(edge, face);
      intersections.push(...hits);
    }
  }

  // Test all edges of B against all faces of A
  for (const edge of shellB.getEdges()) {
    for (const face of shellA.faces) {
      const hits = detectEdgeFaceIntersection(edge, face);
      intersections.push(...hits);
    }
  }

  return intersections;
}

/**
 * Split a solid at intersection points
 */
function splitSolidAtIntersections(
  solid: Solid,
  intersections: EdgeFaceIntersection[],
  otherSolid: Solid
): { faces: Face[]; edges: Edge[] } {
  const faces = [...solid.outerShell.faces];
  const edges = solid.outerShell.getEdges();

  // Group intersections by face
  const faceIntersections = new Map<Face, EdgeFaceIntersection[]>();
  
  for (const intersection of intersections) {
    if (!faceIntersections.has(intersection.face)) {
      faceIntersections.set(intersection.face, []);
    }
    faceIntersections.get(intersection.face)!.push(intersection);
  }

  // Trim each face with intersections
  const resultFaces: Face[] = [];
  
  for (const face of faces) {
    const faceHits = faceIntersections.get(face) || [];
    
    if (faceHits.length > 0) {
      const trimmed = trimFace(face, faceHits);
      resultFaces.push(...trimmed.map(t => t.face));
    } else {
      resultFaces.push(face);
    }
  }

  return { faces: resultFaces, edges };
}

/**
 * Classify faces as inside, outside, or on boundary
 */
function classifyFaces(
  faces: Face[],
  otherSolid: Solid
): Map<Face, 'inside' | 'outside' | 'boundary'> {
  const classification = new Map<Face, 'inside' | 'outside' | 'boundary'>();

  for (const face of faces) {
    // Sample point on face
    const samplePoint = face.surface.evaluate(0.5, 0.5);
    
    // Check if point is inside other solid using ray casting
    const isInside = pointInsideSolid(samplePoint, otherSolid);
    
    classification.set(face, isInside ? 'inside' : 'outside');
  }

  return classification;
}

/**
 * Check if a point is inside a solid using ray casting
 */
function pointInsideSolid(point: THREE.Vector3, solid: Solid): boolean {
  // Cast ray in arbitrary direction
  const direction = new THREE.Vector3(1, 0.1, 0.1).normalize();
  const raycaster = new THREE.Raycaster(point, direction);

  let intersectionCount = 0;

  // Count intersections with solid faces
  for (const face of solid.outerShell.faces) {
    const vertices = face.outerLoop.getVertices();
    
    // Triangulate face and test
    for (let i = 1; i < vertices.length - 1; i++) {
      const v0 = vertices[0].position;
      const v1 = vertices[i].position;
      const v2 = vertices[i + 1].position;

      const target = new THREE.Vector3();
      const hit = raycaster.ray.intersectTriangle(v0, v1, v2, false, target);
      
      if (hit) {
        intersectionCount++;
      }
    }
  }

  // Odd number of intersections = inside
  return intersectionCount % 2 === 1;
}

/**
 * Select faces based on boolean operation type
 */
function selectFacesForOperation(
  classifiedA: Map<Face, 'inside' | 'outside' | 'boundary'>,
  classifiedB: Map<Face, 'inside' | 'outside' | 'boundary'>,
  operation: BooleanOperation
): Face[] {
  const selected: Face[] = [];

  switch (operation) {
    case BooleanOperation.UNION:
      // A outside B + B outside A + boundary
      for (const [face, cls] of classifiedA) {
        if (cls === 'outside' || cls === 'boundary') {
          selected.push(face);
        }
      }
      for (const [face, cls] of classifiedB) {
        if (cls === 'outside' || cls === 'boundary') {
          selected.push(face);
        }
      }
      break;

    case BooleanOperation.SUBTRACT:
      // A outside B + B inside A (inverted) + boundary
      for (const [face, cls] of classifiedA) {
        if (cls === 'outside' || cls === 'boundary') {
          selected.push(face);
        }
      }
      for (const [face, cls] of classifiedB) {
        if (cls === 'inside') {
          // Invert face normal
          const flippedFace = face.clone();
          if (flippedFace.normal) {
            flippedFace.normal.negate();
          }
          selected.push(flippedFace);
        }
      }
      break;

    case BooleanOperation.INTERSECT:
      // A inside B + B inside A + boundary
      for (const [face, cls] of classifiedA) {
        if (cls === 'inside' || cls === 'boundary') {
          selected.push(face);
        }
      }
      for (const [face, cls] of classifiedB) {
        if (cls === 'inside' || cls === 'boundary') {
          selected.push(face);
        }
      }
      break;
  }

  return selected;
}

/**
 * Handle case where solids don't intersect
 */
function handleNonIntersectingCase(
  solidA: Solid,
  solidB: Solid,
  operation: BooleanOperation,
  startTime: number
): BooleanResult {
  const executionTime = performance.now() - startTime;

  // Check if one solid is completely inside the other
  const aCenterInB = pointInsideSolid(solidA.calculateCenterOfMass(), solidB);
  const bCenterInA = pointInsideSolid(solidB.calculateCenterOfMass(), solidA);

  let resultSolid: Solid | null = null;

  switch (operation) {
    case BooleanOperation.UNION:
      if (aCenterInB) {
        resultSolid = solidB; // B contains A
      } else if (bCenterInA) {
        resultSolid = solidA; // A contains B
      } else {
        // Separate solids - would need multi-body support
        resultSolid = solidA; // Return A for now
      }
      break;

    case BooleanOperation.SUBTRACT:
      if (bCenterInA) {
        // B inside A - would create void
        resultSolid = solidA; // Simplified
      } else {
        resultSolid = solidA; // B doesn't affect A
      }
      break;

    case BooleanOperation.INTERSECT:
      if (aCenterInB && bCenterInA) {
        // One contains the other completely
        resultSolid = aCenterInB ? solidA : solidB;
      } else {
        resultSolid = null; // No intersection
      }
      break;
  }

  return {
    solid: resultSolid,
    success: true,
    errors: [],
    intersectionCount: 0,
    executionTime
  };
}

// ============================================================================
// Performance Optimizations
// ============================================================================

/**
 * Bounding box test for early rejection
 */
export function boundingBoxesIntersect(solidA: Solid, solidB: Solid): boolean {
  const boxA = computeBoundingBox(solidA);
  const boxB = computeBoundingBox(solidB);
  
  return boxA.intersectsBox(boxB);
}

/**
 * Compute bounding box for a solid
 */
function computeBoundingBox(solid: Solid): THREE.Box3 {
  const box = new THREE.Box3();
  
  for (const vertex of solid.getVertices()) {
    box.expandByPoint(vertex.position);
  }
  
  return box;
}

/**
 * Spatial partitioning for faster intersection detection
 */
export class SpatialGrid {
  private grid: Map<string, Face[]> = new Map();
  private cellSize: number;

  constructor(cellSize: number = 10) {
    this.cellSize = cellSize;
  }

  add(face: Face): void {
    const vertices = face.getVertices();
    const cells = new Set<string>();
    
    for (const vertex of vertices) {
      const key = this.getCellKey(vertex.position);
      cells.add(key);
    }
    
    for (const key of cells) {
      if (!this.grid.has(key)) {
        this.grid.set(key, []);
      }
      this.grid.get(key)!.push(face);
    }
  }

  getFacesNear(point: THREE.Vector3): Face[] {
    const key = this.getCellKey(point);
    return this.grid.get(key) || [];
  }

  private getCellKey(point: THREE.Vector3): string {
    const x = Math.floor(point.x / this.cellSize);
    const y = Math.floor(point.y / this.cellSize);
    const z = Math.floor(point.z / this.cellSize);
    return `${x},${y},${z}`;
  }
}
