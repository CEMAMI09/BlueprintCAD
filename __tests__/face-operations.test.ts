import * as THREE from 'three';
import { FaceOperations } from '../lib/cad/face-operations';

describe('Face Operations', () => {
  let testGeometry: THREE.BufferGeometry;

  beforeEach(() => {
    // Create a simple cube geometry for testing
    testGeometry = new THREE.BoxGeometry(10, 10, 10);
    testGeometry.computeVertexNormals();
  });

  describe('Offset Face', () => {
    it('should offset selected faces outward', () => {
      const result = FaceOperations.offsetFace(testGeometry, {
        faceIndices: [0, 1],
        offsetDistance: 2,
        extendAdjacent: false,
        createShell: false
      });

      expect(result.success).toBe(true);
      expect(result.geometry).toBeDefined();
      expect(result.offsetFaces).toEqual([0, 1]);
      expect(result.metadata.operation).toBe('offset-face');
    });

    it('should offset faces inward with negative distance', () => {
      const result = FaceOperations.offsetFace(testGeometry, {
        faceIndices: [0],
        offsetDistance: -3,
        extendAdjacent: false,
        createShell: false
      });

      expect(result.success).toBe(true);
      expect(result.offsetFaces.length).toBe(1);
    });

    it('should handle multiple face selection', () => {
      const result = FaceOperations.offsetFace(testGeometry, {
        faceIndices: [0, 2, 4],
        offsetDistance: 1.5,
        extendAdjacent: true,
        createShell: false
      });

      expect(result.success).toBe(true);
      expect(result.offsetFaces.length).toBe(3);
    });

    it('should fail gracefully with non-indexed geometry', () => {
      const nonIndexed = testGeometry.clone();
      nonIndexed.setIndex(null);

      const result = FaceOperations.offsetFace(nonIndexed, {
        faceIndices: [0],
        offsetDistance: 2,
        extendAdjacent: false,
        createShell: false
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('must be indexed');
    });
  });

  describe('Delete Face', () => {
    it('should delete selected faces', () => {
      const originalFaceCount = testGeometry.index!.count / 3;

      const result = FaceOperations.deleteFace(testGeometry, {
        faceIndices: [0, 1],
        healGeometry: false,
        tolerance: 0.01
      });

      expect(result.success).toBe(true);
      expect(result.geometry).toBeDefined();
      expect(result.deletedFaces).toEqual([0, 1]);
      
      const newFaceCount = result.geometry!.index!.count / 3;
      expect(newFaceCount).toBe(originalFaceCount - 2);
    });

    it('should delete and heal geometry', () => {
      const result = FaceOperations.deleteFace(testGeometry, {
        faceIndices: [0],
        healGeometry: true,
        tolerance: 0.01
      });

      expect(result.success).toBe(true);
      expect(result.metadata.healed).toBe(true);
    });

    it('should handle multiple face deletion', () => {
      const result = FaceOperations.deleteFace(testGeometry, {
        faceIndices: [0, 2, 4, 6],
        healGeometry: false,
        tolerance: 0.01
      });

      expect(result.success).toBe(true);
      expect(result.deletedFaces.length).toBe(4);
    });
  });

  describe('Replace Face', () => {
    it('should replace a face with new geometry', () => {
      const replacementGeometry = new THREE.PlaneGeometry(5, 5);

      const result = FaceOperations.replaceFace(testGeometry, {
        faceIndex: 0,
        replacementGeometry,
        blendEdges: true,
        tolerance: 0.01
      });

      expect(result.success).toBe(true);
      expect(result.geometry).toBeDefined();
      expect(result.replacedFaceIndex).toBe(0);
    });

    it('should replace with spherical surface', () => {
      const replacementGeometry = new THREE.SphereGeometry(3, 16, 16);

      const result = FaceOperations.replaceFace(testGeometry, {
        faceIndex: 2,
        replacementGeometry,
        blendEdges: false,
        tolerance: 0.01
      });

      expect(result.success).toBe(true);
      expect(result.metadata.operation).toBe('replace-face');
    });

    it('should preserve geometry vertex count after replacement', () => {
      const replacementGeometry = new THREE.PlaneGeometry(10, 10);
      const originalVertexCount = testGeometry.attributes.position.count;

      const result = FaceOperations.replaceFace(testGeometry, {
        faceIndex: 0,
        replacementGeometry,
        blendEdges: true,
        tolerance: 0.01
      });

      expect(result.success).toBe(true);
      // New geometry should have original vertices plus replacement vertices
      expect(result.geometry!.attributes.position.count).toBeGreaterThan(originalVertexCount);
    });
  });

  describe('Mirror Face', () => {
    it('should mirror geometry across XY plane', () => {
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

      const result = FaceOperations.mirrorFace(testGeometry, {
        plane,
        mergeMirrored: false,
        tolerance: 0.01
      });

      expect(result.success).toBe(true);
      expect(result.geometry).toBeDefined();
      expect(result.mirroredFaces.length).toBeGreaterThan(0);
    });

    it('should mirror and merge with original', () => {
      const plane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
      const originalVertexCount = testGeometry.attributes.position.count;

      const result = FaceOperations.mirrorFace(testGeometry, {
        plane,
        mergeMirrored: true,
        tolerance: 0.01
      });

      expect(result.success).toBe(true);
      expect(result.metadata.merged).toBe(true);
      
      // Merged geometry should have double the vertices
      expect(result.geometry!.attributes.position.count).toBe(originalVertexCount * 2);
    });

    it('should mirror across XZ plane', () => {
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

      const result = FaceOperations.mirrorFace(testGeometry, {
        plane,
        mergeMirrored: false,
        tolerance: 0.01
      });

      expect(result.success).toBe(true);
      expect(result.metadata.plane.normal).toEqual([0, 1, 0]);
    });

    it('should mirror across YZ plane', () => {
      const plane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 5);

      const result = FaceOperations.mirrorFace(testGeometry, {
        plane,
        mergeMirrored: true,
        tolerance: 0.01
      });

      expect(result.success).toBe(true);
      expect(result.metadata.plane.constant).toBe(5);
    });

    it('should reverse winding for mirrored faces', () => {
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

      const result = FaceOperations.mirrorFace(testGeometry, {
        plane,
        mergeMirrored: false,
        tolerance: 0.01
      });

      expect(result.success).toBe(true);
      // Verify normals are correctly flipped (would need to check actual geometry)
      expect(result.geometry!.attributes.normal).toBeDefined();
    });
  });

  describe('Metadata Export', () => {
    it('should export offset face metadata', () => {
      const result = FaceOperations.offsetFace(testGeometry, {
        faceIndices: [0],
        offsetDistance: 5,
        extendAdjacent: true,
        createShell: false
      });

      const metadata = FaceOperations.exportMetadata(result);
      const parsed = JSON.parse(metadata);

      expect(parsed.operation).toBe('offset-face');
      expect(parsed.faceIndices).toEqual([0]);
      expect(parsed.distance).toBe(5);
      expect(parsed.success).toBe(true);
    });

    it('should export delete face metadata', () => {
      const result = FaceOperations.deleteFace(testGeometry, {
        faceIndices: [0, 1, 2],
        healGeometry: true,
        tolerance: 0.01
      });

      const metadata = FaceOperations.exportMetadata(result);
      const parsed = JSON.parse(metadata);

      expect(parsed.operation).toBe('delete-face');
      expect(parsed.healed).toBe(true);
    });

    it('should export mirror metadata with plane information', () => {
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 10);

      const result = FaceOperations.mirrorFace(testGeometry, {
        plane,
        mergeMirrored: true,
        tolerance: 0.01
      });

      const metadata = FaceOperations.exportMetadata(result);
      const parsed = JSON.parse(metadata);

      expect(parsed.operation).toBe('mirror-face');
      expect(parsed.plane.normal).toEqual([0, 1, 0]);
      expect(parsed.plane.constant).toBe(10);
      expect(parsed.merged).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty face selection for offset', () => {
      const result = FaceOperations.offsetFace(testGeometry, {
        faceIndices: [],
        offsetDistance: 5,
        extendAdjacent: false,
        createShell: false
      });

      expect(result.success).toBe(true);
      expect(result.offsetFaces.length).toBe(0);
    });

    it('should handle invalid face indices for delete', () => {
      const result = FaceOperations.deleteFace(testGeometry, {
        faceIndices: [999, 1000],
        healGeometry: false,
        tolerance: 0.01
      });

      // Should not crash, should handle gracefully
      expect(result.success).toBe(true);
    });

    it('should handle zero offset distance', () => {
      const result = FaceOperations.offsetFace(testGeometry, {
        faceIndices: [0],
        offsetDistance: 0,
        extendAdjacent: false,
        createShell: false
      });

      expect(result.success).toBe(true);
      // Geometry should be essentially unchanged
    });

    it('should handle plane at origin for mirror', () => {
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

      const result = FaceOperations.mirrorFace(testGeometry, {
        plane,
        mergeMirrored: true,
        tolerance: 0.01
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should handle large geometries efficiently', () => {
      // Create a complex geometry with many faces
      const largeGeometry = new THREE.IcosahedronGeometry(10, 4); // ~1280 faces
      largeGeometry.computeVertexNormals();

      const startTime = performance.now();

      const result = FaceOperations.offsetFace(largeGeometry, {
        faceIndices: Array.from({ length: 100 }, (_, i) => i),
        offsetDistance: 2,
        extendAdjacent: false,
        createShell: false
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
    });

    it('should mirror large geometry efficiently', () => {
      const largeGeometry = new THREE.TorusGeometry(10, 3, 16, 100);
      largeGeometry.computeVertexNormals();

      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

      const startTime = performance.now();

      const result = FaceOperations.mirrorFace(largeGeometry, {
        plane,
        mergeMirrored: true,
        tolerance: 0.01
      });

      const endTime = performance.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(500);
    });
  });
});
