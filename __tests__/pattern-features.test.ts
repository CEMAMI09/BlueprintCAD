import * as THREE from 'three';
import { PatternFeatures, LinearPatternOptions, CircularPatternOptions } from '../lib/cad/pattern-features';

describe('PatternFeatures', () => {
  let testGeometry: THREE.BufferGeometry;
  let testMaterial: THREE.Material;

  beforeEach(() => {
    // Create a simple box geometry for testing
    testGeometry = new THREE.BoxGeometry(10, 10, 10);
    testMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
  });

  afterEach(() => {
    testGeometry.dispose();
    testMaterial.dispose();
  });

  describe('createLinearPattern', () => {
    it('should create correct number of instances', () => {
      const options: LinearPatternOptions = {
        direction: 'x',
        distance: 20,
        count: 5,
        suppressedInstances: [],
        patternType: 'geometry'
      };

      const result = PatternFeatures.createLinearPattern(testGeometry, testMaterial, options);

      expect(result.success).toBe(true);
      expect(result.instances.length).toBe(5);
      expect(result.totalInstances).toBe(5);
      expect(result.suppressedCount).toBe(0);
    });

    it('should position instances correctly along X axis', () => {
      const options: LinearPatternOptions = {
        direction: 'x',
        distance: 15,
        count: 4,
        suppressedInstances: [],
        patternType: 'geometry'
      };

      const result = PatternFeatures.createLinearPattern(testGeometry, testMaterial, options);

      expect(result.instances[0].position.x).toBe(0);
      expect(result.instances[1].position.x).toBe(15);
      expect(result.instances[2].position.x).toBe(30);
      expect(result.instances[3].position.x).toBe(45);
    });

    it('should position instances correctly along Y axis', () => {
      const options: LinearPatternOptions = {
        direction: 'y',
        distance: 10,
        count: 3,
        suppressedInstances: [],
        patternType: 'geometry'
      };

      const result = PatternFeatures.createLinearPattern(testGeometry, testMaterial, options);

      expect(result.instances[0].position.y).toBe(0);
      expect(result.instances[1].position.y).toBe(10);
      expect(result.instances[2].position.y).toBe(20);
    });

    it('should position instances correctly along Z axis', () => {
      const options: LinearPatternOptions = {
        direction: 'z',
        distance: 25,
        count: 3,
        suppressedInstances: [],
        patternType: 'geometry'
      };

      const result = PatternFeatures.createLinearPattern(testGeometry, testMaterial, options);

      expect(result.instances[0].position.z).toBe(0);
      expect(result.instances[1].position.z).toBe(25);
      expect(result.instances[2].position.z).toBe(50);
    });

    it('should skip suppressed instances', () => {
      const options: LinearPatternOptions = {
        direction: 'x',
        distance: 10,
        count: 6,
        suppressedInstances: [1, 3, 5],
        patternType: 'geometry'
      };

      const result = PatternFeatures.createLinearPattern(testGeometry, testMaterial, options);

      expect(result.instances.length).toBe(3); // Only instances 0, 2, 4 created
      expect(result.suppressedCount).toBe(3);
      expect(result.totalInstances).toBe(6);
      
      // Check positions of created instances
      expect(result.instances[0].position.x).toBe(0);  // Instance 0
      expect(result.instances[1].position.x).toBe(20); // Instance 2
      expect(result.instances[2].position.x).toBe(40); // Instance 4
    });

    it('should use custom direction vector', () => {
      const options: LinearPatternOptions = {
        direction: new THREE.Vector3(1, 1, 0).normalize(),
        distance: 10,
        count: 2,
        suppressedInstances: [],
        patternType: 'geometry'
      };

      const result = PatternFeatures.createLinearPattern(testGeometry, testMaterial, options);

      const expectedOffset = new THREE.Vector3(1, 1, 0).normalize().multiplyScalar(10);
      
      expect(result.instances[0].position.x).toBeCloseTo(0);
      expect(result.instances[0].position.y).toBeCloseTo(0);
      expect(result.instances[1].position.x).toBeCloseTo(expectedOffset.x, 5);
      expect(result.instances[1].position.y).toBeCloseTo(expectedOffset.y, 5);
    });

    it('should handle single instance pattern', () => {
      const options: LinearPatternOptions = {
        direction: 'x',
        distance: 10,
        count: 1,
        suppressedInstances: [],
        patternType: 'geometry'
      };

      const result = PatternFeatures.createLinearPattern(testGeometry, testMaterial, options);

      expect(result.instances.length).toBe(1);
      expect(result.instances[0].position.x).toBe(0);
    });

    it('should calculate bounding box correctly', () => {
      const options: LinearPatternOptions = {
        direction: 'x',
        distance: 20,
        count: 3,
        suppressedInstances: [],
        patternType: 'geometry'
      };

      const result = PatternFeatures.createLinearPattern(testGeometry, testMaterial, options);

      expect(result.boundingBox).toBeDefined();
      expect(result.boundingBox!.min.x).toBeLessThan(result.boundingBox!.max.x);
    });
  });

  describe('createCircularPattern', () => {
    it('should create correct number of instances', () => {
      const options: CircularPatternOptions = {
        axis: 'z',
        center: new THREE.Vector3(0, 0, 0),
        angle: 360,
        count: 8,
        equalSpacing: true,
        suppressedInstances: [],
        patternType: 'geometry'
      };

      const result = PatternFeatures.createCircularPattern(testGeometry, testMaterial, options);

      expect(result.success).toBe(true);
      expect(result.instances.length).toBe(8);
      expect(result.totalInstances).toBe(8);
    });

    it('should rotate instances around Z axis', () => {
      const options: CircularPatternOptions = {
        axis: 'z',
        center: new THREE.Vector3(0, 0, 0),
        angle: 360,
        count: 4,
        equalSpacing: true,
        suppressedInstances: [],
        patternType: 'geometry'
      };

      const result = PatternFeatures.createCircularPattern(testGeometry, testMaterial, options);

      // First instance at 0°
      expect(result.instances[0].rotation.z).toBeCloseTo(0, 5);
      
      // Second instance at 90°
      const expectedAngle90 = Math.PI / 2;
      expect(result.instances[1].rotation.z).toBeCloseTo(expectedAngle90, 5);
      
      // Third instance at 180°
      const expectedAngle180 = Math.PI;
      expect(result.instances[2].rotation.z).toBeCloseTo(expectedAngle180, 5);
      
      // Fourth instance at 270°
      const expectedAngle270 = (3 * Math.PI) / 2;
      expect(result.instances[3].rotation.z).toBeCloseTo(expectedAngle270, 5);
    });

    it('should rotate instances around X axis', () => {
      const options: CircularPatternOptions = {
        axis: 'x',
        center: new THREE.Vector3(0, 0, 0),
        angle: 180,
        count: 3,
        equalSpacing: true,
        suppressedInstances: [],
        patternType: 'geometry'
      };

      const result = PatternFeatures.createCircularPattern(testGeometry, testMaterial, options);

      expect(result.instances.length).toBe(3);
      expect(result.instances[0].rotation.x).toBeCloseTo(0, 5);
      expect(result.instances[1].rotation.x).toBeCloseTo(Math.PI / 2, 5);
      expect(result.instances[2].rotation.x).toBeCloseTo(Math.PI, 5);
    });

    it('should rotate instances around Y axis', () => {
      const options: CircularPatternOptions = {
        axis: 'y',
        center: new THREE.Vector3(0, 0, 0),
        angle: 90,
        count: 2,
        equalSpacing: true,
        suppressedInstances: [],
        patternType: 'geometry'
      };

      const result = PatternFeatures.createCircularPattern(testGeometry, testMaterial, options);

      expect(result.instances.length).toBe(2);
      expect(result.instances[0].rotation.y).toBeCloseTo(0, 5);
      expect(result.instances[1].rotation.y).toBeCloseTo(Math.PI / 2, 5);
    });

    it('should handle partial rotation (90 degrees)', () => {
      const options: CircularPatternOptions = {
        axis: 'z',
        center: new THREE.Vector3(0, 0, 0),
        angle: 90,
        count: 3,
        equalSpacing: true,
        suppressedInstances: [],
        patternType: 'geometry'
      };

      const result = PatternFeatures.createCircularPattern(testGeometry, testMaterial, options);

      expect(result.instances[0].rotation.z).toBeCloseTo(0, 5);
      expect(result.instances[1].rotation.z).toBeCloseTo(Math.PI / 4, 5); // 45°
      expect(result.instances[2].rotation.z).toBeCloseTo(Math.PI / 2, 5); // 90°
    });

    it('should skip suppressed instances', () => {
      const options: CircularPatternOptions = {
        axis: 'z',
        center: new THREE.Vector3(0, 0, 0),
        angle: 360,
        count: 6,
        equalSpacing: true,
        suppressedInstances: [0, 2, 4],
        patternType: 'geometry'
      };

      const result = PatternFeatures.createCircularPattern(testGeometry, testMaterial, options);

      expect(result.instances.length).toBe(3); // Only instances 1, 3, 5 created
      expect(result.suppressedCount).toBe(3);
      expect(result.totalInstances).toBe(6);
    });

    it('should rotate around custom center point', () => {
      const centerPoint = new THREE.Vector3(10, 20, 30);
      const options: CircularPatternOptions = {
        axis: 'z',
        center: centerPoint,
        angle: 360,
        count: 2,
        equalSpacing: true,
        suppressedInstances: [],
        patternType: 'geometry'
      };

      const result = PatternFeatures.createCircularPattern(testGeometry, testMaterial, options);

      // First instance should be at center
      expect(result.instances[0].position.x).toBeCloseTo(centerPoint.x, 5);
      expect(result.instances[0].position.y).toBeCloseTo(centerPoint.y, 5);
      expect(result.instances[0].position.z).toBeCloseTo(centerPoint.z, 5);
    });

    it('should handle equalSpacing = false', () => {
      const options: CircularPatternOptions = {
        axis: 'z',
        center: new THREE.Vector3(0, 0, 0),
        angle: 120,
        count: 4,
        equalSpacing: false,
        suppressedInstances: [],
        patternType: 'geometry'
      };

      const result = PatternFeatures.createCircularPattern(testGeometry, testMaterial, options);

      // With equalSpacing=false, instances should be spaced by the full angle
      expect(result.instances[0].rotation.z).toBeCloseTo(0, 5);
      expect(result.instances[1].rotation.z).toBeCloseTo((120 * Math.PI) / 180, 5);
      expect(result.instances[2].rotation.z).toBeCloseTo((240 * Math.PI) / 180, 5);
      expect(result.instances[3].rotation.z).toBeCloseTo((360 * Math.PI) / 180, 5);
    });

    it('should use custom axis vector', () => {
      const customAxis = new THREE.Vector3(1, 1, 0).normalize();
      const options: CircularPatternOptions = {
        axis: customAxis,
        center: new THREE.Vector3(0, 0, 0),
        angle: 180,
        count: 2,
        equalSpacing: true,
        suppressedInstances: [],
        patternType: 'geometry'
      };

      const result = PatternFeatures.createCircularPattern(testGeometry, testMaterial, options);

      expect(result.instances.length).toBe(2);
      expect(result.success).toBe(true);
    });
  });

  describe('validatePatternOptions', () => {
    it('should accept valid linear pattern options', () => {
      const options: LinearPatternOptions = {
        direction: 'x',
        distance: 10,
        count: 5,
        suppressedInstances: [],
        patternType: 'geometry'
      };

      const validation = PatternFeatures.validatePatternOptions(options);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject zero distance in linear pattern', () => {
      const options: LinearPatternOptions = {
        direction: 'x',
        distance: 0,
        count: 5,
        suppressedInstances: [],
        patternType: 'geometry'
      };

      const validation = PatternFeatures.validatePatternOptions(options);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Distance must be non-zero');
    });

    it('should reject zero vector direction', () => {
      const options: LinearPatternOptions = {
        direction: new THREE.Vector3(0, 0, 0),
        distance: 10,
        count: 5,
        suppressedInstances: [],
        patternType: 'geometry'
      };

      const validation = PatternFeatures.validatePatternOptions(options);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Direction vector cannot be zero');
    });

    it('should reject count < 1', () => {
      const options: LinearPatternOptions = {
        direction: 'x',
        distance: 10,
        count: 0,
        suppressedInstances: [],
        patternType: 'geometry'
      };

      const validation = PatternFeatures.validatePatternOptions(options);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Count must be at least 1');
    });

    it('should reject count > 1000', () => {
      const options: LinearPatternOptions = {
        direction: 'x',
        distance: 10,
        count: 1500,
        suppressedInstances: [],
        patternType: 'geometry'
      };

      const validation = PatternFeatures.validatePatternOptions(options);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Count cannot exceed 1000 (performance limit)');
    });

    it('should reject invalid suppressed indices', () => {
      const options: LinearPatternOptions = {
        direction: 'x',
        distance: 10,
        count: 5,
        suppressedInstances: [0, 2, 10], // 10 is out of range
        patternType: 'geometry'
      };

      const validation = PatternFeatures.validatePatternOptions(options);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(err => err.includes('Suppressed index 10'))).toBe(true);
    });

    it('should accept valid circular pattern options', () => {
      const options: CircularPatternOptions = {
        axis: 'z',
        center: new THREE.Vector3(0, 0, 0),
        angle: 360,
        count: 8,
        equalSpacing: true,
        suppressedInstances: [],
        patternType: 'geometry'
      };

      const validation = PatternFeatures.validatePatternOptions(options);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject zero angle in circular pattern', () => {
      const options: CircularPatternOptions = {
        axis: 'z',
        center: new THREE.Vector3(0, 0, 0),
        angle: 0,
        count: 4,
        equalSpacing: true,
        suppressedInstances: [],
        patternType: 'geometry'
      };

      const validation = PatternFeatures.validatePatternOptions(options);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Angle must be non-zero');
    });

    it('should reject zero axis vector in circular pattern', () => {
      const options: CircularPatternOptions = {
        axis: new THREE.Vector3(0, 0, 0),
        center: new THREE.Vector3(0, 0, 0),
        angle: 90,
        count: 4,
        equalSpacing: true,
        suppressedInstances: [],
        patternType: 'geometry'
      };

      const validation = PatternFeatures.validatePatternOptions(options);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Axis vector cannot be zero');
    });
  });

  describe('updatePatternSuppression', () => {
    it('should suppress specified instances', () => {
      const options: LinearPatternOptions = {
        direction: 'x',
        distance: 10,
        count: 5,
        suppressedInstances: [],
        patternType: 'geometry'
      };

      const result = PatternFeatures.createLinearPattern(testGeometry, testMaterial, options);

      PatternFeatures.updatePatternSuppression(result.instances, new Set([0, 2, 4]));

      expect(result.instances[0].visible).toBe(false);
      expect(result.instances[1].visible).toBe(true);
      expect(result.instances[2].visible).toBe(false);
    });

    it('should unsuppress instances not in suppression set', () => {
      const options: LinearPatternOptions = {
        direction: 'x',
        distance: 10,
        count: 5,
        suppressedInstances: [1, 3],
        patternType: 'geometry'
      };

      const result = PatternFeatures.createLinearPattern(testGeometry, testMaterial, options);

      // Initially only 0, 2, 4 are created (1, 3 suppressed)
      // Now update suppression to only suppress 0
      PatternFeatures.updatePatternSuppression(result.instances, new Set([0]));

      expect(result.instances[0].visible).toBe(false);
      expect(result.instances[1].visible).toBe(true);
      expect(result.instances[2].visible).toBe(true);
    });
  });

  describe('exportMetadata', () => {
    it('should export linear pattern metadata', () => {
      const options: LinearPatternOptions = {
        direction: 'x',
        distance: 15,
        count: 4,
        suppressedInstances: [1],
        patternType: 'geometry'
      };

      const result = PatternFeatures.createLinearPattern(testGeometry, testMaterial, options);
      const metadata = JSON.parse(PatternFeatures.exportMetadata(result, options));

      expect(metadata.type).toBe('linear-pattern');
      expect(metadata.options.direction).toBe('x');
      expect(metadata.options.distance).toBe(15);
      expect(metadata.options.count).toBe(4);
      expect(metadata.options.suppressedInstances).toEqual([1]);
      expect(metadata.result.totalInstances).toBe(4);
      expect(metadata.result.suppressedCount).toBe(1);
    });

    it('should export circular pattern metadata', () => {
      const options: CircularPatternOptions = {
        axis: 'z',
        center: new THREE.Vector3(5, 10, 15),
        angle: 180,
        count: 6,
        equalSpacing: true,
        suppressedInstances: [],
        patternType: 'feature'
      };

      const result = PatternFeatures.createCircularPattern(testGeometry, testMaterial, options);
      const metadata = JSON.parse(PatternFeatures.exportMetadata(result, options));

      expect(metadata.type).toBe('circular-pattern');
      expect(metadata.options.axis).toBe('z');
      expect(metadata.options.center).toEqual({ x: 5, y: 10, z: 15 });
      expect(metadata.options.angle).toBe(180);
      expect(metadata.options.equalSpacing).toBe(true);
      expect(metadata.options.patternType).toBe('feature');
    });
  });

  describe('estimateMemoryUsage', () => {
    it('should estimate memory for linear pattern', () => {
      const geometrySize = 1000; // bytes
      const options: LinearPatternOptions = {
        direction: 'x',
        distance: 10,
        count: 10,
        suppressedInstances: [1, 3, 5],
        patternType: 'geometry'
      };

      const memory = PatternFeatures.estimateMemoryUsage(geometrySize, options);

      const activeInstances = 10 - 3; // 7 active
      const expected = geometrySize * activeInstances + 64 * 10;
      
      expect(memory).toBe(expected);
    });

    it('should estimate memory for circular pattern', () => {
      const geometrySize = 2000; // bytes
      const options: CircularPatternOptions = {
        axis: 'z',
        center: new THREE.Vector3(0, 0, 0),
        angle: 360,
        count: 20,
        equalSpacing: true,
        suppressedInstances: [],
        patternType: 'geometry'
      };

      const memory = PatternFeatures.estimateMemoryUsage(geometrySize, options);

      const expected = geometrySize * 20 + 64 * 20;
      
      expect(memory).toBe(expected);
    });
  });

  describe('Performance', () => {
    it('should create 100 instances in reasonable time', () => {
      const options: LinearPatternOptions = {
        direction: 'x',
        distance: 10,
        count: 100,
        suppressedInstances: [],
        patternType: 'geometry'
      };

      const startTime = performance.now();
      const result = PatternFeatures.createLinearPattern(testGeometry, testMaterial, options);
      const endTime = performance.now();

      expect(result.instances.length).toBe(100);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should create 50 rotated instances in reasonable time', () => {
      const options: CircularPatternOptions = {
        axis: 'z',
        center: new THREE.Vector3(0, 0, 0),
        angle: 360,
        count: 50,
        equalSpacing: true,
        suppressedInstances: [],
        patternType: 'geometry'
      };

      const startTime = performance.now();
      const result = PatternFeatures.createCircularPattern(testGeometry, testMaterial, options);
      const endTime = performance.now();

      expect(result.instances.length).toBe(50);
      expect(endTime - startTime).toBeLessThan(150); // Should complete in under 150ms
    });
  });
});
