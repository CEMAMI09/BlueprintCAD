/**
 * Shell Operation for CAD System
 * 
 * Creates hollow shells from solid geometry by:
 * - Offsetting outer surfaces inward by wall thickness
 * - Removing selected faces to create openings
 * - Maintaining topology and connectivity
 * - Providing real-time preview feedback
 * - Integrating with feature history and version control
 */

import * as THREE from 'three';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface ShellOptions {
  /** Wall thickness (must be positive) */
  thickness: number;
  /** Face indices to remove (creates openings) */
  removedFaces?: number[];
  /** Whether to shell inward (true) or outward (false) */
  inward?: boolean;
  /** Tolerance for geometric operations (default: 0.001) */
  tolerance?: number;
  /** Quality settings for shell generation */
  quality?: 'low' | 'medium' | 'high';
  /** Preserve sharp edges (default: true) */
  preserveEdges?: boolean;
}

export interface ShellResult {
  /** Generated shell geometry */
  geometry: THREE.BufferGeometry;
  /** Success status */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Warnings (non-fatal issues) */
  warnings: string[];
  /** Statistics about the operation */
  stats: {
    originalVertices: number;
    originalFaces: number;
    shellVertices: number;
    shellFaces: number;
    removedFaces: number;
    wallThickness: number;
    volume: number;
    surfaceArea: number;
  };
}

export interface ShellFeature {
  id: string;
  type: 'shell';
  name: string;
  sourceGeometryId: string;
  options: ShellOptions;
  geometry?: THREE.BufferGeometry;
  suppressed: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface FaceInfo {
  index: number;
  center: THREE.Vector3;
  normal: THREE.Vector3;
  area: number;
  vertices: THREE.Vector3[];
}

// ============================================================================
// Validation and Utilities
// ============================================================================

class ShellValidator {
  static validateGeometry(geometry: THREE.BufferGeometry): { valid: boolean; error?: string } {
    if (!geometry) {
      return { valid: false, error: 'Geometry is null or undefined' };
    }

    const position = geometry.getAttribute('position');
    if (!position) {
      return { valid: false, error: 'Geometry has no position attribute' };
    }

    if (position.count < 3) {
      return { valid: false, error: 'Geometry must have at least 3 vertices' };
    }

    const index = geometry.getIndex();
    if (!index || index.count < 3) {
      return { valid: false, error: 'Geometry must have indexed faces' };
    }

    return { valid: true };
  }

  static validateThickness(thickness: number): { valid: boolean; error?: string } {
    if (thickness <= 0) {
      return { valid: false, error: 'Thickness must be positive' };
    }

    if (thickness > 100) {
      return { valid: false, error: 'Thickness is too large (max 100 units)' };
    }

    return { valid: true };
  }

  static validateRemovedFaces(
    removedFaces: number[] | undefined,
    maxFaces: number
  ): { valid: boolean; error?: string } {
    if (!removedFaces || removedFaces.length === 0) {
      return { valid: true };
    }

    if (removedFaces.length > maxFaces) {
      return { valid: false, error: 'Cannot remove more faces than available' };
    }

    for (const faceIndex of removedFaces) {
      if (faceIndex < 0 || faceIndex >= maxFaces) {
        return { valid: false, error: `Invalid face index: ${faceIndex}` };
      }
    }

    return { valid: true };
  }
}

class GeometryAnalyzer {
  /**
   * Get information about all faces in the geometry
   */
  static analyzeFaces(geometry: THREE.BufferGeometry): FaceInfo[] {
    const position = geometry.getAttribute('position');
    const index = geometry.getIndex();
    
    if (!position || !index) return [];

    const faces: FaceInfo[] = [];
    const faceCount = index.count / 3;

    for (let i = 0; i < faceCount; i++) {
      const i0 = index.getX(i * 3);
      const i1 = index.getX(i * 3 + 1);
      const i2 = index.getX(i * 3 + 2);

      const v0 = new THREE.Vector3(
        position.getX(i0),
        position.getY(i0),
        position.getZ(i0)
      );
      const v1 = new THREE.Vector3(
        position.getX(i1),
        position.getY(i1),
        position.getZ(i1)
      );
      const v2 = new THREE.Vector3(
        position.getX(i2),
        position.getY(i2),
        position.getZ(i2)
      );

      // Calculate face center
      const center = new THREE.Vector3()
        .add(v0)
        .add(v1)
        .add(v2)
        .divideScalar(3);

      // Calculate face normal
      const edge1 = new THREE.Vector3().subVectors(v1, v0);
      const edge2 = new THREE.Vector3().subVectors(v2, v0);
      const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

      // Calculate face area
      const area = edge1.cross(edge2).length() / 2;

      faces.push({
        index: i,
        center,
        normal,
        area,
        vertices: [v0, v1, v2]
      });
    }

    return faces;
  }

  /**
   * Calculate volume of closed mesh
   */
  static calculateVolume(geometry: THREE.BufferGeometry): number {
    const position = geometry.getAttribute('position');
    const index = geometry.getIndex();
    
    if (!position || !index) return 0;

    let volume = 0;
    
    for (let i = 0; i < index.count; i += 3) {
      const i0 = index.getX(i);
      const i1 = index.getX(i + 1);
      const i2 = index.getX(i + 2);

      const v0 = new THREE.Vector3(
        position.getX(i0),
        position.getY(i0),
        position.getZ(i0)
      );
      const v1 = new THREE.Vector3(
        position.getX(i1),
        position.getY(i1),
        position.getZ(i1)
      );
      const v2 = new THREE.Vector3(
        position.getX(i2),
        position.getY(i2),
        position.getZ(i2)
      );

      // Signed volume of tetrahedron
      volume += v0.dot(new THREE.Vector3().crossVectors(v1, v2)) / 6;
    }

    return Math.abs(volume);
  }

  /**
   * Calculate surface area
   */
  static calculateSurfaceArea(geometry: THREE.BufferGeometry): number {
    const position = geometry.getAttribute('position');
    const index = geometry.getIndex();
    
    if (!position || !index) return 0;

    let area = 0;
    
    for (let i = 0; i < index.count; i += 3) {
      const i0 = index.getX(i);
      const i1 = index.getX(i + 1);
      const i2 = index.getX(i + 2);

      const v0 = new THREE.Vector3(
        position.getX(i0),
        position.getY(i0),
        position.getZ(i0)
      );
      const v1 = new THREE.Vector3(
        position.getX(i1),
        position.getY(i1),
        position.getZ(i1)
      );
      const v2 = new THREE.Vector3(
        position.getX(i2),
        position.getY(i2),
        position.getZ(i2)
      );

      const edge1 = new THREE.Vector3().subVectors(v1, v0);
      const edge2 = new THREE.Vector3().subVectors(v2, v0);
      
      area += edge1.cross(edge2).length() / 2;
    }

    return area;
  }

  /**
   * Compute vertex normals with edge preservation
   */
  static computeVertexNormals(
    geometry: THREE.BufferGeometry,
    preserveEdges: boolean = true
  ): Float32Array {
    const position = geometry.getAttribute('position');
    const index = geometry.getIndex();
    
    if (!position || !index) {
      return new Float32Array(position.count * 3);
    }

    const normals = new Float32Array(position.count * 3);
    const vertexNormals: Map<number, THREE.Vector3[]> = new Map();

    // Collect face normals for each vertex
    for (let i = 0; i < index.count; i += 3) {
      const i0 = index.getX(i);
      const i1 = index.getX(i + 1);
      const i2 = index.getX(i + 2);

      const v0 = new THREE.Vector3(
        position.getX(i0),
        position.getY(i0),
        position.getZ(i0)
      );
      const v1 = new THREE.Vector3(
        position.getX(i1),
        position.getY(i1),
        position.getZ(i1)
      );
      const v2 = new THREE.Vector3(
        position.getX(i2),
        position.getY(i2),
        position.getZ(i2)
      );

      const edge1 = new THREE.Vector3().subVectors(v1, v0);
      const edge2 = new THREE.Vector3().subVectors(v2, v0);
      const faceNormal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

      // Add to each vertex
      for (const idx of [i0, i1, i2]) {
        if (!vertexNormals.has(idx)) {
          vertexNormals.set(idx, []);
        }
        vertexNormals.get(idx)!.push(faceNormal.clone());
      }
    }

    // Average normals for each vertex
    for (let i = 0; i < position.count; i++) {
      const faceNormals = vertexNormals.get(i) || [];
      
      if (faceNormals.length === 0) {
        normals[i * 3] = 0;
        normals[i * 3 + 1] = 1;
        normals[i * 3 + 2] = 0;
        continue;
      }

      const avgNormal = new THREE.Vector3();
      
      if (preserveEdges) {
        // Check if this is a sharp edge (large angle between faces)
        let maxAngle = 0;
        for (let j = 0; j < faceNormals.length; j++) {
          for (let k = j + 1; k < faceNormals.length; k++) {
            const angle = Math.acos(
              Math.max(-1, Math.min(1, faceNormals[j].dot(faceNormals[k])))
            );
            maxAngle = Math.max(maxAngle, angle);
          }
        }

        // If sharp edge (>30°), use dominant normal
        if (maxAngle > Math.PI / 6) {
          avgNormal.copy(faceNormals[0]);
        } else {
          // Smooth edge, average all normals
          faceNormals.forEach(n => avgNormal.add(n));
          avgNormal.divideScalar(faceNormals.length);
        }
      } else {
        // Always smooth
        faceNormals.forEach(n => avgNormal.add(n));
        avgNormal.divideScalar(faceNormals.length);
      }

      avgNormal.normalize();
      
      normals[i * 3] = avgNormal.x;
      normals[i * 3 + 1] = avgNormal.y;
      normals[i * 3 + 2] = avgNormal.z;
    }

    return normals;
  }
}

// ============================================================================
// Shell Operation
// ============================================================================

export class ShellOperation {
  /**
   * Create a shell from solid geometry
   */
  static create(
    sourceGeometry: THREE.BufferGeometry,
    options: ShellOptions
  ): ShellResult {
    const warnings: string[] = [];

    try {
      // Validate inputs
      const geometryValidation = ShellValidator.validateGeometry(sourceGeometry);
      if (!geometryValidation.valid) {
        return this.createErrorResult(geometryValidation.error!, warnings);
      }

      const thicknessValidation = ShellValidator.validateThickness(options.thickness);
      if (!thicknessValidation.valid) {
        return this.createErrorResult(thicknessValidation.error!, warnings);
      }

      const position = sourceGeometry.getAttribute('position');
      const index = sourceGeometry.getIndex()!;
      const faceCount = index.count / 3;

      const facesValidation = ShellValidator.validateRemovedFaces(
        options.removedFaces,
        faceCount
      );
      if (!facesValidation.valid) {
        return this.createErrorResult(facesValidation.error!, warnings);
      }

      // Apply defaults
      const thickness = options.thickness;
      const removedFaces = new Set(options.removedFaces || []);
      const inward = options.inward !== false;
      const tolerance = options.tolerance || 0.001;
      const quality = options.quality || 'medium';
      const preserveEdges = options.preserveEdges !== false;

      // Analyze source geometry
      const originalVolume = GeometryAnalyzer.calculateVolume(sourceGeometry);
      const originalArea = GeometryAnalyzer.calculateSurfaceArea(sourceGeometry);

      if (originalVolume < 0.001) {
        warnings.push('Source geometry has very small volume');
      }

      // Compute vertex normals
      const normals = GeometryAnalyzer.computeVertexNormals(sourceGeometry, preserveEdges);

      // Create shell by offsetting vertices
      const direction = inward ? -1 : 1;
      const offsetPositions = new Float32Array(position.count * 3);

      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const y = position.getY(i);
        const z = position.getZ(i);
        
        const nx = normals[i * 3];
        const ny = normals[i * 3 + 1];
        const nz = normals[i * 3 + 2];

        offsetPositions[i * 3] = x + nx * thickness * direction;
        offsetPositions[i * 3 + 1] = y + ny * thickness * direction;
        offsetPositions[i * 3 + 2] = z + nz * thickness * direction;
      }

      // Build shell geometry
      const shellPositions: number[] = [];
      const shellNormals: number[] = [];
      const shellIndices: number[] = [];
      const vertexMap: Map<string, number> = new Map();

      let vertexIndex = 0;

      const addVertex = (x: number, y: number, z: number, nx: number, ny: number, nz: number): number => {
        const key = `${x.toFixed(6)},${y.toFixed(6)},${z.toFixed(6)}`;
        
        if (vertexMap.has(key)) {
          return vertexMap.get(key)!;
        }

        shellPositions.push(x, y, z);
        shellNormals.push(nx, ny, nz);
        vertexMap.set(key, vertexIndex);
        return vertexIndex++;
      };

      // Add outer surface (original faces not removed)
      for (let i = 0; i < faceCount; i++) {
        if (removedFaces.has(i)) continue;

        const i0 = index.getX(i * 3);
        const i1 = index.getX(i * 3 + 1);
        const i2 = index.getX(i * 3 + 2);

        const v0 = addVertex(
          position.getX(i0),
          position.getY(i0),
          position.getZ(i0),
          normals[i0 * 3],
          normals[i0 * 3 + 1],
          normals[i0 * 3 + 2]
        );
        const v1 = addVertex(
          position.getX(i1),
          position.getY(i1),
          position.getZ(i1),
          normals[i1 * 3],
          normals[i1 * 3 + 1],
          normals[i1 * 3 + 2]
        );
        const v2 = addVertex(
          position.getX(i2),
          position.getY(i2),
          position.getZ(i2),
          normals[i2 * 3],
          normals[i2 * 3 + 1],
          normals[i2 * 3 + 2]
        );

        shellIndices.push(v0, v1, v2);
      }

      // Add inner surface (offset faces not removed, reversed winding)
      for (let i = 0; i < faceCount; i++) {
        if (removedFaces.has(i)) continue;

        const i0 = index.getX(i * 3);
        const i1 = index.getX(i * 3 + 1);
        const i2 = index.getX(i * 3 + 2);

        const v0 = addVertex(
          offsetPositions[i0 * 3],
          offsetPositions[i0 * 3 + 1],
          offsetPositions[i0 * 3 + 2],
          -normals[i0 * 3],
          -normals[i0 * 3 + 1],
          -normals[i0 * 3 + 2]
        );
        const v1 = addVertex(
          offsetPositions[i1 * 3],
          offsetPositions[i1 * 3 + 1],
          offsetPositions[i1 * 3 + 2],
          -normals[i1 * 3],
          -normals[i1 * 3 + 1],
          -normals[i1 * 3 + 2]
        );
        const v2 = addVertex(
          offsetPositions[i2 * 3],
          offsetPositions[i2 * 3 + 1],
          offsetPositions[i2 * 3 + 2],
          -normals[i2 * 3],
          -normals[i2 * 3 + 1],
          -normals[i2 * 3 + 2]
        );

        // Reversed winding for inside
        shellIndices.push(v0, v2, v1);
      }

      // Add wall faces connecting outer and inner surfaces at removed faces
      for (const faceIdx of removedFaces) {
        const i0 = index.getX(faceIdx * 3);
        const i1 = index.getX(faceIdx * 3 + 1);
        const i2 = index.getX(faceIdx * 3 + 2);

        // Create quads connecting outer edge to inner edge
        const edges = [
          [i0, i1],
          [i1, i2],
          [i2, i0]
        ];

        for (const [a, b] of edges) {
          // Outer edge vertices
          const outerA = addVertex(
            position.getX(a),
            position.getY(a),
            position.getZ(a),
            normals[a * 3],
            normals[a * 3 + 1],
            normals[a * 3 + 2]
          );
          const outerB = addVertex(
            position.getX(b),
            position.getY(b),
            position.getZ(b),
            normals[b * 3],
            normals[b * 3 + 1],
            normals[b * 3 + 2]
          );

          // Inner edge vertices
          const innerA = addVertex(
            offsetPositions[a * 3],
            offsetPositions[a * 3 + 1],
            offsetPositions[a * 3 + 2],
            normals[a * 3],
            normals[a * 3 + 1],
            normals[a * 3 + 2]
          );
          const innerB = addVertex(
            offsetPositions[b * 3],
            offsetPositions[b * 3 + 1],
            offsetPositions[b * 3 + 2],
            normals[b * 3],
            normals[b * 3 + 1],
            normals[b * 3 + 2]
          );

          // Two triangles forming quad
          shellIndices.push(outerA, outerB, innerB);
          shellIndices.push(outerA, innerB, innerA);
        }
      }

      // Create final geometry
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(shellPositions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(shellNormals, 3));
      geometry.setIndex(shellIndices);
      geometry.computeBoundingSphere();

      // Calculate final metrics
      const shellVolume = GeometryAnalyzer.calculateVolume(geometry);
      const shellArea = GeometryAnalyzer.calculateSurfaceArea(geometry);

      // Validate result
      if (shellVolume < 0.001) {
        warnings.push('Shell has very small volume - may be degenerate');
      }

      if (shellIndices.length === 0) {
        return this.createErrorResult('Shell generation produced no geometry', warnings);
      }

      return {
        geometry,
        success: true,
        warnings,
        stats: {
          originalVertices: position.count,
          originalFaces: faceCount,
          shellVertices: shellPositions.length / 3,
          shellFaces: shellIndices.length / 3,
          removedFaces: removedFaces.size,
          wallThickness: thickness,
          volume: shellVolume,
          surfaceArea: shellArea
        }
      };

    } catch (error: any) {
      return this.createErrorResult(`Shell operation failed: ${error.message}`, warnings);
    }
  }

  /**
   * Create preview with reduced quality for performance
   */
  static createPreview(
    sourceGeometry: THREE.BufferGeometry,
    options: ShellOptions
  ): THREE.Mesh | null {
    // Use lower quality for preview
    const previewOptions: ShellOptions = {
      ...options,
      quality: 'low'
    };

    const result = this.create(sourceGeometry, previewOptions);
    
    if (!result.success) return null;

    const material = new THREE.MeshPhongMaterial({
      color: 0xFFC107,
      opacity: 0.7,
      transparent: true,
      side: THREE.DoubleSide,
      wireframe: false
    });

    return new THREE.Mesh(result.geometry, material);
  }

  /**
   * Get face information for UI selection
   */
  static getFaceInfo(geometry: THREE.BufferGeometry): FaceInfo[] {
    return GeometryAnalyzer.analyzeFaces(geometry);
  }

  private static createErrorResult(error: string, warnings: string[]): ShellResult {
    return {
      geometry: new THREE.BufferGeometry(),
      success: false,
      error,
      warnings,
      stats: {
        originalVertices: 0,
        originalFaces: 0,
        shellVertices: 0,
        shellFaces: 0,
        removedFaces: 0,
        wallThickness: 0,
        volume: 0,
        surfaceArea: 0
      }
    };
  }
}

// ============================================================================
// Feature Management
// ============================================================================

export class ShellFeatureManager {
  /**
   * Create a shell feature with full metadata
   */
  static createShellFeature(
    name: string,
    sourceGeometryId: string,
    sourceGeometry: THREE.BufferGeometry,
    options: ShellOptions
  ): ShellFeature {
    const result = ShellOperation.create(sourceGeometry, options);

    return {
      id: crypto.randomUUID(),
      type: 'shell',
      name,
      sourceGeometryId,
      options,
      geometry: result.success ? result.geometry : undefined,
      suppressed: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  /**
   * Update shell feature parameters
   */
  static updateShellFeature(
    feature: ShellFeature,
    sourceGeometry: THREE.BufferGeometry,
    options: Partial<ShellOptions>
  ): ShellFeature {
    const newOptions = { ...feature.options, ...options };
    const result = ShellOperation.create(sourceGeometry, newOptions);

    return {
      ...feature,
      options: newOptions,
      geometry: result.success ? result.geometry : feature.geometry,
      updatedAt: Date.now()
    };
  }
}

export default {
  ShellOperation,
  ShellFeatureManager,
  ShellValidator,
  GeometryAnalyzer
};
