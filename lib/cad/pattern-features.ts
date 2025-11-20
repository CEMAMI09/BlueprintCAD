import * as THREE from 'three';

/**
 * Pattern Features - Linear and Circular Patterns
 * Supports geometry and feature repetition with instance suppression
 */

export interface LinearPatternOptions {
  direction: THREE.Vector3;
  distance: number;
  count: number;
  suppressedInstances: number[]; // Indices of instances to skip (0 = original)
  patternType: 'geometry' | 'feature'; // Pattern geometry or full feature with history
  spacing?: 'uniform' | 'non-uniform'; // Spacing type
  spacingArray?: number[]; // Custom spacing for non-uniform (cumulative distances)
}

export interface CurvePatternOptions {
  curve: THREE.Curve<THREE.Vector3>;
  count: number;
  suppressedInstances: number[];
  patternType: 'geometry' | 'feature';
  alignToTangent: boolean; // Orient instances along curve tangent
  spacing?: 'uniform' | 'non-uniform';
  spacingArray?: number[]; // Custom t-values [0-1] for non-uniform
  offset?: number; // Perpendicular offset from curve
}

export interface FillPatternOptions {
  bounds: THREE.Box3 | THREE.Shape; // Rectangular or arbitrary shape bounds
  spacing: number; // Distance between instances
  fillType: 'rectangular' | 'hexagonal' | 'circular'; // Fill pattern type
  suppressedInstances: number[];
  patternType: 'geometry' | 'feature';
  rotation?: number; // Rotation angle for fill pattern
}

export interface FeaturePatternOptions {
  sourceFeatureId: string;
  patternFeatures: boolean; // If true, pattern the entire feature history
  updateReferences: boolean; // Update feature references in patterns
}

export interface LinearPatternResult {
  success: boolean;
  instances: THREE.Mesh[];
  totalInstances: number;
  suppressedCount: number;
  boundingBox?: THREE.Box3;
  error?: string;
  metadata: {
    operation: 'linear-pattern';
    timestamp: number;
    direction: number[];
    distance: number;
    count: number;
    suppressedInstances: number[];
  };
}

export interface CircularPatternOptions {
  axis: THREE.Vector3;
  center: THREE.Vector3;
  angle: number; // Total angle to cover (360 for full circle)
  count: number;
  suppressedInstances: number[];
  patternType: 'geometry' | 'feature';
  equalSpacing: boolean; // If true, distribute evenly; if false, use angle as spacing
}

export interface CircularPatternResult {
  success: boolean;
  instances: THREE.Mesh[];
  totalInstances: number;
  suppressedCount: number;
  boundingBox?: THREE.Box3;
  error?: string;
  metadata: {
    operation: 'circular-pattern';
    timestamp: number;
    axis: number[];
    center: number[];
    angle: number;
    count: number;
    suppressedInstances: number[];
  };
}

export interface CurvePatternResult {
  success: boolean;
  instances: THREE.Mesh[];
  totalInstances: number;
  suppressedCount: number;
  boundingBox?: THREE.Box3;
  error?: string;
  metadata: {
    operation: 'curve-pattern';
    timestamp: number;
    count: number;
    suppressedInstances: number[];
    alignToTangent: boolean;
  };
}

export interface FillPatternResult {
  success: boolean;
  instances: THREE.Mesh[];
  totalInstances: number;
  suppressedCount: number;
  boundingBox?: THREE.Box3;
  error?: string;
  metadata: {
    operation: 'fill-pattern';
    timestamp: number;
    fillType: string;
    spacing: number;
    instanceCount: number;
  };
}

export interface PatternInstance {
  index: number;
  mesh: THREE.Mesh;
  transform: THREE.Matrix4;
  suppressed: boolean;
  position: THREE.Vector3;
  rotation: THREE.Euler;
}

/**
 * Pattern Features Engine
 */
export class PatternFeatures {
  /**
   * Create a linear pattern along a direction
   */
  static createLinearPattern(
    sourceGeometry: THREE.BufferGeometry | THREE.Mesh,
    material: THREE.Material,
    options: LinearPatternOptions
  ): LinearPatternResult {
    const result: LinearPatternResult = {
      success: false,
      instances: [],
      totalInstances: options.count,
      suppressedCount: options.suppressedInstances.length,
      metadata: {
        operation: 'linear-pattern',
        timestamp: Date.now(),
        direction: options.direction.toArray(),
        distance: options.distance,
        count: options.count,
        suppressedInstances: options.suppressedInstances
      }
    };

    try {
      // Get geometry and initial transform
      let geometry: THREE.BufferGeometry;
      let initialTransform = new THREE.Matrix4();

      if (sourceGeometry instanceof THREE.Mesh) {
        geometry = sourceGeometry.geometry;
        initialTransform = sourceGeometry.matrix.clone();
      } else {
        geometry = sourceGeometry;
      }

      // Normalize direction vector
      const direction = options.direction.clone().normalize();
      const suppressedSet = new Set(options.suppressedInstances);

      // Create instances
      for (let i = 0; i < options.count; i++) {
        // Skip suppressed instances
        if (suppressedSet.has(i)) {
          continue;
        }

        // Calculate offset for this instance
        let offsetDistance: number;
        if (options.spacing === 'non-uniform' && options.spacingArray) {
          // Use custom spacing array
          offsetDistance = options.spacingArray[i] || options.distance * i;
        } else {
          // Uniform spacing
          offsetDistance = options.distance * i;
        }
        
        const offset = direction.clone().multiplyScalar(offsetDistance);

        // Clone geometry for this instance
        const instanceGeometry = geometry.clone();
        const instanceMesh = new THREE.Mesh(instanceGeometry, material);

        // Apply transform
        instanceMesh.matrix.copy(initialTransform);
        instanceMesh.position.copy(offset);
        instanceMesh.updateMatrix();

        // Store metadata
        instanceMesh.userData = {
          patternIndex: i,
          patternType: 'linear',
          patternId: `linear-${Date.now()}-${i}`,
          suppressed: false
        };

        result.instances.push(instanceMesh);
      }

      // Calculate bounding box for all instances
      result.boundingBox = this.calculatePatternBounds(result.instances);
      result.success = true;

      return result;

    } catch (error) {
      result.error = `Linear pattern failed: ${(error as Error).message}`;
      return result;
    }
  }

  /**
   * Create a circular pattern around an axis
   */
  static createCircularPattern(
    sourceGeometry: THREE.BufferGeometry | THREE.Mesh,
    material: THREE.Material,
    options: CircularPatternOptions
  ): CircularPatternResult {
    const result: CircularPatternResult = {
      success: false,
      instances: [],
      totalInstances: options.count,
      suppressedCount: options.suppressedInstances.length,
      metadata: {
        operation: 'circular-pattern',
        timestamp: Date.now(),
        axis: options.axis.toArray(),
        center: options.center.toArray(),
        angle: options.angle,
        count: options.count,
        suppressedInstances: options.suppressedInstances
      }
    };

    try {
      // Get geometry and initial transform
      let geometry: THREE.BufferGeometry;
      let initialTransform = new THREE.Matrix4();

      if (sourceGeometry instanceof THREE.Mesh) {
        geometry = sourceGeometry.geometry;
        initialTransform = sourceGeometry.matrix.clone();
      } else {
        geometry = sourceGeometry;
      }

      // Normalize axis
      const axis = options.axis.clone().normalize();
      const suppressedSet = new Set(options.suppressedInstances);

      // Calculate angle increment
      let angleIncrement: number;
      if (options.equalSpacing) {
        // Distribute evenly over total angle
        angleIncrement = (options.angle * Math.PI / 180) / (options.count - 1);
      } else {
        // Use angle as spacing between instances
        angleIncrement = options.angle * Math.PI / 180;
      }

      // Create instances
      for (let i = 0; i < options.count; i++) {
        // Skip suppressed instances
        if (suppressedSet.has(i)) {
          continue;
        }

        // Calculate rotation angle for this instance
        const rotationAngle = angleIncrement * i;

        // Clone geometry
        const instanceGeometry = geometry.clone();
        const instanceMesh = new THREE.Mesh(instanceGeometry, material);

        // Create rotation matrix around axis through center
        const rotationMatrix = new THREE.Matrix4();
        const quaternion = new THREE.Quaternion();
        quaternion.setFromAxisAngle(axis, rotationAngle);
        rotationMatrix.makeRotationFromQuaternion(quaternion);

        // Apply rotation around center point
        // 1. Translate to origin
        const toOrigin = new THREE.Matrix4().makeTranslation(
          -options.center.x,
          -options.center.y,
          -options.center.z
        );

        // 2. Rotate
        // 3. Translate back
        const fromOrigin = new THREE.Matrix4().makeTranslation(
          options.center.x,
          options.center.y,
          options.center.z
        );

        // Combine transforms
        const transform = new THREE.Matrix4();
        transform.multiply(fromOrigin);
        transform.multiply(rotationMatrix);
        transform.multiply(toOrigin);
        transform.multiply(initialTransform);

        instanceMesh.matrix.copy(transform);
        instanceMesh.matrixAutoUpdate = false;

        // Extract position and rotation for display
        const position = new THREE.Vector3();
        const rotation = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        transform.decompose(position, rotation, scale);

        instanceMesh.position.copy(position);
        instanceMesh.quaternion.copy(rotation);
        instanceMesh.scale.copy(scale);

        // Store metadata
        instanceMesh.userData = {
          patternIndex: i,
          patternType: 'circular',
          patternId: `circular-${Date.now()}-${i}`,
          rotationAngle: rotationAngle * 180 / Math.PI,
          suppressed: false
        };

        result.instances.push(instanceMesh);
      }

      // Calculate bounding box
      result.boundingBox = this.calculatePatternBounds(result.instances);
      result.success = true;

      return result;

    } catch (error) {
      result.error = `Circular pattern failed: ${(error as Error).message}`;
      return result;
    }
  }

  /**
   * Update pattern by suppressing/unsuppressing instances
   */
  static updatePatternSuppression(
    instances: THREE.Mesh[],
    suppressedIndices: number[]
  ): void {
    const suppressedSet = new Set(suppressedIndices);

    for (const instance of instances) {
      const index = instance.userData.patternIndex;
      const shouldSuppress = suppressedSet.has(index);

      instance.visible = !shouldSuppress;
      instance.userData.suppressed = shouldSuppress;
    }
  }

  /**
   * Get pattern instance by index
   */
  static getPatternInstance(
    instances: THREE.Mesh[],
    index: number
  ): THREE.Mesh | null {
    return instances.find(m => m.userData.patternIndex === index) || null;
  }

  /**
   * Calculate total bounding box for pattern
   */
  private static calculatePatternBounds(instances: THREE.Mesh[]): THREE.Box3 {
    const boundingBox = new THREE.Box3();

    for (const instance of instances) {
      if (!instance.userData.suppressed) {
        const instanceBox = new THREE.Box3().setFromObject(instance);
        boundingBox.union(instanceBox);
      }
    }

    return boundingBox;
  }

  /**
   * Export pattern metadata for Blueprint feature tree
   */
  static exportMetadata(
    result: LinearPatternResult | CircularPatternResult,
    additionalParams?: any
  ): string {
    return JSON.stringify({
      ...result.metadata,
      success: result.success,
      totalInstances: result.totalInstances,
      suppressedCount: result.suppressedCount,
      boundingBox: result.boundingBox ? {
        min: result.boundingBox.min.toArray(),
        max: result.boundingBox.max.toArray()
      } : null,
      ...additionalParams
    }, null, 2);
  }

  /**
   * Create linear pattern from feature (includes full history replay)
   */
  static createLinearFeaturePattern(
    sourceFeatureId: string,
    featureTree: any,
    options: LinearPatternOptions
  ): LinearPatternResult {
    // This would replay the feature history for each instance
    // For now, returns a placeholder result
    const result: LinearPatternResult = {
      success: true,
      instances: [],
      totalInstances: options.count,
      suppressedCount: options.suppressedInstances.length,
      metadata: {
        operation: 'linear-pattern',
        timestamp: Date.now(),
        direction: options.direction.toArray(),
        distance: options.distance,
        count: options.count,
        suppressedInstances: options.suppressedInstances
      }
    };

    // Feature pattern logic would go here
    // For each non-suppressed instance:
    //   1. Clone feature with new ID
    //   2. Update feature parameters with offset
    //   3. Add to feature tree
    //   4. Regenerate feature

    return result;
  }

  /**
   * Create circular pattern from feature
   */
  static createCircularFeaturePattern(
    sourceFeatureId: string,
    featureTree: any,
    options: CircularPatternOptions
  ): CircularPatternResult {
    const result: CircularPatternResult = {
      success: true,
      instances: [],
      totalInstances: options.count,
      suppressedCount: options.suppressedInstances.length,
      metadata: {
        operation: 'circular-pattern',
        timestamp: Date.now(),
        axis: options.axis.toArray(),
        center: options.center.toArray(),
        angle: options.angle,
        count: options.count,
        suppressedInstances: options.suppressedInstances
      }
    };

    // Feature pattern logic would go here
    return result;
  }

  /**
   * Generate all possible instance indices
   */
  static getAllInstanceIndices(count: number): number[] {
    return Array.from({ length: count }, (_, i) => i);
  }

  /**
   * Toggle instance suppression
   */
  static toggleInstanceSuppression(
    currentSuppressed: number[],
    index: number
  ): number[] {
    const set = new Set(currentSuppressed);
    
    if (set.has(index)) {
      set.delete(index);
    } else {
      set.add(index);
    }

    return Array.from(set).sort((a, b) => a - b);
  }

  /**
   * Calculate memory usage for pattern
   */
  static estimateMemoryUsage(
    geometrySize: number,
    instanceCount: number,
    suppressedCount: number
  ): number {
    const activeInstances = instanceCount - suppressedCount;
    const geometryMemory = geometrySize * activeInstances;
    const transformMemory = 64 * activeInstances; // Matrix4 + metadata
    return geometryMemory + transformMemory;
  }

  /**
   * Validate pattern parameters
   */
  static validatePatternOptions(
    options: LinearPatternOptions | CircularPatternOptions | CurvePatternOptions | FillPatternOptions
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if ('count' in options && options.count < 1) {
      errors.push('Pattern count must be at least 1');
    }

    if ('count' in options && options.count > 1000) {
      errors.push('Pattern count exceeds maximum (1000)');
    }

    if ('suppressedInstances' in options && 'count' in options && options.suppressedInstances.some(i => i < 0 || i >= options.count)) {
      errors.push('Suppressed instance indices out of range');
    }

    if ('direction' in options) {
      if (options.direction.length() === 0) {
        errors.push('Direction vector cannot be zero length');
      }
      if (options.distance === 0) {
        errors.push('Pattern distance cannot be zero');
      }
    }

    if ('axis' in options) {
      if (options.axis.length() === 0) {
        errors.push('Axis vector cannot be zero length');
      }
      if (options.angle === 0) {
        errors.push('Pattern angle cannot be zero');
      }
    }

    if ('curve' in options && !options.curve) {
      errors.push('Curve is required for curve-driven pattern');
    }

    if ('spacing' in options && options.spacing === 0) {
      errors.push('Fill pattern spacing cannot be zero');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Create a curve-driven pattern along a 3D curve
   */
  static createCurvePattern(
    sourceGeometry: THREE.BufferGeometry | THREE.Mesh,
    material: THREE.Material,
    options: CurvePatternOptions
  ): CurvePatternResult {
    const result: CurvePatternResult = {
      success: false,
      instances: [],
      totalInstances: options.count,
      suppressedCount: options.suppressedInstances.length,
      metadata: {
        operation: 'curve-pattern',
        timestamp: Date.now(),
        count: options.count,
        suppressedInstances: options.suppressedInstances,
        alignToTangent: options.alignToTangent
      }
    };

    try {
      let geometry: THREE.BufferGeometry;
      let initialTransform = new THREE.Matrix4();

      if (sourceGeometry instanceof THREE.Mesh) {
        geometry = sourceGeometry.geometry;
        initialTransform = sourceGeometry.matrix.clone();
      } else {
        geometry = sourceGeometry;
      }

      const suppressedSet = new Set(options.suppressedInstances);

      // Create instances along curve
      for (let i = 0; i < options.count; i++) {
        if (suppressedSet.has(i)) {
          continue;
        }

        // Calculate t value (0-1) along curve
        let t: number;
        if (options.spacing === 'non-uniform' && options.spacingArray) {
          t = options.spacingArray[i] || i / (options.count - 1);
        } else {
          t = i / (options.count - 1);
        }

        // Get point on curve
        const position = options.curve.getPoint(t);

        // Apply perpendicular offset if specified
        if (options.offset && options.offset !== 0) {
          const tangent = options.curve.getTangent(t).normalize();
          const normal = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
          position.add(normal.multiplyScalar(options.offset));
        }

        // Clone geometry
        const instanceGeometry = geometry.clone();
        const instanceMesh = new THREE.Mesh(instanceGeometry, material);

        // Set position
        instanceMesh.position.copy(position);

        // Align to tangent if requested
        if (options.alignToTangent) {
          const tangent = options.curve.getTangent(t).normalize();
          const up = new THREE.Vector3(0, 0, 1);
          const matrix = new THREE.Matrix4().lookAt(
            new THREE.Vector3(0, 0, 0),
            tangent,
            up
          );
          instanceMesh.quaternion.setFromRotationMatrix(matrix);
        }

        instanceMesh.updateMatrix();

        // Store metadata
        instanceMesh.userData = {
          patternIndex: i,
          patternType: 'curve',
          patternId: `curve-${Date.now()}-${i}`,
          curveParameter: t,
          suppressed: false
        };

        result.instances.push(instanceMesh);
      }

      result.boundingBox = this.calculatePatternBounds(result.instances);
      result.success = true;

      return result;

    } catch (error) {
      result.error = `Curve pattern failed: ${(error as Error).message}`;
      return result;
    }
  }

  /**
   * Create a fill pattern within a bounded region
   */
  static createFillPattern(
    sourceGeometry: THREE.BufferGeometry | THREE.Mesh,
    material: THREE.Material,
    options: FillPatternOptions
  ): FillPatternResult {
    const result: FillPatternResult = {
      success: false,
      instances: [],
      totalInstances: 0,
      suppressedCount: options.suppressedInstances.length,
      metadata: {
        operation: 'fill-pattern',
        timestamp: Date.now(),
        fillType: options.fillType,
        spacing: options.spacing,
        instanceCount: 0
      }
    };

    try {
      let geometry: THREE.BufferGeometry;
      let initialTransform = new THREE.Matrix4();

      if (sourceGeometry instanceof THREE.Mesh) {
        geometry = sourceGeometry.geometry;
        initialTransform = sourceGeometry.matrix.clone();
      } else {
        geometry = sourceGeometry;
      }

      const suppressedSet = new Set(options.suppressedInstances);
      const positions: THREE.Vector3[] = [];

      // Generate fill positions based on bounds and type
      if (options.bounds instanceof THREE.Box3) {
        const bounds = options.bounds;
        
        if (options.fillType === 'rectangular') {
          // Rectangular grid fill
          const xSteps = Math.ceil((bounds.max.x - bounds.min.x) / options.spacing);
          const ySteps = Math.ceil((bounds.max.y - bounds.min.y) / options.spacing);

          for (let x = 0; x <= xSteps; x++) {
            for (let y = 0; y <= ySteps; y++) {
              const pos = new THREE.Vector3(
                bounds.min.x + x * options.spacing,
                bounds.min.y + y * options.spacing,
                (bounds.min.z + bounds.max.z) / 2
              );
              positions.push(pos);
            }
          }
        } else if (options.fillType === 'hexagonal') {
          // Hexagonal grid fill
          const xSteps = Math.ceil((bounds.max.x - bounds.min.x) / options.spacing);
          const ySteps = Math.ceil((bounds.max.y - bounds.min.y) / (options.spacing * 0.866)); // sqrt(3)/2

          for (let y = 0; y <= ySteps; y++) {
            const xOffset = (y % 2) * options.spacing * 0.5;
            for (let x = 0; x <= xSteps; x++) {
              const pos = new THREE.Vector3(
                bounds.min.x + x * options.spacing + xOffset,
                bounds.min.y + y * options.spacing * 0.866,
                (bounds.min.z + bounds.max.z) / 2
              );
              positions.push(pos);
            }
          }
        } else if (options.fillType === 'circular') {
          // Circular/radial fill
          const center = new THREE.Vector3(
            (bounds.min.x + bounds.max.x) / 2,
            (bounds.min.y + bounds.max.y) / 2,
            (bounds.min.z + bounds.max.z) / 2
          );
          const maxRadius = Math.min(
            (bounds.max.x - bounds.min.x) / 2,
            (bounds.max.y - bounds.min.y) / 2
          );

          const radialSteps = Math.ceil(maxRadius / options.spacing);
          for (let r = 0; r <= radialSteps; r++) {
            const radius = r * options.spacing;
            const circumference = 2 * Math.PI * radius;
            const angularSteps = Math.max(1, Math.floor(circumference / options.spacing));

            for (let a = 0; a < angularSteps; a++) {
              const angle = (a / angularSteps) * 2 * Math.PI;
              const pos = new THREE.Vector3(
                center.x + Math.cos(angle) * radius,
                center.y + Math.sin(angle) * radius,
                center.z
              );
              positions.push(pos);
            }
          }
        }
      }

      result.totalInstances = positions.length;
      result.metadata.instanceCount = positions.length;

      // Create instances at calculated positions
      positions.forEach((position, i) => {
        if (suppressedSet.has(i)) {
          return;
        }

        const instanceGeometry = geometry.clone();
        const instanceMesh = new THREE.Mesh(instanceGeometry, material);

        instanceMesh.position.copy(position);
        
        // Apply rotation if specified
        if (options.rotation) {
          instanceMesh.rotation.z = options.rotation;
        }

        instanceMesh.updateMatrix();

        instanceMesh.userData = {
          patternIndex: i,
          patternType: 'fill',
          patternId: `fill-${Date.now()}-${i}`,
          fillType: options.fillType,
          suppressed: false
        };

        result.instances.push(instanceMesh);
      });

      result.boundingBox = this.calculatePatternBounds(result.instances);
      result.success = true;

      return result;

    } catch (error) {
      result.error = `Fill pattern failed: ${(error as Error).message}`;
      return result;
    }
  }

  /**
   * Create feature pattern - patterns entire feature with history
   */
  static createFeaturePattern(
    sourceFeature: any,
    featureTree: any,
    patternOptions: LinearPatternOptions | CircularPatternOptions | CurvePatternOptions,
    featureOptions: FeaturePatternOptions
  ): any {
    const result: any = {
      success: false,
      features: [],
      totalFeatures: patternOptions.count,
      suppressedCount: patternOptions.suppressedInstances.length,
      metadata: {
        operation: 'feature-pattern',
        timestamp: Date.now(),
        sourceFeatureId: featureOptions.sourceFeatureId,
        patternType: 'patternType' in patternOptions ? patternOptions.patternType : 'feature'
      }
    };

    try {
      const suppressedSet = new Set(patternOptions.suppressedInstances);

      // For each non-suppressed instance
      for (let i = 0; i < patternOptions.count; i++) {
        if (suppressedSet.has(i)) {
          continue;
        }

        // Clone the source feature
        const clonedFeature = {
          ...sourceFeature,
          id: `${sourceFeature.id}-pattern-${i}`,
          name: `${sourceFeature.name} [${i}]`,
          patternIndex: i,
          patternSource: featureOptions.sourceFeatureId
        };

        // Calculate transform based on pattern type
        let transform = new THREE.Matrix4();
        
        if ('direction' in patternOptions) {
          // Linear pattern
          const direction = patternOptions.direction.clone().normalize();
          const offset = direction.multiplyScalar(patternOptions.distance * i);
          transform.makeTranslation(offset.x, offset.y, offset.z);
        } else if ('axis' in patternOptions) {
          // Circular pattern
          const angleIncrement = patternOptions.equalSpacing
            ? (patternOptions.angle * Math.PI / 180) / (patternOptions.count - 1)
            : patternOptions.angle * Math.PI / 180;
          
          const rotationAngle = angleIncrement * i;
          const quaternion = new THREE.Quaternion();
          quaternion.setFromAxisAngle(patternOptions.axis.clone().normalize(), rotationAngle);
          transform.makeRotationFromQuaternion(quaternion);
        } else if ('curve' in patternOptions) {
          // Curve pattern
          const t = i / (patternOptions.count - 1);
          const position = patternOptions.curve.getPoint(t);
          transform.makeTranslation(position.x, position.y, position.z);
        }

        // Update feature parameters with transform
        clonedFeature.transform = transform;

        // Add to feature tree
        if (featureOptions.patternFeatures && featureTree) {
          featureTree.addFeature(clonedFeature, [featureOptions.sourceFeatureId]);
        }

        result.features.push(clonedFeature);
      }

      result.success = true;
      return result;

    } catch (error) {
      result.error = `Feature pattern failed: ${(error as Error).message}`;
      return result;
    }
  }

  /**
   * Generate non-uniform spacing array
   */
  static generateNonUniformSpacing(
    count: number,
    type: 'increasing' | 'decreasing' | 'exponential' | 'custom',
    params?: { factor?: number; customArray?: number[] }
  ): number[] {
    const spacing: number[] = [0]; // First instance always at 0

    if (type === 'custom' && params?.customArray) {
      return params.customArray;
    }

    for (let i = 1; i < count; i++) {
      if (type === 'increasing') {
        // Linear increasing: 1, 2, 3, 4...
        spacing.push(spacing[i - 1] + i);
      } else if (type === 'decreasing') {
        // Linear decreasing: n, n-1, n-2...
        spacing.push(spacing[i - 1] + (count - i));
      } else if (type === 'exponential') {
        // Exponential: 1, 2, 4, 8...
        const factor = params?.factor || 2;
        spacing.push(spacing[i - 1] + Math.pow(factor, i - 1));
      }
    }

    return spacing;
  }

  /**
   * Create curve from points (for curve-driven patterns)
   */
  static createCurveFromPoints(
    points: THREE.Vector3[],
    curveType: 'catmull-rom' | 'bezier' | 'line'
  ): THREE.Curve<THREE.Vector3> {
    if (curveType === 'catmull-rom') {
      return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
    } else if (curveType === 'bezier' && points.length === 4) {
      return new THREE.CubicBezierCurve3(points[0], points[1], points[2], points[3]);
    } else if (curveType === 'line') {
      return new THREE.LineCurve3(points[0], points[points.length - 1]);
    }
    
    // Default to Catmull-Rom
    return new THREE.CatmullRomCurve3(points);
  }
}
