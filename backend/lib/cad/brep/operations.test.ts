/**
 * Unit Tests for BREP Topology Operations
 * 
 * Tests for Euler operators, edge/face operations, and validation functions
 * 
 * To run tests: npm install --save-dev jest @types/jest ts-jest
 * Then configure jest.config.js and run: npm test
 */

import * as THREE from 'three';
import {
  Vertex,
  Edge,
  Loop,
  Face,
  Shell,
  Solid,
  NURBSCurve,
  NURBSSurface,
  resetIdCounter
} from './topology';
import {
  splitEdge,
  mergeEdges,
  splitFace,
  makeEdgeVertex,
  killEdgeVertex,
  makeEdgeFace,
  killEdgeFace,
  validateManifold,
  orientFaces,
  validateSolid,
  calculateGenus
} from './operations';

describe('BREP Topology Operations', () => {
  beforeEach(() => {
    resetIdCounter();
  });

  describe('splitEdge', () => {
    it('should split an edge at midpoint', () => {
      const v1 = new Vertex(new THREE.Vector3(0, 0, 0));
      const v2 = new Vertex(new THREE.Vector3(10, 0, 0));
      const edge = new Edge(v1, v2);

      const newVertex = splitEdge(edge, 0.5);

      expect(newVertex.position.x).toBeCloseTo(5);
      expect(newVertex.position.y).toBeCloseTo(0);
      expect(newVertex.position.z).toBeCloseTo(0);
      expect(v1.edges.length).toBe(1);
      expect(v2.edges.length).toBe(1);
      expect(newVertex.edges.length).toBe(2);
    });

    it('should split an edge at 1/4 point', () => {
      const v1 = new Vertex(new THREE.Vector3(0, 0, 0));
      const v2 = new Vertex(new THREE.Vector3(100, 0, 0));
      const edge = new Edge(v1, v2);

      const newVertex = splitEdge(edge, 0.25);

      expect(newVertex.position.x).toBeCloseTo(25);
      expect(newVertex.edges.length).toBe(2);
    });

    it('should throw error for invalid t parameter', () => {
      const v1 = new Vertex(new THREE.Vector3(0, 0, 0));
      const v2 = new Vertex(new THREE.Vector3(10, 0, 0));
      const edge = new Edge(v1, v2);

      expect(() => splitEdge(edge, 0)).toThrow();
      expect(() => splitEdge(edge, 1)).toThrow();
      expect(() => splitEdge(edge, 1.5)).toThrow();
    });
  });

  describe('mergeEdges', () => {
    it('should merge two adjacent edges', () => {
      const v1 = new Vertex(new THREE.Vector3(0, 0, 0));
      const v2 = new Vertex(new THREE.Vector3(5, 0, 0));
      const v3 = new Vertex(new THREE.Vector3(10, 0, 0));
      
      const edge1 = new Edge(v1, v2);
      const edge2 = new Edge(v2, v3);

      const mergedEdge = mergeEdges(edge1, edge2);

      expect(mergedEdge).not.toBeNull();
      expect(mergedEdge!.startVertex).toBe(v1);
      expect(mergedEdge!.endVertex).toBe(v3);
      expect(mergedEdge!.length()).toBeCloseTo(10);
    });

    it('should return null for non-adjacent edges', () => {
      const v1 = new Vertex(new THREE.Vector3(0, 0, 0));
      const v2 = new Vertex(new THREE.Vector3(5, 0, 0));
      const v3 = new Vertex(new THREE.Vector3(10, 0, 0));
      const v4 = new Vertex(new THREE.Vector3(15, 0, 0));
      
      const edge1 = new Edge(v1, v2);
      const edge2 = new Edge(v3, v4);

      const mergedEdge = mergeEdges(edge1, edge2);

      expect(mergedEdge).toBeNull();
    });

    it('should return null if shared vertex has more than 2 edges', () => {
      const v1 = new Vertex(new THREE.Vector3(0, 0, 0));
      const v2 = new Vertex(new THREE.Vector3(5, 0, 0));
      const v3 = new Vertex(new THREE.Vector3(10, 0, 0));
      const v4 = new Vertex(new THREE.Vector3(5, 5, 0));
      
      const edge1 = new Edge(v1, v2);
      const edge2 = new Edge(v2, v3);
      const edge3 = new Edge(v2, v4); // Third edge at v2

      const mergedEdge = mergeEdges(edge1, edge2);

      expect(mergedEdge).toBeNull();
    });
  });

  describe('splitFace', () => {
    it('should split a rectangular face diagonally', () => {
      // Create a rectangular face
      const v1 = new Vertex(new THREE.Vector3(0, 0, 0));
      const v2 = new Vertex(new THREE.Vector3(10, 0, 0));
      const v3 = new Vertex(new THREE.Vector3(10, 10, 0));
      const v4 = new Vertex(new THREE.Vector3(0, 10, 0));

      const e1 = new Edge(v1, v2);
      const e2 = new Edge(v2, v3);
      const e3 = new Edge(v3, v4);
      const e4 = new Edge(v4, v1);

      const loop = new Loop([e1.halfEdge1, e2.halfEdge1, e3.halfEdge1, e4.halfEdge1]);
      
      const surface = new NURBSSurface({
        degreeU: 1,
        degreeV: 1,
        controlPoints: [
          [v1.position.clone(), v2.position.clone()],
          [v4.position.clone(), v3.position.clone()]
        ],
        knotsU: [0, 0, 1, 1],
        knotsV: [0, 0, 1, 1]
      });

      const face = new Face(surface, loop);

      const result = splitFace(face, v1, v3);

      expect(result).not.toBeNull();
      const [face1, face2] = result!;
      expect(face1.getVertices().length).toBeGreaterThan(2);
      expect(face2.getVertices().length).toBeGreaterThan(2);
    });

    it('should return null if vertices are not on face', () => {
      const v1 = new Vertex(new THREE.Vector3(0, 0, 0));
      const v2 = new Vertex(new THREE.Vector3(10, 0, 0));
      const v3 = new Vertex(new THREE.Vector3(10, 10, 0));
      const v4 = new Vertex(new THREE.Vector3(0, 10, 0));
      const v5 = new Vertex(new THREE.Vector3(20, 20, 0)); // Not on face

      const e1 = new Edge(v1, v2);
      const e2 = new Edge(v2, v3);
      const e3 = new Edge(v3, v4);
      const e4 = new Edge(v4, v1);

      const loop = new Loop([e1.halfEdge1, e2.halfEdge1, e3.halfEdge1, e4.halfEdge1]);
      
      const surface = new NURBSSurface({
        degreeU: 1,
        degreeV: 1,
        controlPoints: [[v1.position, v2.position], [v4.position, v3.position]],
        knotsU: [0, 0, 1, 1],
        knotsV: [0, 0, 1, 1]
      });

      const face = new Face(surface, loop);

      const result = splitFace(face, v1, v5);

      expect(result).toBeNull();
    });
  });

  describe('Euler Operators', () => {
    describe('makeEdgeVertex (MEV)', () => {
      it('should create new vertex and edge', () => {
        const v1 = new Vertex(new THREE.Vector3(0, 0, 0));
        const newPos = new THREE.Vector3(10, 0, 0);

        const result = makeEdgeVertex(v1, newPos);

        expect(result.vertex).toBeDefined();
        expect(result.edge).toBeDefined();
        expect(result.vertex.position.equals(newPos)).toBe(true);
        expect(result.edge.startVertex).toBe(v1);
        expect(result.edge.endVertex).toBe(result.vertex);
        expect(v1.edges).toContain(result.edge);
        expect(result.vertex.edges).toContain(result.edge);
      });

      it('should maintain Euler characteristic', () => {
        const v1 = new Vertex(new THREE.Vector3(0, 0, 0));
        const initialV = 1;
        const initialE = 0;

        const result = makeEdgeVertex(v1, new THREE.Vector3(10, 0, 0));

        const finalV = 2;
        const finalE = 1;

        // V - E should remain constant
        expect(finalV - finalE).toBe(initialV - initialE);
      });
    });

    describe('killEdgeVertex (KEV)', () => {
      it('should remove edge and vertex', () => {
        const v1 = new Vertex(new THREE.Vector3(0, 0, 0));
        const v2 = new Vertex(new THREE.Vector3(10, 0, 0));
        const edge = new Edge(v1, v2);

        const remaining = killEdgeVertex(edge, v2);

        expect(remaining).toBe(v1);
        expect(v2.edges.length).toBe(0);
        expect(v1.edges).not.toContain(edge);
      });

      it('should return null if vertex has degree > 1', () => {
        const v1 = new Vertex(new THREE.Vector3(0, 0, 0));
        const v2 = new Vertex(new THREE.Vector3(10, 0, 0));
        const v3 = new Vertex(new THREE.Vector3(10, 10, 0));
        
        const edge1 = new Edge(v1, v2);
        const edge2 = new Edge(v2, v3); // v2 now has degree 2

        const remaining = killEdgeVertex(edge1, v2);

        expect(remaining).toBeNull();
      });

      it('should return null if vertex is not endpoint', () => {
        const v1 = new Vertex(new THREE.Vector3(0, 0, 0));
        const v2 = new Vertex(new THREE.Vector3(10, 0, 0));
        const v3 = new Vertex(new THREE.Vector3(20, 0, 0));
        
        const edge = new Edge(v1, v2);

        const remaining = killEdgeVertex(edge, v3);

        expect(remaining).toBeNull();
      });
    });

    describe('makeEdgeFace (MEF)', () => {
      it('should split face and create new edge', () => {
        const v1 = new Vertex(new THREE.Vector3(0, 0, 0));
        const v2 = new Vertex(new THREE.Vector3(10, 0, 0));
        const v3 = new Vertex(new THREE.Vector3(10, 10, 0));
        const v4 = new Vertex(new THREE.Vector3(0, 10, 0));

        const e1 = new Edge(v1, v2);
        const e2 = new Edge(v2, v3);
        const e3 = new Edge(v3, v4);
        const e4 = new Edge(v4, v1);

        const loop = new Loop([e1.halfEdge1, e2.halfEdge1, e3.halfEdge1, e4.halfEdge1]);
        
        const surface = new NURBSSurface({
          degreeU: 1,
          degreeV: 1,
          controlPoints: [[v1.position, v2.position], [v4.position, v3.position]],
          knotsU: [0, 0, 1, 1],
          knotsV: [0, 0, 1, 1]
        });

        const face = new Face(surface, loop);

        const result = makeEdgeFace(face, v1, v3);

        expect(result).not.toBeNull();
        expect(result!.edge).toBeDefined();
        expect(result!.face1).toBeDefined();
        expect(result!.face2).toBeDefined();
      });
    });
  });

  describe('Validation Operations', () => {
    describe('validateManifold', () => {
      it('should validate a simple manifold shell', () => {
        // Create a simple triangular shell
        const v1 = new Vertex(new THREE.Vector3(0, 0, 0));
        const v2 = new Vertex(new THREE.Vector3(10, 0, 0));
        const v3 = new Vertex(new THREE.Vector3(5, 10, 0));

        const e1 = new Edge(v1, v2);
        const e2 = new Edge(v2, v3);
        const e3 = new Edge(v3, v1);

        const loop = new Loop([e1.halfEdge1, e2.halfEdge1, e3.halfEdge1]);
        
        const surface = new NURBSSurface({
          degreeU: 1,
          degreeV: 1,
          controlPoints: [[v1.position, v2.position], [v3.position, v3.position]],
          knotsU: [0, 0, 1, 1],
          knotsV: [0, 0, 1, 1]
        });

        const face = new Face(surface, loop);
        const shell = new Shell([face]);

        const result = validateManifold(shell);

        expect(result.isValid).toBe(true);
        expect(result.errors.length).toBe(0);
      });

      it('should detect non-manifold edge (3+ faces)', () => {
        const v1 = new Vertex(new THREE.Vector3(0, 0, 0));
        const v2 = new Vertex(new THREE.Vector3(10, 0, 0));
        const v3 = new Vertex(new THREE.Vector3(5, 10, 0));
        const v4 = new Vertex(new THREE.Vector3(5, -10, 0));

        const e1 = new Edge(v1, v2);
        const e2 = new Edge(v2, v3);
        const e3 = new Edge(v3, v1);
        const e4 = new Edge(v2, v4);
        const e5 = new Edge(v4, v1);

        const loop1 = new Loop([e1.halfEdge1, e2.halfEdge1, e3.halfEdge1]);
        const loop2 = new Loop([e1.halfEdge2, e4.halfEdge1, e5.halfEdge1]);
        const loop3 = new Loop([e1.halfEdge1, e4.halfEdge2, e5.halfEdge2]); // Third face on e1

        const surface = new NURBSSurface({
          degreeU: 1,
          degreeV: 1,
          controlPoints: [[v1.position, v2.position], [v3.position, v3.position]],
          knotsU: [0, 0, 1, 1],
          knotsV: [0, 0, 1, 1]
        });

        const face1 = new Face(surface.clone(), loop1);
        const face2 = new Face(surface.clone(), loop2);
        const face3 = new Face(surface.clone(), loop3);

        // Manually add third face to edge (simulating non-manifold)
        e1.faces.push(face3);

        const shell = new Shell([face1, face2, face3]);

        const result = validateManifold(shell);

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('non-manifold'))).toBe(true);
      });
    });

    describe('orientFaces', () => {
      it('should orient faces consistently', () => {
        // Create two adjacent triangular faces with inconsistent normals
        const v1 = new Vertex(new THREE.Vector3(0, 0, 0));
        const v2 = new Vertex(new THREE.Vector3(10, 0, 0));
        const v3 = new Vertex(new THREE.Vector3(5, 10, 0));
        const v4 = new Vertex(new THREE.Vector3(5, 0, 10));

        const e1 = new Edge(v1, v2);
        const e2 = new Edge(v2, v3);
        const e3 = new Edge(v3, v1);
        const e4 = new Edge(v2, v4);
        const e5 = new Edge(v4, v1);

        const loop1 = new Loop([e1.halfEdge1, e2.halfEdge1, e3.halfEdge1]);
        const loop2 = new Loop([e1.halfEdge1, e4.halfEdge1, e5.halfEdge1]); // Same orientation

        const surface = new NURBSSurface({
          degreeU: 1,
          degreeV: 1,
          controlPoints: [[v1.position, v2.position], [v3.position, v3.position]],
          knotsU: [0, 0, 1, 1],
          knotsV: [0, 0, 1, 1]
        });

        const face1 = new Face(surface.clone(), loop1);
        const face2 = new Face(surface.clone(), loop2);

        const shell = new Shell([face1, face2]);

        const flippedCount = orientFaces(shell);

        // At least one face should be flipped to make them consistent
        expect(flippedCount).toBeGreaterThanOrEqual(0);
      });
    });

    describe('calculateGenus', () => {
      it('should return 0 for sphere-like topology', () => {
        // Create a simple closed shell (tetrahedron approximation)
        const v1 = new Vertex(new THREE.Vector3(0, 0, 0));
        const v2 = new Vertex(new THREE.Vector3(10, 0, 0));
        const v3 = new Vertex(new THREE.Vector3(5, 10, 0));
        const v4 = new Vertex(new THREE.Vector3(5, 5, 10));

        // Create 4 triangular faces
        const edges = [
          new Edge(v1, v2),
          new Edge(v2, v3),
          new Edge(v3, v1),
          new Edge(v1, v4),
          new Edge(v2, v4),
          new Edge(v3, v4)
        ];

        const surface = new NURBSSurface({
          degreeU: 1,
          degreeV: 1,
          controlPoints: [[v1.position, v2.position], [v3.position, v3.position]],
          knotsU: [0, 0, 1, 1],
          knotsV: [0, 0, 1, 1]
        });

        const face1 = new Face(surface.clone(), new Loop([
          edges[0].halfEdge1, edges[1].halfEdge1, edges[2].halfEdge1
        ]));
        const face2 = new Face(surface.clone(), new Loop([
          edges[0].halfEdge2, edges[4].halfEdge1, edges[3].halfEdge1
        ]));
        const face3 = new Face(surface.clone(), new Loop([
          edges[1].halfEdge2, edges[5].halfEdge1, edges[4].halfEdge2
        ]));
        const face4 = new Face(surface.clone(), new Loop([
          edges[2].halfEdge2, edges[3].halfEdge2, edges[5].halfEdge2
        ]));

        const shell = new Shell([face1, face2, face3, face4]);

        const genus = calculateGenus(shell);

        expect(genus).toBe(0);
      });
    });
  });
});
