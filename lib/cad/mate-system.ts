/**
 * Mate System - Geometric constraints for assembly positioning
 * Supports Fixed, Revolute, Slider, Planar, Cylindrical, and Ball mates
 */

import * as THREE from 'three';

/**
 * Mate types define how two parts can move relative to each other
 */
export enum MateType {
  FIXED = 'fixed',           // 0 DOF - completely fixed
  REVOLUTE = 'revolute',     // 1 DOF - rotation around axis
  SLIDER = 'slider',         // 1 DOF - translation along axis
  PLANAR = 'planar',         // 3 DOF - translation in plane + rotation around normal
  CYLINDRICAL = 'cylindrical', // 2 DOF - rotation + translation along axis
  BALL = 'ball'              // 3 DOF - rotation around point (spherical joint)
}

/**
 * Geometry types for mate selection
 */
export enum GeometryType {
  FACE = 'face',
  EDGE = 'edge',
  VERTEX = 'vertex',
  POINT = 'point',
  AXIS = 'axis',
  PLANE = 'plane'
}

/**
 * Geometry reference for mate selection
 */
export interface GeometryReference {
  type: GeometryType;
  instanceId: string;
  index?: number;           // Face/edge/vertex index
  position?: THREE.Vector3; // For point references
  direction?: THREE.Vector3; // For axis/plane normal
  normal?: THREE.Vector3;   // For face/plane
}

/**
 * Mate constraint definition
 */
export interface Mate {
  id: string;
  name: string;
  type: MateType;
  geometry1: GeometryReference;
  geometry2: GeometryReference;
  offset?: number;          // Distance offset (for planar, cylindrical)
  angle?: number;           // Angular offset (for revolute)
  limits?: {
    min?: number;
    max?: number;
  };
  suppressed: boolean;
  solved: boolean;
  error?: string;
  metadata: {
    createdAt: number;
    updatedAt: number;
    createdBy?: string;
  };
}

/**
 * Mate solution result
 */
export interface MateSolution {
  instanceId: string;
  transform: THREE.Matrix4;
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  satisfied: boolean;
  error?: string;
}

/**
 * Mate System - manages geometric constraints between part instances
 */
export class MateSystem {
  private mates: Map<string, Mate> = new Map();
  private instanceTransforms: Map<string, THREE.Matrix4> = new Map();

  /**
   * Add a new mate constraint
   */
  addMate(
    name: string,
    type: MateType,
    geometry1: GeometryReference,
    geometry2: GeometryReference,
    options?: {
      offset?: number;
      angle?: number;
      limits?: { min?: number; max?: number };
    }
  ): Mate {
    const mate: Mate = {
      id: `mate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      type,
      geometry1,
      geometry2,
      offset: options?.offset,
      angle: options?.angle,
      limits: options?.limits,
      suppressed: false,
      solved: false,
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    };

    this.mates.set(mate.id, mate);
    return mate;
  }

  /**
   * Remove a mate constraint
   */
  removeMate(mateId: string): boolean {
    return this.mates.delete(mateId);
  }

  /**
   * Get all mates
   */
  getAllMates(): Mate[] {
    return Array.from(this.mates.values());
  }

  /**
   * Get mate by ID
   */
  getMate(mateId: string): Mate | undefined {
    return this.mates.get(mateId);
  }

  /**
   * Suppress/unsuppress a mate
   */
  setMateSuppressed(mateId: string, suppressed: boolean): void {
    const mate = this.mates.get(mateId);
    if (mate) {
      mate.suppressed = suppressed;
      mate.metadata.updatedAt = Date.now();
    }
  }

  /**
   * Solve mate constraints and compute transforms
   * @deprecated Use MateAdvancedSolver for better results
   */
  solveMates(instanceTransforms: Map<string, THREE.Matrix4>): MateSolution[] {
    this.instanceTransforms = new Map(instanceTransforms);
    const solutions: MateSolution[] = [];

    // Solve each mate constraint
    for (const mate of this.mates.values()) {
      if (mate.suppressed) continue;

      try {
        const solution = this.solveMate(mate);
        solutions.push(solution);
        mate.solved = solution.satisfied;
        mate.error = solution.error;
      } catch (error) {
        mate.solved = false;
        mate.error = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    return solutions;
  }

  /**
   * Solve a single mate constraint
   */
  private solveMate(mate: Mate): MateSolution {
    const instance1Transform = this.instanceTransforms.get(mate.geometry1.instanceId);
    const instance2Transform = this.instanceTransforms.get(mate.geometry2.instanceId);

    if (!instance1Transform || !instance2Transform) {
      return {
        instanceId: mate.geometry2.instanceId,
        transform: instance2Transform || new THREE.Matrix4(),
        position: new THREE.Vector3(),
        rotation: new THREE.Quaternion(),
        satisfied: false,
        error: 'Instance transform not found'
      };
    }

    // Solve based on mate type
    switch (mate.type) {
      case MateType.FIXED:
        return this.solveFixedMate(mate, instance1Transform, instance2Transform);
      
      case MateType.REVOLUTE:
        return this.solveRevoluteMate(mate, instance1Transform, instance2Transform);
      
      case MateType.SLIDER:
        return this.solveSliderMate(mate, instance1Transform, instance2Transform);
      
      case MateType.PLANAR:
        return this.solvePlanarMate(mate, instance1Transform, instance2Transform);
      
      case MateType.CYLINDRICAL:
        return this.solveCylindricalMate(mate, instance1Transform, instance2Transform);
      
      case MateType.BALL:
        return this.solveBallMate(mate, instance1Transform, instance2Transform);
      
      default:
        return {
          instanceId: mate.geometry2.instanceId,
          transform: instance2Transform,
          position: new THREE.Vector3(),
          rotation: new THREE.Quaternion(),
          satisfied: false,
          error: `Unsupported mate type: ${mate.type}`
        };
    }
  }

  /**
   * Solve Fixed mate (0 DOF)
   * Locks two parts together completely
   */
  private solveFixedMate(
    mate: Mate,
    transform1: THREE.Matrix4,
    transform2: THREE.Matrix4
  ): MateSolution {
    const pos1 = new THREE.Vector3();
    const rot1 = new THREE.Quaternion();
    const scale1 = new THREE.Vector3();
    transform1.decompose(pos1, rot1, scale1);

    // Get geometry positions in world space
    const point1 = this.getGeometryPosition(mate.geometry1, transform1);
    const point2 = this.getGeometryPosition(mate.geometry2, transform2);

    // Calculate offset to align points
    const offset = point1.clone().sub(point2);

    // Apply offset to instance2
    const newTransform = transform2.clone();
    const pos2 = new THREE.Vector3();
    const rot2 = new THREE.Quaternion();
    const scale2 = new THREE.Vector3();
    newTransform.decompose(pos2, rot2, scale2);

    pos2.add(offset);
    newTransform.compose(pos2, rot2, scale2);

    return {
      instanceId: mate.geometry2.instanceId,
      transform: newTransform,
      position: pos2,
      rotation: rot2,
      satisfied: true
    };
  }

  /**
   * Solve Revolute mate (1 DOF - rotation)
   * Allows rotation around a common axis
   */
  private solveRevoluteMate(
    mate: Mate,
    transform1: THREE.Matrix4,
    transform2: THREE.Matrix4
  ): MateSolution {
    // Get axis directions
    const axis1 = this.getGeometryDirection(mate.geometry1, transform1);
    const axis2 = this.getGeometryDirection(mate.geometry2, transform2);
    const point1 = this.getGeometryPosition(mate.geometry1, transform1);
    const point2 = this.getGeometryPosition(mate.geometry2, transform2);

    // Align axes (make parallel and opposite)
    const rotationAxis = new THREE.Vector3().crossVectors(axis2, axis1.clone().negate()).normalize();
    const angle = axis2.angleTo(axis1.clone().negate());

    const alignmentRotation = new THREE.Quaternion().setFromAxisAngle(rotationAxis, angle);

    // Apply angular offset if specified
    let finalRotation = alignmentRotation;
    if (mate.angle !== undefined) {
      const offsetRotation = new THREE.Quaternion().setFromAxisAngle(axis1, mate.angle);
      finalRotation = offsetRotation.multiply(alignmentRotation);
    }

    // Position: align points on axis
    const offset = point1.clone().sub(point2);

    const pos2 = new THREE.Vector3();
    const rot2 = new THREE.Quaternion();
    const scale2 = new THREE.Vector3();
    transform2.decompose(pos2, rot2, scale2);

    pos2.add(offset);
    rot2.premultiply(finalRotation);

    const newTransform = new THREE.Matrix4().compose(pos2, rot2, scale2);

    return {
      instanceId: mate.geometry2.instanceId,
      transform: newTransform,
      position: pos2,
      rotation: rot2,
      satisfied: true
    };
  }

  /**
   * Solve Slider mate (1 DOF - translation)
   * Allows translation along an axis
   */
  private solveSliderMate(
    mate: Mate,
    transform1: THREE.Matrix4,
    transform2: THREE.Matrix4
  ): MateSolution {
    const axis1 = this.getGeometryDirection(mate.geometry1, transform1);
    const axis2 = this.getGeometryDirection(mate.geometry2, transform2);
    const point1 = this.getGeometryPosition(mate.geometry1, transform1);
    const point2 = this.getGeometryPosition(mate.geometry2, transform2);

    // Align axes
    const rotationAxis = new THREE.Vector3().crossVectors(axis2, axis1).normalize();
    const angle = axis2.angleTo(axis1);
    const alignmentRotation = new THREE.Quaternion().setFromAxisAngle(rotationAxis, angle);

    // Project point2 onto axis through point1
    const offset = point2.clone().sub(point1);
    const projectedDistance = offset.dot(axis1);
    const projectedPoint = point1.clone().add(axis1.clone().multiplyScalar(projectedDistance));
    const translationOffset = projectedPoint.clone().sub(point2);

    // Apply offset if specified
    if (mate.offset !== undefined) {
      translationOffset.add(axis1.clone().multiplyScalar(mate.offset));
    }

    const pos2 = new THREE.Vector3();
    const rot2 = new THREE.Quaternion();
    const scale2 = new THREE.Vector3();
    transform2.decompose(pos2, rot2, scale2);

    pos2.add(translationOffset);
    rot2.premultiply(alignmentRotation);

    const newTransform = new THREE.Matrix4().compose(pos2, rot2, scale2);

    return {
      instanceId: mate.geometry2.instanceId,
      transform: newTransform,
      position: pos2,
      rotation: rot2,
      satisfied: true
    };
  }

  /**
   * Solve Planar mate (3 DOF)
   * Constrains to a plane - translation in plane + rotation around normal
   */
  private solvePlanarMate(
    mate: Mate,
    transform1: THREE.Matrix4,
    transform2: THREE.Matrix4
  ): MateSolution {
    const normal1 = this.getGeometryNormal(mate.geometry1, transform1);
    const normal2 = this.getGeometryNormal(mate.geometry2, transform2);
    const point1 = this.getGeometryPosition(mate.geometry1, transform1);
    const point2 = this.getGeometryPosition(mate.geometry2, transform2);

    // Align normals (make opposite for coplanar)
    const rotationAxis = new THREE.Vector3().crossVectors(normal2, normal1.clone().negate()).normalize();
    const angle = normal2.angleTo(normal1.clone().negate());
    const alignmentRotation = new THREE.Quaternion().setFromAxisAngle(rotationAxis, angle);

    // Project point2 onto plane through point1
    const offset = point2.clone().sub(point1);
    const distance = offset.dot(normal1);
    const projectedPoint = point2.clone().sub(normal1.clone().multiplyScalar(distance));
    const translationOffset = point1.clone().sub(projectedPoint);

    // Apply offset if specified
    if (mate.offset !== undefined) {
      translationOffset.add(normal1.clone().multiplyScalar(mate.offset));
    }

    const pos2 = new THREE.Vector3();
    const rot2 = new THREE.Quaternion();
    const scale2 = new THREE.Vector3();
    transform2.decompose(pos2, rot2, scale2);

    pos2.add(translationOffset);
    rot2.premultiply(alignmentRotation);

    const newTransform = new THREE.Matrix4().compose(pos2, rot2, scale2);

    return {
      instanceId: mate.geometry2.instanceId,
      transform: newTransform,
      position: pos2,
      rotation: rot2,
      satisfied: true
    };
  }

  /**
   * Solve Cylindrical mate (2 DOF)
   * Rotation + translation along axis (like a bolt in a hole)
   */
  private solveCylindricalMate(
    mate: Mate,
    transform1: THREE.Matrix4,
    transform2: THREE.Matrix4
  ): MateSolution {
    const axis1 = this.getGeometryDirection(mate.geometry1, transform1);
    const axis2 = this.getGeometryDirection(mate.geometry2, transform2);
    const point1 = this.getGeometryPosition(mate.geometry1, transform1);
    const point2 = this.getGeometryPosition(mate.geometry2, transform2);

    // Align axes
    const rotationAxis = new THREE.Vector3().crossVectors(axis2, axis1).normalize();
    const angle = axis2.angleTo(axis1);
    const alignmentRotation = new THREE.Quaternion().setFromAxisAngle(rotationAxis, angle);

    // Project point2 onto axis through point1
    const offset = point2.clone().sub(point1);
    const projectedDistance = offset.dot(axis1);
    const projectedPoint = point1.clone().add(axis1.clone().multiplyScalar(projectedDistance));
    const translationOffset = projectedPoint.clone().sub(point2);

    const pos2 = new THREE.Vector3();
    const rot2 = new THREE.Quaternion();
    const scale2 = new THREE.Vector3();
    transform2.decompose(pos2, rot2, scale2);

    pos2.add(translationOffset);
    rot2.premultiply(alignmentRotation);

    const newTransform = new THREE.Matrix4().compose(pos2, rot2, scale2);

    return {
      instanceId: mate.geometry2.instanceId,
      transform: newTransform,
      position: pos2,
      rotation: rot2,
      satisfied: true
    };
  }

  /**
   * Solve Ball mate (3 DOF - rotation only)
   * Like a ball-and-socket joint
   */
  private solveBallMate(
    mate: Mate,
    transform1: THREE.Matrix4,
    transform2: THREE.Matrix4
  ): MateSolution {
    const point1 = this.getGeometryPosition(mate.geometry1, transform1);
    const point2 = this.getGeometryPosition(mate.geometry2, transform2);

    // Simply align the points
    const offset = point1.clone().sub(point2);

    const pos2 = new THREE.Vector3();
    const rot2 = new THREE.Quaternion();
    const scale2 = new THREE.Vector3();
    transform2.decompose(pos2, rot2, scale2);

    pos2.add(offset);

    const newTransform = new THREE.Matrix4().compose(pos2, rot2, scale2);

    return {
      instanceId: mate.geometry2.instanceId,
      transform: newTransform,
      position: pos2,
      rotation: rot2,
      satisfied: true
    };
  }

  /**
   * Get position from geometry reference
   */
  private getGeometryPosition(geo: GeometryReference, transform: THREE.Matrix4): THREE.Vector3 {
    if (geo.position) {
      return geo.position.clone().applyMatrix4(transform);
    }
    
    // Default to origin if no position specified
    const origin = new THREE.Vector3();
    return origin.applyMatrix4(transform);
  }

  /**
   * Get direction from geometry reference (for axes, edges)
   */
  private getGeometryDirection(geo: GeometryReference, transform: THREE.Matrix4): THREE.Vector3 {
    const direction = geo.direction || new THREE.Vector3(0, 1, 0);
    const transformedDir = direction.clone().transformDirection(transform).normalize();
    return transformedDir;
  }

  /**
   * Get normal from geometry reference (for faces, planes)
   */
  private getGeometryNormal(geo: GeometryReference, transform: THREE.Matrix4): THREE.Vector3 {
    const normal = geo.normal || new THREE.Vector3(0, 0, 1);
    const transformedNormal = normal.clone().transformDirection(transform).normalize();
    return transformedNormal;
  }

  /**
   * Export mates to JSON
   */
  toJSON(): any[] {
    return Array.from(this.mates.values()).map(mate => ({
      id: mate.id,
      name: mate.name,
      type: mate.type,
      geometry1: this.geometryToJSON(mate.geometry1),
      geometry2: this.geometryToJSON(mate.geometry2),
      offset: mate.offset,
      angle: mate.angle,
      limits: mate.limits,
      suppressed: mate.suppressed,
      solved: mate.solved,
      error: mate.error,
      metadata: mate.metadata
    }));
  }

  /**
   * Import mates from JSON
   */
  fromJSON(data: any[]): void {
    this.mates.clear();
    for (const mateData of data) {
      const mate: Mate = {
        id: mateData.id,
        name: mateData.name,
        type: mateData.type as MateType,
        geometry1: this.geometryFromJSON(mateData.geometry1),
        geometry2: this.geometryFromJSON(mateData.geometry2),
        offset: mateData.offset,
        angle: mateData.angle,
        limits: mateData.limits,
        suppressed: mateData.suppressed || false,
        solved: mateData.solved || false,
        error: mateData.error,
        metadata: mateData.metadata
      };
      this.mates.set(mate.id, mate);
    }
  }

  private geometryToJSON(geo: GeometryReference): any {
    return {
      type: geo.type,
      instanceId: geo.instanceId,
      index: geo.index,
      position: geo.position ? { x: geo.position.x, y: geo.position.y, z: geo.position.z } : undefined,
      direction: geo.direction ? { x: geo.direction.x, y: geo.direction.y, z: geo.direction.z } : undefined,
      normal: geo.normal ? { x: geo.normal.x, y: geo.normal.y, z: geo.normal.z } : undefined
    };
  }

  private geometryFromJSON(data: any): GeometryReference {
    return {
      type: data.type as GeometryType,
      instanceId: data.instanceId,
      index: data.index,
      position: data.position ? new THREE.Vector3(data.position.x, data.position.y, data.position.z) : undefined,
      direction: data.direction ? new THREE.Vector3(data.direction.x, data.direction.y, data.direction.z) : undefined,
      normal: data.normal ? new THREE.Vector3(data.normal.x, data.normal.y, data.normal.z) : undefined
    };
  }
}
