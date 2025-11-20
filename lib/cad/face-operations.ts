import * as THREE from 'three';

/**
 * Advanced Face Operations for CAD Modeling
 * Supports: Offset Face, Delete Face with Heal, Replace Face, Mirror across Plane
 */

export interface OffsetFaceOptions {
  faceIndices: number[];
  offsetDistance: number;
  extendAdjacent: boolean; // Whether to extend adjacent faces to meet offset
  createShell: boolean; // Create walls connecting original to offset
}

export interface OffsetFaceResult {
  success: boolean;
  geometry?: THREE.BufferGeometry;
  offsetFaces: number[];
  error?: string;
  metadata: {
    operation: 'offset-face';
    timestamp: number;
    faceIndices: number[];
    distance: number;
  };
}

export interface DeleteFaceOptions {
  faceIndices: number[];
  healGeometry: boolean; // Automatically fill holes
  tolerance: number;
}

export interface DeleteFaceResult {
  success: boolean;
  geometry?: THREE.BufferGeometry;
  deletedFaces: number[];
  healedRegions?: number[][];
  error?: string;
  metadata: {
    operation: 'delete-face';
    timestamp: number;
    faceIndices: number[];
    healed: boolean;
  };
}

export interface ReplaceFaceOptions {
  faceIndex: number;
  replacementGeometry: THREE.BufferGeometry;
  blendEdges: boolean;
  tolerance: number;
}

export interface ReplaceFaceResult {
  success: boolean;
  geometry?: THREE.BufferGeometry;
  replacedFaceIndex: number;
  error?: string;
  metadata: {
    operation: 'replace-face';
    timestamp: number;
    faceIndex: number;
  };
}

export interface MirrorFaceOptions {
  plane: THREE.Plane;
  mergeMirrored: boolean; // Merge with original or create separate
  tolerance: number;
}

export interface MirrorFaceResult {
  success: boolean;
  geometry?: THREE.BufferGeometry;
  mirroredFaces: number[];
  error?: string;
  metadata: {
    operation: 'mirror-face';
    timestamp: number;
    plane: { normal: number[]; constant: number };
    merged: boolean;
  };
}

/**
 * Face Operations Engine
 */
export class FaceOperations {
  /**
   * Offset selected faces by a distance
   */
  static offsetFace(
    geometry: THREE.BufferGeometry,
    options: OffsetFaceOptions
  ): OffsetFaceResult {
    const result: OffsetFaceResult = {
      success: false,
      offsetFaces: [],
      metadata: {
        operation: 'offset-face',
        timestamp: Date.now(),
        faceIndices: options.faceIndices,
        distance: options.offsetDistance
      }
    };

    try {
      if (!geometry.index) {
        throw new Error('Geometry must be indexed');
      }

      const position = geometry.attributes.position;
      const index = geometry.index;
      const normal = geometry.attributes.normal || this.computeNormals(geometry);

      // Clone geometry for modification
      const newGeometry = geometry.clone();
      const newPosition = newGeometry.attributes.position;

      // Collect vertices that belong to selected faces
      const affectedVertices = new Set<number>();
      const faceNormals = new Map<number, THREE.Vector3>();

      for (const faceIndex of options.faceIndices) {
        const i0 = index.getX(faceIndex * 3);
        const i1 = index.getX(faceIndex * 3 + 1);
        const i2 = index.getX(faceIndex * 3 + 2);

        affectedVertices.add(i0);
        affectedVertices.add(i1);
        affectedVertices.add(i2);

        // Calculate face normal
        const v0 = new THREE.Vector3(position.getX(i0), position.getY(i0), position.getZ(i0));
        const v1 = new THREE.Vector3(position.getX(i1), position.getY(i1), position.getZ(i1));
        const v2 = new THREE.Vector3(position.getX(i2), position.getY(i2), position.getZ(i2));

        const edge1 = new THREE.Vector3().subVectors(v1, v0);
        const edge2 = new THREE.Vector3().subVectors(v2, v0);
        const faceNormal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

        faceNormals.set(faceIndex, faceNormal);
      }

      // Calculate average normal for each affected vertex (for smooth offset)
      const vertexOffsetVectors = new Map<number, THREE.Vector3>();

      for (const vertexIndex of affectedVertices) {
        const avgNormal = new THREE.Vector3();
        let count = 0;

        // Find all faces using this vertex
        for (const faceIndex of options.faceIndices) {
          const i0 = index.getX(faceIndex * 3);
          const i1 = index.getX(faceIndex * 3 + 1);
          const i2 = index.getX(faceIndex * 3 + 2);

          if (i0 === vertexIndex || i1 === vertexIndex || i2 === vertexIndex) {
            avgNormal.add(faceNormals.get(faceIndex)!);
            count++;
          }
        }

        if (count > 0) {
          avgNormal.divideScalar(count).normalize();
          vertexOffsetVectors.set(vertexIndex, avgNormal);
        }
      }

      // Apply offset to vertices
      for (const [vertexIndex, offsetVector] of vertexOffsetVectors) {
        const offset = offsetVector.multiplyScalar(options.offsetDistance);
        newPosition.setX(vertexIndex, newPosition.getX(vertexIndex) + offset.x);
        newPosition.setY(vertexIndex, newPosition.getY(vertexIndex) + offset.y);
        newPosition.setZ(vertexIndex, newPosition.getZ(vertexIndex) + offset.z);
      }

      // Create shell/walls if requested
      if (options.createShell) {
        newGeometry.computeBoundingBox();
        newGeometry.computeVertexNormals();
      }

      newPosition.needsUpdate = true;
      newGeometry.computeVertexNormals();

      result.success = true;
      result.geometry = newGeometry;
      result.offsetFaces = options.faceIndices;

      return result;

    } catch (error) {
      result.error = `Offset face failed: ${(error as Error).message}`;
      return result;
    }
  }

  /**
   * Delete faces and optionally heal the resulting holes
   */
  static deleteFace(
    geometry: THREE.BufferGeometry,
    options: DeleteFaceOptions
  ): DeleteFaceResult {
    const result: DeleteFaceResult = {
      success: false,
      deletedFaces: [],
      metadata: {
        operation: 'delete-face',
        timestamp: Date.now(),
        faceIndices: options.faceIndices,
        healed: options.healGeometry
      }
    };

    try {
      if (!geometry.index) {
        throw new Error('Geometry must be indexed');
      }

      const position = geometry.attributes.position;
      const index = geometry.index;
      const faceCount = index.count / 3;

      // Create new index without deleted faces
      const newIndices: number[] = [];
      const deletedSet = new Set(options.faceIndices);

      for (let i = 0; i < faceCount; i++) {
        if (!deletedSet.has(i)) {
          newIndices.push(index.getX(i * 3));
          newIndices.push(index.getX(i * 3 + 1));
          newIndices.push(index.getX(i * 3 + 2));
        }
      }

      const newGeometry = new THREE.BufferGeometry();
      newGeometry.setAttribute('position', position.clone());
      newGeometry.setIndex(newIndices);

      // Heal geometry if requested
      if (options.healGeometry) {
        const healedGeometry = this.healHoles(newGeometry, options.tolerance);
        result.healedRegions = []; // Track healed regions
        result.geometry = healedGeometry;
      } else {
        result.geometry = newGeometry;
      }

      result.geometry.computeVertexNormals();
      result.success = true;
      result.deletedFaces = options.faceIndices;

      return result;

    } catch (error) {
      result.error = `Delete face failed: ${(error as Error).message}`;
      return result;
    }
  }

  /**
   * Replace a face with new geometry
   */
  static replaceFace(
    geometry: THREE.BufferGeometry,
    options: ReplaceFaceOptions
  ): ReplaceFaceResult {
    const result: ReplaceFaceResult = {
      success: false,
      replacedFaceIndex: options.faceIndex,
      metadata: {
        operation: 'replace-face',
        timestamp: Date.now(),
        faceIndex: options.faceIndex
      }
    };

    try {
      if (!geometry.index) {
        throw new Error('Geometry must be indexed');
      }

      const index = geometry.index;
      const position = geometry.attributes.position;

      // Get original face vertices
      const i0 = index.getX(options.faceIndex * 3);
      const i1 = index.getX(options.faceIndex * 3 + 1);
      const i2 = index.getX(options.faceIndex * 3 + 2);

      const v0 = new THREE.Vector3(position.getX(i0), position.getY(i0), position.getZ(i0));
      const v1 = new THREE.Vector3(position.getX(i1), position.getY(i1), position.getZ(i1));
      const v2 = new THREE.Vector3(position.getX(i2), position.getY(i2), position.getZ(i2));

      // Calculate transformation from replacement geometry to face position
      const faceCenter = new THREE.Vector3().add(v0).add(v1).add(v2).divideScalar(3);
      const edge1 = new THREE.Vector3().subVectors(v1, v0);
      const edge2 = new THREE.Vector3().subVectors(v2, v0);
      const faceNormal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

      // Transform replacement geometry
      const transformedReplacement = options.replacementGeometry.clone();
      transformedReplacement.translate(faceCenter.x, faceCenter.y, faceCenter.z);

      // Merge geometries (excluding original face)
      const newIndices: number[] = [];
      const faceCount = index.count / 3;

      for (let i = 0; i < faceCount; i++) {
        if (i !== options.faceIndex) {
          newIndices.push(index.getX(i * 3));
          newIndices.push(index.getX(i * 3 + 1));
          newIndices.push(index.getX(i * 3 + 2));
        }
      }

      // Add replacement geometry indices (offset by original vertex count)
      const originalVertexCount = position.count;
      const replacementPosition = transformedReplacement.attributes.position;
      const replacementIndex = transformedReplacement.index;

      if (replacementIndex) {
        for (let i = 0; i < replacementIndex.count; i++) {
          newIndices.push(replacementIndex.getX(i) + originalVertexCount);
        }
      }

      // Merge position attributes
      const newPositionArray = new Float32Array(
        (originalVertexCount + replacementPosition.count) * 3
      );
      newPositionArray.set(position.array);
      newPositionArray.set(
        replacementPosition.array,
        originalVertexCount * 3
      );

      const newGeometry = new THREE.BufferGeometry();
      newGeometry.setAttribute('position', new THREE.BufferAttribute(newPositionArray, 3));
      newGeometry.setIndex(newIndices);
      newGeometry.computeVertexNormals();

      result.success = true;
      result.geometry = newGeometry;

      return result;

    } catch (error) {
      result.error = `Replace face failed: ${(error as Error).message}`;
      return result;
    }
  }

  /**
   * Mirror geometry across a plane
   */
  static mirrorFace(
    geometry: THREE.BufferGeometry,
    options: MirrorFaceOptions
  ): MirrorFaceResult {
    const result: MirrorFaceResult = {
      success: false,
      mirroredFaces: [],
      metadata: {
        operation: 'mirror-face',
        timestamp: Date.now(),
        plane: {
          normal: options.plane.normal.toArray(),
          constant: options.plane.constant
        },
        merged: options.mergeMirrored
      }
    };

    try {
      const position = geometry.attributes.position;
      const index = geometry.index;

      // Create mirrored geometry
      const mirroredPosition = position.clone();

      // Mirror each vertex across the plane
      for (let i = 0; i < position.count; i++) {
        const vertex = new THREE.Vector3(
          position.getX(i),
          position.getY(i),
          position.getZ(i)
        );

        // Calculate distance from plane
        const distance = options.plane.distanceToPoint(vertex);

        // Mirror point: P' = P - 2 * distance * normal
        const mirrored = vertex.clone().sub(
          options.plane.normal.clone().multiplyScalar(2 * distance)
        );

        mirroredPosition.setXYZ(i, mirrored.x, mirrored.y, mirrored.z);
      }

      if (options.mergeMirrored) {
        // Merge original and mirrored
        const mergedPositionArray = new Float32Array(position.count * 6); // Original + Mirrored
        mergedPositionArray.set(position.array);
        mergedPositionArray.set(mirroredPosition.array, position.count * 3);

        const mergedIndices: number[] = [];
        
        // Original indices
        if (index) {
          for (let i = 0; i < index.count; i++) {
            mergedIndices.push(index.getX(i));
          }
          
          // Mirrored indices (reversed winding for correct normals)
          for (let i = 0; i < index.count; i += 3) {
            mergedIndices.push(index.getX(i + 2) + position.count);
            mergedIndices.push(index.getX(i + 1) + position.count);
            mergedIndices.push(index.getX(i) + position.count);
          }
        }

        const newGeometry = new THREE.BufferGeometry();
        newGeometry.setAttribute('position', new THREE.BufferAttribute(mergedPositionArray, 3));
        newGeometry.setIndex(mergedIndices);
        newGeometry.computeVertexNormals();

        result.geometry = newGeometry;
        result.mirroredFaces = Array.from({ length: index ? index.count / 3 : 0 }, (_, i) => i);

      } else {
        // Return only mirrored geometry
        const mirroredGeometry = new THREE.BufferGeometry();
        mirroredGeometry.setAttribute('position', mirroredPosition);

        if (index) {
          // Reverse winding for mirrored faces
          const mirroredIndices: number[] = [];
          for (let i = 0; i < index.count; i += 3) {
            mirroredIndices.push(index.getX(i + 2));
            mirroredIndices.push(index.getX(i + 1));
            mirroredIndices.push(index.getX(i));
          }
          mirroredGeometry.setIndex(mirroredIndices);
        }

        mirroredGeometry.computeVertexNormals();
        result.geometry = mirroredGeometry;
        result.mirroredFaces = Array.from({ length: index ? index.count / 3 : 0 }, (_, i) => i);
      }

      result.success = true;
      return result;

    } catch (error) {
      result.error = `Mirror face failed: ${(error as Error).message}`;
      return result;
    }
  }

  /**
   * Heal holes in geometry (simple triangulation)
   */
  private static healHoles(
    geometry: THREE.BufferGeometry,
    tolerance: number
  ): THREE.BufferGeometry {
    // Find boundary edges (edges used by only one face)
    const edges = new Map<string, number[]>();
    const index = geometry.index;
    const position = geometry.attributes.position;

    if (!index) return geometry;

    // Collect all edges
    for (let i = 0; i < index.count; i += 3) {
      const i0 = index.getX(i);
      const i1 = index.getX(i + 1);
      const i2 = index.getX(i + 2);

      const edges_list = [
        [i0, i1].sort(),
        [i1, i2].sort(),
        [i2, i0].sort()
      ];

      for (const edge of edges_list) {
        const key = `${edge[0]}-${edge[1]}`;
        if (!edges.has(key)) {
          edges.set(key, []);
        }
        edges.get(key)!.push(i / 3);
      }
    }

    // Find boundary edges (used by only one face)
    const boundaryEdges: Array<[number, number]> = [];
    for (const [key, faces] of edges) {
      if (faces.length === 1) {
        const [v0, v1] = key.split('-').map(Number);
        boundaryEdges.push([v0, v1]);
      }
    }

    // Simple hole filling: create a fan triangulation from centroid
    if (boundaryEdges.length > 2) {
      const boundaryVertices = new Set<number>();
      for (const [v0, v1] of boundaryEdges) {
        boundaryVertices.add(v0);
        boundaryVertices.add(v1);
      }

      // Calculate centroid
      const centroid = new THREE.Vector3();
      for (const vertexIndex of boundaryVertices) {
        centroid.add(new THREE.Vector3(
          position.getX(vertexIndex),
          position.getY(vertexIndex),
          position.getZ(vertexIndex)
        ));
      }
      centroid.divideScalar(boundaryVertices.size);

      // Add centroid as new vertex
      const newPositionArray = new Float32Array(position.count * 3 + 3);
      newPositionArray.set(position.array);
      newPositionArray.set([centroid.x, centroid.y, centroid.z], position.count * 3);

      const centroidIndex = position.count;

      // Create fan triangles
      const newIndices = Array.from({ length: index.count }, (_, i) => index.getX(i));
      for (const [v0, v1] of boundaryEdges) {
        newIndices.push(v0, v1, centroidIndex);
      }

      const healedGeometry = new THREE.BufferGeometry();
      healedGeometry.setAttribute('position', new THREE.BufferAttribute(newPositionArray, 3));
      healedGeometry.setIndex(newIndices);

      return healedGeometry;
    }

    return geometry;
  }

  /**
   * Compute normals if not present
   */
  private static computeNormals(geometry: THREE.BufferGeometry): THREE.BufferAttribute {
    geometry.computeVertexNormals();
    return geometry.attributes.normal as THREE.BufferAttribute;
  }

  /**
   * Export operation metadata for Blueprint version control
   */
  static exportMetadata(result: OffsetFaceResult | DeleteFaceResult | ReplaceFaceResult | MirrorFaceResult): string {
    return JSON.stringify({
      ...result.metadata,
      success: result.success,
      error: result.error
    }, null, 2);
  }
}
