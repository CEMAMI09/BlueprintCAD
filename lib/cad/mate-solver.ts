/**
 * Advanced Mate Solver - Iterative constraint solver with over-constraint detection
 * Implements Gauss-Seidel style iterative solving for complex mate systems
 */

import * as THREE from 'three';
import { Mate, MateType, GeometryReference } from './mate-system';

/**
 * Degrees of Freedom analysis
 */
export interface DOFAnalysis {
  totalDOF: number;
  constrainedDOF: number;
  remainingDOF: number;
  isOverConstrained: boolean;
  isUnderConstrained: boolean;
  conflictingMates: string[];
  instances: Map<string, InstanceDOF>;
}

export interface InstanceDOF {
  instanceId: string;
  translationDOF: number; // 0-3
  rotationDOF: number;    // 0-3
  totalDOF: number;       // 0-6
  constrainedBy: string[]; // Mate IDs
}

/**
 * Solver configuration
 */
export interface SolverConfig {
  maxIterations: number;
  convergenceThreshold: number;
  relaxationFactor: number; // 0-1, damping for stability
  enableCollisionDetection: boolean;
  collisionMargin: number;
}

/**
 * Solver result
 */
export interface SolverResult {
  converged: boolean;
  iterations: number;
  maxError: number;
  solutions: Map<string, THREE.Matrix4>;
  dofAnalysis: DOFAnalysis;
  collisions: CollisionInfo[];
  warnings: string[];
}

export interface CollisionInfo {
  instance1Id: string;
  instance2Id: string;
  penetrationDepth: number;
  contactPoint: THREE.Vector3;
  contactNormal: THREE.Vector3;
}

/**
 * Constraint equation for iterative solving
 */
interface ConstraintEquation {
  mateId: string;
  instance1Id: string;
  instance2Id: string;
  evaluate: (t1: THREE.Matrix4, t2: THREE.Matrix4) => number; // Error metric
  solve: (t1: THREE.Matrix4, t2: THREE.Matrix4) => { t1: THREE.Matrix4; t2: THREE.Matrix4 };
  weight: number; // Priority (higher = more important)
}

/**
 * Advanced iterative mate solver
 */
export class MateAdvancedSolver {
  private config: SolverConfig = {
    maxIterations: 50,
    convergenceThreshold: 0.001,
    relaxationFactor: 0.7,
    enableCollisionDetection: true,
    collisionMargin: 0.1
  };

  constructor(config?: Partial<SolverConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Solve all mates iteratively with over-constraint detection
   */
  solve(
    mates: Mate[],
    initialTransforms: Map<string, THREE.Matrix4>,
    boundingBoxes?: Map<string, THREE.Box3>
  ): SolverResult {
    const startTime = performance.now();
    const activeMates = mates.filter(m => !m.suppressed);
    
    // Analyze DOF before solving
    const dofAnalysis = this.analyzeDOF(activeMates, initialTransforms);
    
    // Build constraint equations
    const equations = this.buildConstraintEquations(activeMates);
    
    // Current solution state
    const transforms = new Map(initialTransforms);
    const fixedInstances = new Set<string>(); // Ground/fixed instances
    
    // Determine which instances should be fixed (e.g., first instance in chain)
    if (transforms.size > 0) {
      const firstInstance = Array.from(transforms.keys())[0];
      fixedInstances.add(firstInstance);
    }

    let iteration = 0;
    let maxError = Infinity;
    const warnings: string[] = [];

    // Iterative solving
    while (iteration < this.config.maxIterations && maxError > this.config.convergenceThreshold) {
      maxError = 0;

      // Apply each constraint equation
      for (const eq of equations) {
        const t1 = transforms.get(eq.instance1Id);
        const t2 = transforms.get(eq.instance2Id);

        if (!t1 || !t2) continue;

        // Skip if both instances are fixed
        if (fixedInstances.has(eq.instance1Id) && fixedInstances.has(eq.instance2Id)) {
          continue;
        }

        // Evaluate constraint error
        const error = eq.evaluate(t1, t2);
        maxError = Math.max(maxError, Math.abs(error));

        // Solve constraint
        let { t1: newT1, t2: newT2 } = eq.solve(t1.clone(), t2.clone());

        // Apply relaxation (damping)
        const relaxation = this.config.relaxationFactor;
        
        if (!fixedInstances.has(eq.instance1Id)) {
          transforms.set(eq.instance1Id, this.interpolateTransforms(t1, newT1, relaxation));
        }
        
        if (!fixedInstances.has(eq.instance2Id)) {
          transforms.set(eq.instance2Id, this.interpolateTransforms(t2, newT2, relaxation));
        }
      }

      iteration++;
    }

    // Check for over-constraints
    if (dofAnalysis.isOverConstrained) {
      warnings.push('System is over-constrained - some mates may conflict');
    }

    if (!this.hasConverged(maxError)) {
      warnings.push(`Solver did not converge after ${iteration} iterations (error: ${maxError.toFixed(4)})`);
    }

    // Collision detection
    const collisions = this.config.enableCollisionDetection && boundingBoxes
      ? this.detectCollisions(transforms, boundingBoxes)
      : [];

    const executionTime = performance.now() - startTime;
    
    return {
      converged: this.hasConverged(maxError),
      iterations: iteration,
      maxError,
      solutions: transforms,
      dofAnalysis,
      collisions,
      warnings
    };
  }

  /**
   * Analyze degrees of freedom for all instances
   */
  analyzeDOF(mates: Mate[], transforms: Map<string, THREE.Matrix4>): DOFAnalysis {
    const instanceDOFs = new Map<string, InstanceDOF>();
    
    // Initialize all instances with 6 DOF
    for (const instanceId of transforms.keys()) {
      instanceDOFs.set(instanceId, {
        instanceId,
        translationDOF: 3,
        rotationDOF: 3,
        totalDOF: 6,
        constrainedBy: []
      });
    }

    let totalConstrainedDOF = 0;

    // Apply mate constraints
    for (const mate of mates) {
      if (mate.suppressed) continue;

      const dofRemoved = this.getMateConstrainedDOF(mate.type);
      const instances = [mate.geometry1.instanceId, mate.geometry2.instanceId];

      for (const instanceId of instances) {
        const dof = instanceDOFs.get(instanceId);
        if (dof) {
          dof.constrainedBy.push(mate.id);
          // Distribute DOF reduction
          const reduction = dofRemoved / 2;
          const transReduction = Math.min(dof.translationDOF, Math.ceil(reduction / 2));
          const rotReduction = Math.min(dof.rotationDOF, Math.floor(reduction / 2));
          
          dof.translationDOF = Math.max(0, dof.translationDOF - transReduction);
          dof.rotationDOF = Math.max(0, dof.rotationDOF - rotReduction);
          dof.totalDOF = dof.translationDOF + dof.rotationDOF;
        }
      }

      totalConstrainedDOF += dofRemoved;
    }

    const totalInitialDOF = transforms.size * 6;
    const remainingDOF = Math.max(0, totalInitialDOF - totalConstrainedDOF);

    // Detect conflicts
    const conflictingMates: string[] = [];
    if (totalConstrainedDOF > totalInitialDOF) {
      // System is over-constrained, find conflicting mates
      const sortedMates = [...mates].sort((a, b) => b.metadata.createdAt - a.metadata.createdAt);
      let accumulated = 0;
      for (const mate of sortedMates) {
        accumulated += this.getMateConstrainedDOF(mate.type);
        if (accumulated > totalInitialDOF) {
          conflictingMates.push(mate.id);
        }
      }
    }

    return {
      totalDOF: totalInitialDOF,
      constrainedDOF: Math.min(totalConstrainedDOF, totalInitialDOF),
      remainingDOF,
      isOverConstrained: totalConstrainedDOF > totalInitialDOF,
      isUnderConstrained: remainingDOF > 0 && mates.length > 0,
      conflictingMates,
      instances: instanceDOFs
    };
  }

  /**
   * Get DOF constrained by mate type
   */
  private getMateConstrainedDOF(type: MateType): number {
    const dofMap: Record<MateType, number> = {
      [MateType.FIXED]: 6,
      [MateType.REVOLUTE]: 5,
      [MateType.SLIDER]: 5,
      [MateType.PLANAR]: 3,
      [MateType.CYLINDRICAL]: 4,
      [MateType.BALL]: 3
    };
    return dofMap[type] || 0;
  }

  /**
   * Build constraint equations from mates
   */
  private buildConstraintEquations(mates: Mate[]): ConstraintEquation[] {
    const equations: ConstraintEquation[] = [];

    for (const mate of mates) {
      const eq = this.createConstraintEquation(mate);
      if (eq) {
        equations.push(eq);
      }
    }

    // Sort by weight (priority)
    return equations.sort((a, b) => b.weight - a.weight);
  }

  /**
   * Create constraint equation for a mate
   */
  private createConstraintEquation(mate: Mate): ConstraintEquation | null {
    const weight = mate.type === MateType.FIXED ? 1.0 : 0.8;

    switch (mate.type) {
      case MateType.FIXED:
        return this.createFixedEquation(mate, weight);
      case MateType.REVOLUTE:
        return this.createRevoluteEquation(mate, weight);
      case MateType.SLIDER:
        return this.createSliderEquation(mate, weight);
      case MateType.PLANAR:
        return this.createPlanarEquation(mate, weight);
      case MateType.CYLINDRICAL:
        return this.createCylindricalEquation(mate, weight);
      case MateType.BALL:
        return this.createBallEquation(mate, weight);
      default:
        return null;
    }
  }

  /**
   * Fixed constraint equation
   */
  private createFixedEquation(mate: Mate, weight: number): ConstraintEquation {
    return {
      mateId: mate.id,
      instance1Id: mate.geometry1.instanceId,
      instance2Id: mate.geometry2.instanceId,
      weight,
      evaluate: (t1: THREE.Matrix4, t2: THREE.Matrix4) => {
        const p1 = this.getPosition(mate.geometry1, t1);
        const p2 = this.getPosition(mate.geometry2, t2);
        return p1.distanceTo(p2);
      },
      solve: (t1: THREE.Matrix4, t2: THREE.Matrix4) => {
        const p1 = this.getPosition(mate.geometry1, t1);
        const p2 = this.getPosition(mate.geometry2, t2);
        const offset = p1.clone().sub(p2);
        
        // Move t2 to align with t1
        const pos2 = new THREE.Vector3();
        const rot2 = new THREE.Quaternion();
        const scale2 = new THREE.Vector3();
        t2.decompose(pos2, rot2, scale2);
        
        pos2.add(offset);
        const newT2 = new THREE.Matrix4().compose(pos2, rot2, scale2);
        
        return { t1, t2: newT2 };
      }
    };
  }

  /**
   * Revolute constraint equation
   */
  private createRevoluteEquation(mate: Mate, weight: number): ConstraintEquation {
    return {
      mateId: mate.id,
      instance1Id: mate.geometry1.instanceId,
      instance2Id: mate.geometry2.instanceId,
      weight,
      evaluate: (t1: THREE.Matrix4, t2: THREE.Matrix4) => {
        const p1 = this.getPosition(mate.geometry1, t1);
        const p2 = this.getPosition(mate.geometry2, t2);
        const axis1 = this.getDirection(mate.geometry1, t1);
        const axis2 = this.getDirection(mate.geometry2, t2);
        
        const posError = p1.distanceTo(p2);
        const axisError = 1 - Math.abs(axis1.dot(axis2)); // Should be parallel
        
        return posError + axisError;
      },
      solve: (t1: THREE.Matrix4, t2: THREE.Matrix4) => {
        const p1 = this.getPosition(mate.geometry1, t1);
        const p2 = this.getPosition(mate.geometry2, t2);
        const axis1 = this.getDirection(mate.geometry1, t1);
        const axis2 = this.getDirection(mate.geometry2, t2);
        
        // Align axes
        const cross = new THREE.Vector3().crossVectors(axis2, axis1).normalize();
        const angle = axis2.angleTo(axis1);
        const alignRot = new THREE.Quaternion().setFromAxisAngle(cross, angle);
        
        // Align positions
        const offset = p1.clone().sub(p2);
        
        const pos2 = new THREE.Vector3();
        const rot2 = new THREE.Quaternion();
        const scale2 = new THREE.Vector3();
        t2.decompose(pos2, rot2, scale2);
        
        pos2.add(offset);
        rot2.premultiply(alignRot);
        
        const newT2 = new THREE.Matrix4().compose(pos2, rot2, scale2);
        
        return { t1, t2: newT2 };
      }
    };
  }

  /**
   * Slider constraint equation
   */
  private createSliderEquation(mate: Mate, weight: number): ConstraintEquation {
    return {
      mateId: mate.id,
      instance1Id: mate.geometry1.instanceId,
      instance2Id: mate.geometry2.instanceId,
      weight,
      evaluate: (t1: THREE.Matrix4, t2: THREE.Matrix4) => {
        const axis1 = this.getDirection(mate.geometry1, t1);
        const axis2 = this.getDirection(mate.geometry2, t2);
        return 1 - Math.abs(axis1.dot(axis2));
      },
      solve: (t1: THREE.Matrix4, t2: THREE.Matrix4) => {
        const axis1 = this.getDirection(mate.geometry1, t1);
        const axis2 = this.getDirection(mate.geometry2, t2);
        
        const cross = new THREE.Vector3().crossVectors(axis2, axis1).normalize();
        const angle = axis2.angleTo(axis1);
        const alignRot = new THREE.Quaternion().setFromAxisAngle(cross, angle);
        
        const pos2 = new THREE.Vector3();
        const rot2 = new THREE.Quaternion();
        const scale2 = new THREE.Vector3();
        t2.decompose(pos2, rot2, scale2);
        
        rot2.premultiply(alignRot);
        const newT2 = new THREE.Matrix4().compose(pos2, rot2, scale2);
        
        return { t1, t2: newT2 };
      }
    };
  }

  /**
   * Planar constraint equation
   */
  private createPlanarEquation(mate: Mate, weight: number): ConstraintEquation {
    return {
      mateId: mate.id,
      instance1Id: mate.geometry1.instanceId,
      instance2Id: mate.geometry2.instanceId,
      weight,
      evaluate: (t1: THREE.Matrix4, t2: THREE.Matrix4) => {
        const n1 = this.getNormal(mate.geometry1, t1);
        const n2 = this.getNormal(mate.geometry2, t2);
        return 1 - Math.abs(n1.dot(n2));
      },
      solve: (t1: THREE.Matrix4, t2: THREE.Matrix4) => {
        const n1 = this.getNormal(mate.geometry1, t1);
        const n2 = this.getNormal(mate.geometry2, t2);
        
        const cross = new THREE.Vector3().crossVectors(n2, n1.clone().negate()).normalize();
        const angle = n2.angleTo(n1.clone().negate());
        const alignRot = new THREE.Quaternion().setFromAxisAngle(cross, angle);
        
        const pos2 = new THREE.Vector3();
        const rot2 = new THREE.Quaternion();
        const scale2 = new THREE.Vector3();
        t2.decompose(pos2, rot2, scale2);
        
        rot2.premultiply(alignRot);
        const newT2 = new THREE.Matrix4().compose(pos2, rot2, scale2);
        
        return { t1, t2: newT2 };
      }
    };
  }

  /**
   * Cylindrical constraint equation
   */
  private createCylindricalEquation(mate: Mate, weight: number): ConstraintEquation {
    return this.createRevoluteEquation(mate, weight * 0.9);
  }

  /**
   * Ball constraint equation
   */
  private createBallEquation(mate: Mate, weight: number): ConstraintEquation {
    return this.createFixedEquation(mate, weight * 0.8);
  }

  /**
   * Interpolate between two transforms with factor
   */
  private interpolateTransforms(t1: THREE.Matrix4, t2: THREE.Matrix4, factor: number): THREE.Matrix4 {
    const pos1 = new THREE.Vector3();
    const rot1 = new THREE.Quaternion();
    const scale1 = new THREE.Vector3();
    t1.decompose(pos1, rot1, scale1);

    const pos2 = new THREE.Vector3();
    const rot2 = new THREE.Quaternion();
    const scale2 = new THREE.Vector3();
    t2.decompose(pos2, rot2, scale2);

    const pos = pos1.clone().lerp(pos2, factor);
    const rot = rot1.clone().slerp(rot2, factor);
    const scale = scale1.clone().lerp(scale2, factor);

    return new THREE.Matrix4().compose(pos, rot, scale);
  }

  /**
   * Detect collisions between instances using optimized broad-phase + narrow-phase
   */
  private detectCollisions(
    transforms: Map<string, THREE.Matrix4>,
    boundingBoxes: Map<string, THREE.Box3>
  ): CollisionInfo[] {
    const collisions: CollisionInfo[] = [];
    const instances = Array.from(transforms.keys());

    // Broad phase: Axis-Aligned Bounding Box (AABB) overlap test
    const aabbs = new Map<string, THREE.Box3>();
    for (const [instanceId, transform] of transforms) {
      const bbox = boundingBoxes.get(instanceId);
      if (bbox) {
        const aabb = bbox.clone().applyMatrix4(transform);
        aabbs.set(instanceId, aabb);
      }
    }

    // Check all pairs (with early exit optimization)
    for (let i = 0; i < instances.length; i++) {
      for (let j = i + 1; j < instances.length; j++) {
        const id1 = instances[i];
        const id2 = instances[j];
        
        const aabb1 = aabbs.get(id1);
        const aabb2 = aabbs.get(id2);
        
        if (!aabb1 || !aabb2) continue;

        // Broad phase: AABB intersection test
        if (aabb1.intersectsBox(aabb2)) {
          // Narrow phase: Calculate penetration
          const penetration = this.calculatePenetration(aabb1, aabb2);
          
          if (penetration.depth > this.config.collisionMargin) {
            collisions.push({
              instance1Id: id1,
              instance2Id: id2,
              penetrationDepth: penetration.depth,
              contactPoint: penetration.point,
              contactNormal: penetration.normal
            });
          }
        }
      }
    }

    return collisions;
  }

  /**
   * Calculate penetration between two AABBs
   */
  private calculatePenetration(box1: THREE.Box3, box2: THREE.Box3): {
    depth: number;
    point: THREE.Vector3;
    normal: THREE.Vector3;
  } {
    const center1 = new THREE.Vector3();
    box1.getCenter(center1);
    const center2 = new THREE.Vector3();
    box2.getCenter(center2);

    const size1 = new THREE.Vector3();
    box1.getSize(size1);
    const size2 = new THREE.Vector3();
    box2.getSize(size2);

    // Calculate overlap on each axis
    const overlap = new THREE.Vector3(
      Math.min(box1.max.x, box2.max.x) - Math.max(box1.min.x, box2.min.x),
      Math.min(box1.max.y, box2.max.y) - Math.max(box1.min.y, box2.min.y),
      Math.min(box1.max.z, box2.max.z) - Math.max(box1.min.z, box2.min.z)
    );

    // Find minimum overlap (penetration axis)
    let depth = overlap.x;
    let normal = new THREE.Vector3(1, 0, 0);
    
    if (overlap.y < depth) {
      depth = overlap.y;
      normal = new THREE.Vector3(0, 1, 0);
    }
    
    if (overlap.z < depth) {
      depth = overlap.z;
      normal = new THREE.Vector3(0, 0, 1);
    }

    // Determine normal direction
    if (center2.clone().sub(center1).dot(normal) < 0) {
      normal.negate();
    }

    // Contact point (on surface between boxes)
    const contactPoint = center1.clone().lerp(center2, 0.5);

    return { depth, point: contactPoint, normal };
  }

  /**
   * Check if solver has converged
   */
  private hasConverged(error: number): boolean {
    return error < this.config.convergenceThreshold;
  }

  // Helper methods
  private getPosition(geo: GeometryReference, transform: THREE.Matrix4): THREE.Vector3 {
    const pos = geo.position || new THREE.Vector3();
    return pos.clone().applyMatrix4(transform);
  }

  private getDirection(geo: GeometryReference, transform: THREE.Matrix4): THREE.Vector3 {
    const dir = geo.direction || new THREE.Vector3(0, 1, 0);
    return dir.clone().transformDirection(transform).normalize();
  }

  private getNormal(geo: GeometryReference, transform: THREE.Matrix4): THREE.Vector3 {
    const normal = geo.normal || new THREE.Vector3(0, 0, 1);
    return normal.clone().transformDirection(transform).normalize();
  }
}
