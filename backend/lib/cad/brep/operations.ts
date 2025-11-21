/**
 * BREP Topology Operations
 * 
 * This module implements Euler operators and topology manipulation functions
 * for the BREP CAD kernel.
 */

import * as THREE from 'three';
import {
  Vertex,
  Edge,
  HalfEdge,
  Loop,
  Face,
  Shell,
  Solid,
  NURBSCurve,
  NURBSSurface
} from './topology';

// ============================================================================
// Edge Operations
// ============================================================================

/**
 * Split an edge at parameter t (0 to 1)
 * Creates a new vertex and two new edges
 * 
 * @param edge - Edge to split
 * @param t - Parameter along edge (0 = start, 1 = end)
 * @returns New vertex created at split point
 */
export function splitEdge(edge: Edge, t: number = 0.5): Vertex {
  if (t <= 0 || t >= 1) {
    throw new Error('Split parameter t must be between 0 and 1');
  }

  // Evaluate position at split point
  const splitPoint = edge.curve.evaluate(t);
  const newVertex = new Vertex(splitPoint);

  // Get the original vertices
  const v1 = edge.startVertex;
  const v2 = edge.endVertex;

  // Split the curve into two segments
  const curve1Points = edge.curve.getPoints(10).slice(0, Math.floor(10 * t) + 1);
  curve1Points.push(splitPoint);
  const curve1 = new NURBSCurve({
    degree: 1,
    controlPoints: [v1.position.clone(), splitPoint.clone()],
    knots: [0, 0, 1, 1]
  });

  const curve2Points = [splitPoint];
  curve2Points.push(...edge.curve.getPoints(10).slice(Math.floor(10 * t) + 1));
  const curve2 = new NURBSCurve({
    degree: 1,
    controlPoints: [splitPoint.clone(), v2.position.clone()],
    knots: [0, 0, 1, 1]
  });

  // Create two new edges
  const edge1 = new Edge(v1, newVertex, curve1);
  const edge2 = new Edge(newVertex, v2, curve2);

  // Update faces that referenced the original edge
  const facesToUpdate = [...edge.faces];
  for (const face of facesToUpdate) {
    // Update loops to use new edges
    for (const halfEdge of face.outerLoop.halfEdges) {
      if (halfEdge.edge === edge) {
        // Replace with appropriate new edge
        if (halfEdge.vertex === v1) {
          halfEdge.edge = edge1;
        } else if (halfEdge.vertex === newVertex) {
          halfEdge.edge = edge2;
        }
      }
    }

    // Update face's edge list
    const edgeIndex = face.getEdges().indexOf(edge);
    if (edgeIndex !== -1) {
      edge1.faces.push(face);
      edge2.faces.push(face);
    }
  }

  // Remove original edge from vertex edge lists
  v1.edges = v1.edges.filter(e => e !== edge);
  v2.edges = v2.edges.filter(e => e !== edge);

  return newVertex;
}

/**
 * Merge two adjacent edges that share a vertex
 * The shared vertex is removed and edges are combined
 * 
 * @param edge1 - First edge
 * @param edge2 - Second edge
 * @returns New merged edge, or null if edges can't be merged
 */
export function mergeEdges(edge1: Edge, edge2: Edge): Edge | null {
  // Find shared vertex
  let sharedVertex: Vertex | null = null;
  let startVertex: Vertex;
  let endVertex: Vertex;

  if (edge1.endVertex === edge2.startVertex) {
    sharedVertex = edge1.endVertex;
    startVertex = edge1.startVertex;
    endVertex = edge2.endVertex;
  } else if (edge1.startVertex === edge2.endVertex) {
    sharedVertex = edge1.startVertex;
    startVertex = edge2.startVertex;
    endVertex = edge1.endVertex;
  } else if (edge1.endVertex === edge2.endVertex) {
    sharedVertex = edge1.endVertex;
    startVertex = edge1.startVertex;
    endVertex = edge2.startVertex;
  } else if (edge1.startVertex === edge2.startVertex) {
    sharedVertex = edge1.startVertex;
    startVertex = edge1.endVertex;
    endVertex = edge2.endVertex;
  } else {
    return null; // Edges don't share a vertex
  }

  // Check if vertex has only these two edges (can be safely removed)
  if (sharedVertex.edges.length !== 2) {
    return null; // Vertex is connected to other edges
  }

  // Create merged curve
  const mergedCurve = new NURBSCurve({
    degree: 1,
    controlPoints: [startVertex.position.clone(), endVertex.position.clone()],
    knots: [0, 0, 1, 1]
  });

  // Create new merged edge
  const mergedEdge = new Edge(startVertex, endVertex, mergedCurve);

  // Transfer face references
  for (const face of edge1.faces) {
    if (!mergedEdge.faces.includes(face)) {
      mergedEdge.faces.push(face);
    }
  }
  for (const face of edge2.faces) {
    if (!mergedEdge.faces.includes(face)) {
      mergedEdge.faces.push(face);
    }
  }

  // Update faces to use merged edge
  for (const face of mergedEdge.faces) {
    for (const halfEdge of face.outerLoop.halfEdges) {
      if (halfEdge.edge === edge1 || halfEdge.edge === edge2) {
        halfEdge.edge = mergedEdge;
        if (halfEdge.vertex === sharedVertex) {
          // Update vertex reference
          halfEdge.vertex = startVertex;
        }
      }
    }
  }

  // Remove old edges from vertices
  startVertex.edges = startVertex.edges.filter(e => e !== edge1 && e !== edge2);
  endVertex.edges = endVertex.edges.filter(e => e !== edge1 && e !== edge2);
  sharedVertex.edges = [];

  return mergedEdge;
}

/**
 * Split a face by creating a new edge between two vertices on the face
 * 
 * @param face - Face to split
 * @param vertex1 - First vertex on face boundary
 * @param vertex2 - Second vertex on face boundary
 * @returns Array of two new faces, or null if split failed
 */
export function splitFace(face: Face, vertex1: Vertex, vertex2: Vertex): [Face, Face] | null {
  // Verify both vertices are on the face
  const faceVertices = face.getVertices();
  if (!faceVertices.includes(vertex1) || !faceVertices.includes(vertex2)) {
    return null;
  }

  // Don't split if vertices are adjacent (already connected by edge)
  if (vertex1.edges.some(e => e.startVertex === vertex2 || e.endVertex === vertex2)) {
    return null;
  }

  // Create new edge connecting the vertices
  const newEdgeCurve = new NURBSCurve({
    degree: 1,
    controlPoints: [vertex1.position.clone(), vertex2.position.clone()],
    knots: [0, 0, 1, 1]
  });
  const newEdge = new Edge(vertex1, vertex2, newEdgeCurve);

  // Find positions of vertices in the loop
  const halfEdges = face.outerLoop.halfEdges;
  let idx1 = -1;
  let idx2 = -1;
  
  for (let i = 0; i < halfEdges.length; i++) {
    if (halfEdges[i].vertex === vertex1) idx1 = i;
    if (halfEdges[i].vertex === vertex2) idx2 = i;
  }

  if (idx1 === -1 || idx2 === -1) return null;

  // Ensure idx1 < idx2
  if (idx1 > idx2) {
    [idx1, idx2] = [idx2, idx1];
    [vertex1, vertex2] = [vertex2, vertex1];
  }

  // Create two new loops
  const loop1HalfEdges: HalfEdge[] = [];
  const loop2HalfEdges: HalfEdge[] = [];

  // First loop: from vertex1 to vertex2, including new edge
  for (let i = idx1; i < idx2; i++) {
    loop1HalfEdges.push(halfEdges[i]);
  }
  loop1HalfEdges.push(newEdge.halfEdge1);

  // Second loop: from vertex2 to vertex1, including new edge twin
  for (let i = idx2; i < halfEdges.length; i++) {
    loop2HalfEdges.push(halfEdges[i]);
  }
  for (let i = 0; i < idx1; i++) {
    loop2HalfEdges.push(halfEdges[i]);
  }
  loop2HalfEdges.push(newEdge.halfEdge2);

  const loop1 = new Loop(loop1HalfEdges);
  const loop2 = new Loop(loop2HalfEdges);

  // Create simplified surfaces for the two new faces
  // In a real implementation, these would be properly trimmed from the original surface
  const surface1 = face.surface.clone();
  const surface2 = face.surface.clone();

  // Create two new faces
  const face1 = new Face(surface1, loop1);
  const face2 = new Face(surface2, loop2);

  // Update edge face references
  newEdge.faces.push(face1, face2);

  return [face1, face2];
}

// ============================================================================
// Euler Operators
// ============================================================================

/**
 * MEV - Make Edge Vertex
 * Creates a new edge and vertex from an existing vertex
 * Increases V by 1 and E by 1 (maintains Euler characteristic)
 * 
 * @param vertex - Starting vertex
 * @param position - Position for new vertex
 * @param face - Face containing the edge (optional)
 * @returns Object containing new vertex and edge
 */
export function makeEdgeVertex(
  vertex: Vertex,
  position: THREE.Vector3,
  face?: Face
): { vertex: Vertex; edge: Edge } {
  const newVertex = new Vertex(position);
  
  const curve = new NURBSCurve({
    degree: 1,
    controlPoints: [vertex.position.clone(), position.clone()],
    knots: [0, 0, 1, 1]
  });
  
  const newEdge = new Edge(vertex, newVertex, curve);

  // If face is provided, add edge to face
  if (face) {
    newEdge.faces.push(face);
    
    // Update face's loop to include new edge
    // Find half-edge starting from the original vertex
    for (const halfEdge of face.outerLoop.halfEdges) {
      if (halfEdge.vertex === vertex) {
        // Insert new half-edge after this one
        const oldNext = halfEdge.next;
        halfEdge.next = newEdge.halfEdge1;
        newEdge.halfEdge1.prev = halfEdge;
        newEdge.halfEdge1.next = oldNext;
        if (oldNext) oldNext.prev = newEdge.halfEdge1;
        newEdge.halfEdge1.loop = face.outerLoop;
        face.outerLoop.halfEdges.push(newEdge.halfEdge1);
        break;
      }
    }
  }

  return { vertex: newVertex, edge: newEdge };
}

/**
 * KEV - Kill Edge Vertex
 * Removes an edge and its endpoint vertex
 * Decreases V by 1 and E by 1 (maintains Euler characteristic)
 * The vertex must have degree 1 (only connected to this edge)
 * 
 * @param edge - Edge to remove
 * @param vertex - Vertex to remove (must be endpoint of edge)
 * @returns Remaining vertex, or null if operation failed
 */
export function killEdgeVertex(edge: Edge, vertex: Vertex): Vertex | null {
  // Verify vertex is an endpoint of the edge
  if (vertex !== edge.startVertex && vertex !== edge.endVertex) {
    return null;
  }

  // Verify vertex has degree 1 (only this edge)
  if (vertex.edges.length !== 1 || vertex.edges[0] !== edge) {
    return null;
  }

  // Get the remaining vertex
  const remainingVertex = vertex === edge.startVertex ? edge.endVertex : edge.startVertex;

  // Remove edge from faces
  for (const face of edge.faces) {
    // Remove half-edges from loop
    face.outerLoop.halfEdges = face.outerLoop.halfEdges.filter(
      he => he.edge !== edge
    );
  }

  // Remove edge from remaining vertex
  remainingVertex.edges = remainingVertex.edges.filter(e => e !== edge);

  // Clear vertex edges
  vertex.edges = [];

  return remainingVertex;
}

/**
 * MEF - Make Edge Face
 * Creates a new edge and face by connecting two vertices on a face
 * This splits the face into two faces
 * Increases E by 1 and F by 1 (maintains Euler characteristic)
 * 
 * @param face - Face to split
 * @param vertex1 - First vertex
 * @param vertex2 - Second vertex
 * @returns Object with new edge and two resulting faces
 */
export function makeEdgeFace(
  face: Face,
  vertex1: Vertex,
  vertex2: Vertex
): { edge: Edge; face1: Face; face2: Face } | null {
  const result = splitFace(face, vertex1, vertex2);
  if (!result) return null;

  const [face1, face2] = result;
  const newEdge = face1.getEdges().find(e => 
    (e.startVertex === vertex1 && e.endVertex === vertex2) ||
    (e.startVertex === vertex2 && e.endVertex === vertex1)
  );

  if (!newEdge) return null;

  return { edge: newEdge, face1, face2 };
}

/**
 * KEF - Kill Edge Face
 * Removes an edge and merges two adjacent faces
 * Decreases E by 1 and F by 1 (maintains Euler characteristic)
 * 
 * @param edge - Edge to remove (must have exactly 2 faces)
 * @returns Merged face, or null if operation failed
 */
export function killEdgeFace(edge: Edge): Face | null {
  // Verify edge has exactly 2 faces
  if (edge.faces.length !== 2) {
    return null;
  }

  const [face1, face2] = edge.faces;

  // Combine half-edges from both loops (excluding the killed edge)
  const combinedHalfEdges: HalfEdge[] = [];
  
  for (const he of face1.outerLoop.halfEdges) {
    if (he.edge !== edge) {
      combinedHalfEdges.push(he);
    }
  }
  
  for (const he of face2.outerLoop.halfEdges) {
    if (he.edge !== edge) {
      combinedHalfEdges.push(he);
    }
  }

  // Create new loop and face
  const mergedLoop = new Loop(combinedHalfEdges);
  const mergedFace = new Face(face1.surface.clone(), mergedLoop);

  // Update edge references
  edge.startVertex.edges = edge.startVertex.edges.filter(e => e !== edge);
  edge.endVertex.edges = edge.endVertex.edges.filter(e => e !== edge);

  return mergedFace;
}

// ============================================================================
// Validation Operations
// ============================================================================

/**
 * Check if a shell is a valid manifold
 * A manifold shell has:
 * - Each edge shared by exactly 1 or 2 faces
 * - Each vertex has a consistent neighborhood
 * 
 * @param shell - Shell to validate
 * @returns Object with validation result and error messages
 */
export function validateManifold(shell: Shell): { 
  isValid: boolean; 
  errors: string[] 
} {
  const errors: string[] = [];

  // Check edge-face consistency
  const edges = shell.getEdges();
  for (const edge of edges) {
    if (edge.faces.length === 0) {
      errors.push(`Edge ${edge.id} has no faces`);
    } else if (edge.faces.length > 2) {
      errors.push(`Edge ${edge.id} has ${edge.faces.length} faces (non-manifold)`);
    }
  }

  // Check vertex neighborhoods
  const vertices = shell.getVertices();
  for (const vertex of vertices) {
    // Get faces around vertex
    const vertexFaces = vertex.getFaces();
    
    // Check if faces form a consistent disk or fan
    if (vertexFaces.length < 2) continue;

    // For interior vertices (not on boundary), edge count should match face count
    const boundaryEdges = vertex.edges.filter(e => e.isBoundary());
    if (boundaryEdges.length === 0) {
      // Interior vertex: should have same number of edges as faces
      if (vertex.edges.length !== vertexFaces.length) {
        errors.push(
          `Vertex ${vertex.id} has inconsistent edge-face count ` +
          `(${vertex.edges.length} edges, ${vertexFaces.length} faces)`
        );
      }
    }
  }

  // Check face orientations are consistent
  for (const edge of edges) {
    if (edge.faces.length === 2) {
      // Check if normals point away from each other (consistent orientation)
      const face1 = edge.faces[0];
      const face2 = edge.faces[1];
      
      const normal1 = face1.normal || face1.calculateNormal();
      const normal2 = face2.normal || face2.calculateNormal();
      
      // Get edge midpoint
      const midpoint = edge.midpoint();
      
      // Normals should point in roughly opposite directions for consistent orientation
      const dotProduct = normal1.dot(normal2);
      if (dotProduct > 0.5) {
        errors.push(
          `Edge ${edge.id} has inconsistent face orientations ` +
          `(normals point in same direction)`
        );
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Check and fix face orientations to be consistent
 * Uses breadth-first search to propagate orientation
 * 
 * @param shell - Shell to orient
 * @returns Number of faces that were flipped
 */
export function orientFaces(shell: Shell): number {
  const faces = shell.faces;
  if (faces.length === 0) return 0;

  const visited = new Set<Face>();
  const toVisit: Face[] = [faces[0]];
  let flippedCount = 0;

  // Calculate initial normals
  for (const face of faces) {
    face.calculateNormal();
  }

  while (toVisit.length > 0) {
    const currentFace = toVisit.shift()!;
    if (visited.has(currentFace)) continue;
    visited.add(currentFace);

    // Get adjacent faces
    const adjacentFaces = currentFace.getAdjacentFaces();
    
    for (const adjacentFace of adjacentFaces) {
      if (visited.has(adjacentFace)) continue;

      // Find shared edge
      const sharedEdge = currentFace.getEdges().find(e => 
        adjacentFace.getEdges().includes(e)
      );

      if (!sharedEdge) continue;

      // Check if orientations are consistent
      const currentNormal = currentFace.normal!;
      const adjacentNormal = adjacentFace.normal!;
      
      // If normals point in same general direction, flip adjacent face
      if (currentNormal.dot(adjacentNormal) > 0) {
        // Flip adjacent face by reversing its loop
        const reversedHalfEdges = [...adjacentFace.outerLoop.halfEdges].reverse();
        adjacentFace.outerLoop.halfEdges = reversedHalfEdges;
        
        // Recalculate normal
        adjacentFace.calculateNormal();
        adjacentFace.normal!.negate();
        
        flippedCount++;
      }

      toVisit.push(adjacentFace);
    }
  }

  return flippedCount;
}

/**
 * Check if a solid's topology is valid
 * Validates:
 * - Euler-Poincaré formula
 * - Manifold properties
 * - Closed shells
 * - Consistent orientations
 * 
 * @param solid - Solid to validate
 * @returns Object with validation result and error messages
 */
export function validateSolid(solid: Solid): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if outer shell is closed
  if (!solid.outerShell.isClosed()) {
    errors.push('Outer shell is not closed (has boundary edges)');
  }

  // Check manifold properties
  const manifoldCheck = validateManifold(solid.outerShell);
  if (!manifoldCheck.isValid) {
    errors.push(...manifoldCheck.errors);
  }

  // Check inner shells (voids)
  for (let i = 0; i < solid.innerShells.length; i++) {
    const innerShell = solid.innerShells[i];
    
    if (!innerShell.isClosed()) {
      errors.push(`Inner shell ${i} is not closed`);
    }

    const innerManifoldCheck = validateManifold(innerShell);
    if (!innerManifoldCheck.isValid) {
      errors.push(...innerManifoldCheck.errors.map(e => `Inner shell ${i}: ${e}`));
    }
  }

  // Check Euler characteristic for outer shell
  const chi = solid.outerShell.eulerCharacteristic();
  if (chi !== 2) {
    warnings.push(
      `Outer shell Euler characteristic is ${chi} (expected 2 for sphere-like topology)`
    );
  }

  // Validate shell orientations (outer shell should point outward, inner inward)
  const outerFaces = solid.outerShell.faces;
  if (outerFaces.length > 0) {
    const sampleFace = outerFaces[0];
    const normal = sampleFace.normal || sampleFace.calculateNormal();
    const centroid = solid.centerOfMass || solid.calculateCenterOfMass();
    const faceCenter = sampleFace.outerLoop.getVertices()[0].position;
    
    const toCenter = new THREE.Vector3().subVectors(centroid, faceCenter);
    
    // Outer shell normals should point away from center
    if (normal.dot(toCenter) > 0) {
      warnings.push('Outer shell may have inverted orientation');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Calculate the genus (number of holes) of a closed shell
 * Uses Euler-Poincaré formula: V - E + F = 2 - 2g
 * where g is the genus
 * 
 * @param shell - Shell to analyze
 * @returns Genus (0 for sphere, 1 for torus, etc.)
 */
export function calculateGenus(shell: Shell): number {
  if (!shell.isClosed()) {
    throw new Error('Cannot calculate genus of non-closed shell');
  }

  const chi = shell.eulerCharacteristic();
  const genus = (2 - chi) / 2;
  
  return Math.round(genus);
}
