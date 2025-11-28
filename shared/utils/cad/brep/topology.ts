/**
 * BREP (Boundary Representation) Topology Classes
 * 
 * This module implements the fundamental topology classes for a CAD kernel:
 * - Vertex: Point in 3D space
 * - Edge: Curve connecting two vertices
 * - Face: Surface bounded by loops
 * - Loop: Closed chain of edges
 * - Shell: Collection of connected faces
 * - Solid: Volume enclosed by shells
 */

import * as THREE from 'three';

// ============================================================================
// NURBS Curve and Surface (Placeholders)
// ============================================================================

export interface NURBSCurveData {
  degree: number;
  controlPoints: THREE.Vector3[];
  knots: number[];
  weights?: number[];
}

export interface NURBSSurfaceData {
  degreeU: number;
  degreeV: number;
  controlPoints: THREE.Vector3[][]; // 2D array [u][v]
  knotsU: number[];
  knotsV: number[];
  weights?: number[][];
}

export class NURBSCurve {
  degree: number;
  controlPoints: THREE.Vector3[];
  knots: number[];
  weights: number[];

  constructor(data: NURBSCurveData) {
    this.degree = data.degree;
    this.controlPoints = data.controlPoints;
    this.knots = data.knots;
    this.weights = data.weights || data.controlPoints.map(() => 1.0);
  }

  /**
   * Evaluate curve at parameter t (0 to 1)
   */
  evaluate(t: number): THREE.Vector3 {
    // TODO: Implement de Boor's algorithm for NURBS evaluation
    // For now, simple linear interpolation for degree 1
    if (this.degree === 1 && this.controlPoints.length === 2) {
      const p0 = this.controlPoints[0];
      const p1 = this.controlPoints[1];
      return new THREE.Vector3(
        p0.x + t * (p1.x - p0.x),
        p0.y + t * (p1.y - p0.y),
        p0.z + t * (p1.z - p0.z)
      );
    }
    return this.controlPoints[0].clone();
  }

  /**
   * Get tangent vector at parameter t
   */
  tangent(t: number): THREE.Vector3 {
    // TODO: Implement derivative calculation
    if (this.controlPoints.length >= 2) {
      const p0 = this.controlPoints[0];
      const p1 = this.controlPoints[1];
      return new THREE.Vector3(
        p1.x - p0.x,
        p1.y - p0.y,
        p1.z - p0.z
      ).normalize();
    }
    return new THREE.Vector3(1, 0, 0);
  }

  /**
   * Get point samples along the curve
   */
  getPoints(numSamples: number = 50): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= numSamples; i++) {
      const t = i / numSamples;
      points.push(this.evaluate(t));
    }
    return points;
  }

  clone(): NURBSCurve {
    return new NURBSCurve({
      degree: this.degree,
      controlPoints: this.controlPoints.map(p => p.clone()),
      knots: [...this.knots],
      weights: [...this.weights]
    });
  }
}

export class NURBSSurface {
  degreeU: number;
  degreeV: number;
  controlPoints: THREE.Vector3[][];
  knotsU: number[];
  knotsV: number[];
  weights: number[][];

  constructor(data: NURBSSurfaceData) {
    this.degreeU = data.degreeU;
    this.degreeV = data.degreeV;
    this.controlPoints = data.controlPoints;
    this.knotsU = data.knotsU;
    this.knotsV = data.knotsV;
    this.weights = data.weights || 
      data.controlPoints.map(row => row.map(() => 1.0));
  }

  /**
   * Evaluate surface at parameters (u, v) where both range from 0 to 1
   */
  evaluate(u: number, v: number): THREE.Vector3 {
    // TODO: Implement tensor product NURBS surface evaluation
    // For now, bilinear interpolation for degree 1 x 1
    if (this.degreeU === 1 && this.degreeV === 1 && 
        this.controlPoints.length >= 2 && this.controlPoints[0].length >= 2) {
      const p00 = this.controlPoints[0][0];
      const p10 = this.controlPoints[1][0];
      const p01 = this.controlPoints[0][1];
      const p11 = this.controlPoints[1][1];

      const pu0 = new THREE.Vector3().lerpVectors(p00, p10, u);
      const pu1 = new THREE.Vector3().lerpVectors(p01, p11, u);
      return new THREE.Vector3().lerpVectors(pu0, pu1, v);
    }
    return this.controlPoints[0][0].clone();
  }

  /**
   * Get normal vector at parameters (u, v)
   */
  normal(u: number, v: number): THREE.Vector3 {
    // TODO: Implement proper surface normal calculation
    // For now, approximate using finite differences
    const epsilon = 0.001;
    const p = this.evaluate(u, v);
    const pu = this.evaluate(u + epsilon, v);
    const pv = this.evaluate(u, v + epsilon);

    const du = new THREE.Vector3().subVectors(pu, p);
    const dv = new THREE.Vector3().subVectors(pv, p);
    return new THREE.Vector3().crossVectors(du, dv).normalize();
  }

  clone(): NURBSSurface {
    return new NURBSSurface({
      degreeU: this.degreeU,
      degreeV: this.degreeV,
      controlPoints: this.controlPoints.map(row => row.map(p => p.clone())),
      knotsU: [...this.knotsU],
      knotsV: [...this.knotsV],
      weights: this.weights.map(row => [...row])
    });
  }
}

// ============================================================================
// Topology Classes
// ============================================================================

let globalIdCounter = 0;

export class Vertex {
  id: string;
  position: THREE.Vector3;
  edges: Edge[] = []; // Edges that reference this vertex
  userData: any = {};

  constructor(position: THREE.Vector3, id?: string) {
    this.id = id || `vertex_${globalIdCounter++}`;
    this.position = position.clone();
  }

  /**
   * Get all faces that share this vertex
   */
  getFaces(): Face[] {
    const faces = new Set<Face>();
    for (const edge of this.edges) {
      for (const face of edge.faces) {
        faces.add(face);
      }
    }
    return Array.from(faces);
  }

  /**
   * Get all vertices connected to this vertex by an edge
   */
  getAdjacentVertices(): Vertex[] {
    const vertices = new Set<Vertex>();
    for (const edge of this.edges) {
      const other = edge.getOtherVertex(this);
      if (other) vertices.add(other);
    }
    return Array.from(vertices);
  }

  clone(): Vertex {
    const v = new Vertex(this.position);
    v.userData = { ...this.userData };
    return v;
  }

  toJSON() {
    return {
      id: this.id,
      position: this.position.toArray(),
      userData: this.userData
    };
  }
}

export class HalfEdge {
  id: string;
  edge: Edge;
  vertex: Vertex; // Starting vertex of this half-edge
  twin: HalfEdge | null = null; // Opposite half-edge
  next: HalfEdge | null = null; // Next half-edge in loop
  prev: HalfEdge | null = null; // Previous half-edge in loop
  loop: Loop | null = null; // Loop this half-edge belongs to

  constructor(edge: Edge, vertex: Vertex, id?: string) {
    this.id = id || `halfedge_${globalIdCounter++}`;
    this.edge = edge;
    this.vertex = vertex;
  }

  /**
   * Get the end vertex of this half-edge
   */
  getEndVertex(): Vertex | null {
    return this.next?.vertex || null;
  }

  /**
   * Get the face this half-edge belongs to
   */
  getFace(): Face | null {
    return this.loop?.face || null;
  }
}

export class Edge {
  id: string;
  startVertex: Vertex;
  endVertex: Vertex;
  curve: NURBSCurve; // Geometric curve
  faces: Face[] = []; // Faces that share this edge (1 or 2)
  halfEdge1: HalfEdge; // First half-edge
  halfEdge2: HalfEdge; // Second half-edge (twin)
  userData: any = {};

  constructor(startVertex: Vertex, endVertex: Vertex, curve?: NURBSCurve, id?: string) {
    this.id = id || `edge_${globalIdCounter++}`;
    this.startVertex = startVertex;
    this.endVertex = endVertex;
    
    // Default to linear curve if not provided
    this.curve = curve || new NURBSCurve({
      degree: 1,
      controlPoints: [startVertex.position.clone(), endVertex.position.clone()],
      knots: [0, 0, 1, 1],
      weights: [1, 1]
    });

    // Create half-edges
    this.halfEdge1 = new HalfEdge(this, startVertex);
    this.halfEdge2 = new HalfEdge(this, endVertex);
    this.halfEdge1.twin = this.halfEdge2;
    this.halfEdge2.twin = this.halfEdge1;

    // Register this edge with vertices
    if (!startVertex.edges.includes(this)) {
      startVertex.edges.push(this);
    }
    if (!endVertex.edges.includes(this)) {
      endVertex.edges.push(this);
    }
  }

  /**
   * Get the other vertex of this edge
   */
  getOtherVertex(vertex: Vertex): Vertex | null {
    if (vertex === this.startVertex) return this.endVertex;
    if (vertex === this.endVertex) return this.startVertex;
    return null;
  }

  /**
   * Check if edge is a boundary edge (has only one face)
   */
  isBoundary(): boolean {
    return this.faces.length === 1;
  }

  /**
   * Get length of the edge
   */
  length(): number {
    return this.startVertex.position.distanceTo(this.endVertex.position);
  }

  /**
   * Get midpoint of the edge
   */
  midpoint(): THREE.Vector3 {
    return this.curve.evaluate(0.5);
  }

  /**
   * Split edge at parameter t (0 to 1)
   */
  split(t: number): Vertex {
    const point = this.curve.evaluate(t);
    const newVertex = new Vertex(point);
    
    // TODO: Update topology properly - create new edges, update faces
    // This is a simplified placeholder
    return newVertex;
  }

  clone(): Edge {
    const e = new Edge(this.startVertex.clone(), this.endVertex.clone(), this.curve.clone());
    e.userData = { ...this.userData };
    return e;
  }

  toJSON() {
    return {
      id: this.id,
      startVertex: this.startVertex.id,
      endVertex: this.endVertex.id,
      userData: this.userData
    };
  }
}

export class Loop {
  id: string;
  face: Face | null = null;
  halfEdges: HalfEdge[] = [];
  userData: any = {};

  constructor(halfEdges: HalfEdge[] = [], id?: string) {
    this.id = id || `loop_${globalIdCounter++}`;
    this.halfEdges = halfEdges;
    
    // Link half-edges in sequence
    for (let i = 0; i < halfEdges.length; i++) {
      const current = halfEdges[i];
      const next = halfEdges[(i + 1) % halfEdges.length];
      current.next = next;
      next.prev = current;
      current.loop = this;
    }
  }

  /**
   * Check if loop is closed
   */
  isClosed(): boolean {
    if (this.halfEdges.length === 0) return false;
    const first = this.halfEdges[0];
    let current = first;
    let count = 0;
    do {
      if (!current.next) return false;
      current = current.next;
      count++;
      if (count > 10000) return false; // Prevent infinite loop
    } while (current !== first);
    return true;
  }

  /**
   * Get vertices in order around the loop
   */
  getVertices(): Vertex[] {
    return this.halfEdges.map(he => he.vertex);
  }

  /**
   * Get edges in order around the loop
   */
  getEdges(): Edge[] {
    return this.halfEdges.map(he => he.edge);
  }

  /**
   * Check if loop is outer (counter-clockwise) or inner (clockwise)
   */
  isOuter(): boolean {
    // Calculate signed area to determine orientation
    const vertices = this.getVertices();
    let area = 0;
    for (let i = 0; i < vertices.length; i++) {
      const v1 = vertices[i].position;
      const v2 = vertices[(i + 1) % vertices.length].position;
      area += (v2.x - v1.x) * (v2.y + v1.y);
    }
    return area > 0; // Positive area = counter-clockwise = outer
  }

  clone(): Loop {
    // Note: This creates a shallow clone. Deep cloning requires cloning all referenced objects
    return new Loop([...this.halfEdges]);
  }

  toJSON() {
    return {
      id: this.id,
      halfEdges: this.halfEdges.map(he => he.id),
      userData: this.userData
    };
  }
}

export class Face {
  id: string;
  surface: NURBSSurface; // Geometric surface
  outerLoop: Loop; // Outer boundary
  innerLoops: Loop[] = []; // Inner boundaries (holes)
  shell: Shell | null = null;
  normal: THREE.Vector3 | null = null;
  userData: any = {};

  constructor(surface: NURBSSurface, outerLoop: Loop, innerLoops: Loop[] = [], id?: string) {
    this.id = id || `face_${globalIdCounter++}`;
    this.surface = surface;
    this.outerLoop = outerLoop;
    this.innerLoops = innerLoops;
    
    outerLoop.face = this;
    for (const loop of innerLoops) {
      loop.face = this;
    }

    // Register face with edges
    for (const edge of this.getEdges()) {
      if (!edge.faces.includes(this)) {
        edge.faces.push(this);
      }
    }
  }

  /**
   * Get all edges belonging to this face
   */
  getEdges(): Edge[] {
    const edges = new Set<Edge>();
    for (const he of this.outerLoop.halfEdges) {
      edges.add(he.edge);
    }
    for (const loop of this.innerLoops) {
      for (const he of loop.halfEdges) {
        edges.add(he.edge);
      }
    }
    return Array.from(edges);
  }

  /**
   * Get all vertices belonging to this face
   */
  getVertices(): Vertex[] {
    const vertices = new Set<Vertex>();
    for (const he of this.outerLoop.halfEdges) {
      vertices.add(he.vertex);
    }
    for (const loop of this.innerLoops) {
      for (const he of loop.halfEdges) {
        vertices.add(he.vertex);
      }
    }
    return Array.from(vertices);
  }

  /**
   * Calculate face normal (average of surface normals)
   */
  calculateNormal(): THREE.Vector3 {
    // Sample surface at center (u=0.5, v=0.5)
    this.normal = this.surface.normal(0.5, 0.5);
    return this.normal;
  }

  /**
   * Calculate face area (approximate)
   */
  calculateArea(): number {
    // TODO: Implement proper surface area calculation
    // For now, approximate using triangulation of outer loop
    const vertices = this.outerLoop.getVertices();
    if (vertices.length < 3) return 0;
    
    let area = 0;
    const v0 = vertices[0].position;
    for (let i = 1; i < vertices.length - 1; i++) {
      const v1 = vertices[i].position;
      const v2 = vertices[i + 1].position;
      const a = new THREE.Vector3().subVectors(v1, v0);
      const b = new THREE.Vector3().subVectors(v2, v0);
      area += a.cross(b).length() / 2;
    }
    return area;
  }

  /**
   * Get adjacent faces (faces that share an edge)
   */
  getAdjacentFaces(): Face[] {
    const faces = new Set<Face>();
    for (const edge of this.getEdges()) {
      for (const face of edge.faces) {
        if (face !== this) faces.add(face);
      }
    }
    return Array.from(faces);
  }

  clone(): Face {
    const f = new Face(
      this.surface.clone(),
      this.outerLoop.clone(),
      this.innerLoops.map(loop => loop.clone())
    );
    f.userData = { ...this.userData };
    return f;
  }

  toJSON() {
    return {
      id: this.id,
      outerLoop: this.outerLoop.id,
      innerLoops: this.innerLoops.map(loop => loop.id),
      userData: this.userData
    };
  }
}

export class Shell {
  id: string;
  faces: Face[] = [];
  solid: Solid | null = null;
  userData: any = {};

  constructor(faces: Face[] = [], id?: string) {
    this.id = id || `shell_${globalIdCounter++}`;
    this.faces = faces;
    
    for (const face of faces) {
      face.shell = this;
    }
  }

  /**
   * Get all edges in the shell
   */
  getEdges(): Edge[] {
    const edges = new Set<Edge>();
    for (const face of this.faces) {
      for (const edge of face.getEdges()) {
        edges.add(edge);
      }
    }
    return Array.from(edges);
  }

  /**
   * Get all vertices in the shell
   */
  getVertices(): Vertex[] {
    const vertices = new Set<Vertex>();
    for (const face of this.faces) {
      for (const vertex of face.getVertices()) {
        vertices.add(vertex);
      }
    }
    return Array.from(vertices);
  }

  /**
   * Check if shell is closed (all edges have 2 faces)
   */
  isClosed(): boolean {
    const edges = this.getEdges();
    return edges.every(edge => edge.faces.length === 2);
  }

  /**
   * Get boundary edges (edges with only 1 face)
   */
  getBoundaryEdges(): Edge[] {
    return this.getEdges().filter(edge => edge.isBoundary());
  }

  /**
   * Calculate Euler characteristic (V - E + F)
   */
  eulerCharacteristic(): number {
    const V = this.getVertices().length;
    const E = this.getEdges().length;
    const F = this.faces.length;
    return V - E + F;
  }

  /**
   * Validate manifold property (each edge has exactly 1 or 2 faces)
   */
  isManifold(): boolean {
    const edges = this.getEdges();
    return edges.every(edge => edge.faces.length <= 2);
  }

  clone(): Shell {
    const s = new Shell(this.faces.map(face => face.clone()));
    s.userData = { ...this.userData };
    return s;
  }

  toJSON() {
    return {
      id: this.id,
      faces: this.faces.map(face => face.id),
      userData: this.userData
    };
  }
}

export class Solid {
  id: string;
  outerShell: Shell;
  innerShells: Shell[] = []; // Voids/cavities
  volume: number = 0;
  centerOfMass: THREE.Vector3 | null = null;
  userData: any = {};

  constructor(outerShell: Shell, innerShells: Shell[] = [], id?: string) {
    this.id = id || `solid_${globalIdCounter++}`;
    this.outerShell = outerShell;
    this.innerShells = innerShells;
    
    outerShell.solid = this;
    for (const shell of innerShells) {
      shell.solid = this;
    }
  }

  /**
   * Get all faces in the solid
   */
  getFaces(): Face[] {
    const faces = [...this.outerShell.faces];
    for (const shell of this.innerShells) {
      faces.push(...shell.faces);
    }
    return faces;
  }

  /**
   * Get all edges in the solid
   */
  getEdges(): Edge[] {
    const edges = new Set<Edge>();
    for (const face of this.getFaces()) {
      for (const edge of face.getEdges()) {
        edges.add(edge);
      }
    }
    return Array.from(edges);
  }

  /**
   * Get all vertices in the solid
   */
  getVertices(): Vertex[] {
    const vertices = new Set<Vertex>();
    for (const face of this.getFaces()) {
      for (const vertex of face.getVertices()) {
        vertices.add(vertex);
      }
    }
    return Array.from(vertices);
  }

  /**
   * Calculate volume (approximate using signed volume of tetrahedra)
   */
  calculateVolume(): number {
    let volume = 0;
    const origin = new THREE.Vector3(0, 0, 0);

    for (const face of this.outerShell.faces) {
      const vertices = face.outerLoop.getVertices();
      if (vertices.length < 3) continue;

      const v0 = vertices[0].position;
      for (let i = 1; i < vertices.length - 1; i++) {
        const v1 = vertices[i].position;
        const v2 = vertices[i + 1].position;

        // Signed volume of tetrahedron (origin, v0, v1, v2)
        const a = v0.clone();
        const b = v1.clone();
        const c = v2.clone();
        volume += a.dot(b.cross(c)) / 6;
      }
    }

    this.volume = Math.abs(volume);
    return this.volume;
  }

  /**
   * Calculate center of mass (geometric centroid)
   */
  calculateCenterOfMass(): THREE.Vector3 {
    const vertices = this.getVertices();
    const center = new THREE.Vector3(0, 0, 0);
    
    for (const vertex of vertices) {
      center.add(vertex.position);
    }
    
    center.divideScalar(vertices.length);
    this.centerOfMass = center;
    return center;
  }

  /**
   * Check if solid is closed (all shells are closed)
   */
  isClosed(): boolean {
    if (!this.outerShell.isClosed()) return false;
    return this.innerShells.every(shell => shell.isClosed());
  }

  /**
   * Validate solid topology
   */
  isValid(): boolean {
    // Check Euler-Poincaré formula for solids: V - E + F - (L - F) - 2(S - G) = 0
    // Simplified check: all shells must be closed and manifold
    if (!this.isClosed()) return false;
    if (!this.outerShell.isManifold()) return false;
    return this.innerShells.every(shell => shell.isManifold());
  }

  clone(): Solid {
    const s = new Solid(
      this.outerShell.clone(),
      this.innerShells.map(shell => shell.clone())
    );
    s.userData = { ...this.userData };
    return s;
  }

  toJSON() {
    return {
      id: this.id,
      outerShell: this.outerShell.id,
      innerShells: this.innerShells.map(shell => shell.id),
      volume: this.volume,
      centerOfMass: this.centerOfMass?.toArray(),
      userData: this.userData
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a simple box solid using BREP topology
 */
export function createBoxBREP(
  width: number,
  height: number,
  depth: number,
  center: THREE.Vector3 = new THREE.Vector3(0, 0, 0)
): Solid {
  const w2 = width / 2;
  const h2 = height / 2;
  const d2 = depth / 2;

  // Create 8 vertices
  const v0 = new Vertex(new THREE.Vector3(center.x - w2, center.y - h2, center.z - d2));
  const v1 = new Vertex(new THREE.Vector3(center.x + w2, center.y - h2, center.z - d2));
  const v2 = new Vertex(new THREE.Vector3(center.x + w2, center.y + h2, center.z - d2));
  const v3 = new Vertex(new THREE.Vector3(center.x - w2, center.y + h2, center.z - d2));
  const v4 = new Vertex(new THREE.Vector3(center.x - w2, center.y - h2, center.z + d2));
  const v5 = new Vertex(new THREE.Vector3(center.x + w2, center.y - h2, center.z + d2));
  const v6 = new Vertex(new THREE.Vector3(center.x + w2, center.y + h2, center.z + d2));
  const v7 = new Vertex(new THREE.Vector3(center.x - w2, center.y + h2, center.z + d2));

  // Create 12 edges
  const edges = [
    new Edge(v0, v1), new Edge(v1, v2), new Edge(v2, v3), new Edge(v3, v0), // Bottom face
    new Edge(v4, v5), new Edge(v5, v6), new Edge(v6, v7), new Edge(v7, v4), // Top face
    new Edge(v0, v4), new Edge(v1, v5), new Edge(v2, v6), new Edge(v3, v7)  // Vertical edges
  ];

  // Create 6 faces (simplified - would need proper NURBS surfaces and loops)
  // This is a placeholder implementation
  const faces: Face[] = [];
  
  // For now, return a simplified solid structure
  // A complete implementation would create proper loops and NURBS surfaces
  const shell = new Shell(faces);
  const solid = new Solid(shell);

  return solid;
}

/**
 * Reset the global ID counter (useful for testing)
 */
export function resetIdCounter(): void {
  globalIdCounter = 0;
}
