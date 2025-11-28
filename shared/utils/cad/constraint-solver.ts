/**
 * Sketch Constraint Solver
 * 
 * Implements parametric constraint solving for 2D sketch geometry.
 * Supports geometric constraints (parallel, perpendicular, tangent, etc.)
 * and dimensional constraints (distance, angle, radius).
 * 
 * Uses iterative Newton-Raphson method for constraint satisfaction.
 */

import * as THREE from 'three';
import { AdvancedSketchEntity } from './sketch-tools';

// ============================================================================
// Constraint Types
// ============================================================================

export type ConstraintType =
  // Geometric constraints
  | 'horizontal'
  | 'vertical'
  | 'parallel'
  | 'perpendicular'
  | 'tangent'
  | 'coincident'
  | 'concentric'
  | 'midpoint'
  | 'equal'
  | 'symmetric'
  | 'collinear'
  // Dimensional constraints
  | 'distance'
  | 'angle'
  | 'radius'
  | 'length'
  | 'diameter';

export interface Constraint {
  id: string;
  type: ConstraintType;
  entityIds: string[]; // References to sketch entities
  pointIndices?: number[]; // Which points on entities
  value?: number; // For dimensional constraints
  locked?: boolean; // Cannot be auto-removed
  autoInferred?: boolean; // Was automatically detected
  satisfied?: boolean; // Current state
  error?: number; // Current error value
  priority?: number; // For conflict resolution (1-10)
  
  // Version control
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface ConstraintSystem {
  constraints: Map<string, Constraint>;
  entities: Map<string, AdvancedSketchEntity>;
  degrees_of_freedom: number;
  conflicts: Conflict[];
  solving: boolean;
}

export interface Conflict {
  id: string;
  constraintIds: string[];
  message: string;
  severity: 'warning' | 'error';
  suggestions: string[];
}

export interface SolverResult {
  success: boolean;
  iterations: number;
  error: number;
  conflicts: Conflict[];
  modifiedEntities: string[];
  executionTime: number;
}

// ============================================================================
// Constraint Solver
// ============================================================================

export class ConstraintSolver {
  private system: ConstraintSystem;
  private maxIterations: number = 100;
  private tolerance: number = 1e-6;
  private dampingFactor: number = 0.5;
  
  constructor() {
    this.system = {
      constraints: new Map(),
      entities: new Map(),
      degrees_of_freedom: 0,
      conflicts: [],
      solving: false
    };
  }
  
  // ==========================================================================
  // Public API
  // ==========================================================================
  
  /**
   * Add constraint to system
   */
  addConstraint(constraint: Omit<Constraint, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Constraint {
    const fullConstraint: Constraint = {
      ...constraint,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
      satisfied: false,
      error: Infinity
    };
    
    // Validate constraint
    const validation = this.validateConstraint(fullConstraint);
    if (!validation.valid) {
      throw new Error(`Invalid constraint: ${validation.reason}`);
    }
    
    this.system.constraints.set(fullConstraint.id, fullConstraint);
    this.updateDegreesOfFreedom();
    
    return fullConstraint;
  }
  
  /**
   * Remove constraint from system
   */
  removeConstraint(constraintId: string): boolean {
    const removed = this.system.constraints.delete(constraintId);
    if (removed) {
      this.updateDegreesOfFreedom();
    }
    return removed;
  }
  
  /**
   * Update constraint value (for dimensional constraints)
   */
  updateConstraint(constraintId: string, updates: Partial<Constraint>): void {
    const constraint = this.system.constraints.get(constraintId);
    if (!constraint) {
      throw new Error(`Constraint ${constraintId} not found`);
    }
    
    Object.assign(constraint, updates);
    constraint.updatedAt = Date.now();
    constraint.version++;
  }
  
  /**
   * Add entity to constraint system
   */
  addEntity(entity: AdvancedSketchEntity): void {
    this.system.entities.set(entity.id, entity);
    this.updateDegreesOfFreedom();
  }
  
  /**
   * Remove entity and associated constraints
   */
  removeEntity(entityId: string): void {
    this.system.entities.delete(entityId);
    
    // Remove constraints referencing this entity
    const toRemove: string[] = [];
    this.system.constraints.forEach((constraint, id) => {
      if (constraint.entityIds.includes(entityId)) {
        toRemove.push(id);
      }
    });
    
    toRemove.forEach(id => this.removeConstraint(id));
  }
  
  /**
   * Solve constraint system
   */
  async solve(): Promise<SolverResult> {
    const startTime = performance.now();
    
    if (this.system.solving) {
      return {
        success: false,
        iterations: 0,
        error: 0,
        conflicts: [],
        modifiedEntities: [],
        executionTime: 0
      };
    }
    
    this.system.solving = true;
    this.system.conflicts = [];
    
    const modifiedEntities: Set<string> = new Set();
    let iterations = 0;
    let error = Infinity;
    
    try {
      // Detect conflicts before solving
      this.detectConflicts();
      
      if (this.system.conflicts.some(c => c.severity === 'error')) {
        return {
          success: false,
          iterations: 0,
          error: Infinity,
          conflicts: this.system.conflicts,
          modifiedEntities: [],
          executionTime: performance.now() - startTime
        };
      }
      
      // Newton-Raphson iteration
      for (iterations = 0; iterations < this.maxIterations; iterations++) {
        const jacobian = this.buildJacobian();
        const residuals = this.computeResiduals();
        
        error = Math.sqrt(residuals.reduce((sum, r) => sum + r * r, 0));
        
        if (error < this.tolerance) {
          break;
        }
        
        // Solve Jx = -r for updates
        const updates = this.solveLinearSystem(jacobian, residuals);
        
        // Apply updates with damping
        this.applyUpdates(updates, modifiedEntities);
      }
      
      // Update constraint satisfaction
      this.updateConstraintStates();
      
      const executionTime = performance.now() - startTime;
      
      return {
        success: error < this.tolerance,
        iterations,
        error,
        conflicts: this.system.conflicts,
        modifiedEntities: Array.from(modifiedEntities),
        executionTime
      };
      
    } finally {
      this.system.solving = false;
    }
  }
  
  /**
   * Auto-infer constraints from geometry
   */
  autoInferConstraints(): Constraint[] {
    const inferred: Constraint[] = [];
    const entities = Array.from(this.system.entities.values());
    
    // Check pairs of entities
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const constraints = this.inferConstraintsBetween(entities[i], entities[j]);
        inferred.push(...constraints);
      }
    }
    
    // Check individual entities
    entities.forEach(entity => {
      const constraints = this.inferConstraintsFor(entity);
      inferred.push(...constraints);
    });
    
    // Add to system if not redundant
    inferred.forEach(c => {
      if (!this.isDuplicateConstraint(c)) {
        this.system.constraints.set(c.id, c);
      }
    });
    
    return inferred;
  }
  
  /**
   * Get system state for serialization
   */
  exportState(): any {
    return {
      constraints: Array.from(this.system.constraints.values()),
      degrees_of_freedom: this.system.degrees_of_freedom,
      conflicts: this.system.conflicts
    };
  }
  
  /**
   * Restore system state
   */
  importState(state: any): void {
    this.system.constraints.clear();
    
    if (state.constraints) {
      state.constraints.forEach((c: Constraint) => {
        this.system.constraints.set(c.id, c);
      });
    }
    
    this.updateDegreesOfFreedom();
  }
  
  /**
   * Get system statistics
   */
  getStatistics(): {
    totalConstraints: number;
    satisfiedConstraints: number;
    geometricConstraints: number;
    dimensionalConstraints: number;
    conflicts: number;
    degreesOfFreedom: number;
  } {
    const constraints = Array.from(this.system.constraints.values());
    
    return {
      totalConstraints: constraints.length,
      satisfiedConstraints: constraints.filter(c => c.satisfied).length,
      geometricConstraints: constraints.filter(c => !c.value).length,
      dimensionalConstraints: constraints.filter(c => c.value !== undefined).length,
      conflicts: this.system.conflicts.length,
      degreesOfFreedom: this.system.degrees_of_freedom
    };
  }
  
  // ==========================================================================
  // Private Methods
  // ==========================================================================
  
  /**
   * Validate constraint is well-formed
   */
  private validateConstraint(constraint: Constraint): { valid: boolean; reason?: string } {
    // Check entity references exist
    for (const entityId of constraint.entityIds) {
      if (!this.system.entities.has(entityId)) {
        return { valid: false, reason: `Entity ${entityId} not found` };
      }
    }
    
    // Check constraint type requirements
    switch (constraint.type) {
      case 'parallel':
      case 'perpendicular':
      case 'equal':
        if (constraint.entityIds.length !== 2) {
          return { valid: false, reason: `${constraint.type} requires 2 entities` };
        }
        break;
        
      case 'coincident':
        if (constraint.entityIds.length !== 2 || !constraint.pointIndices || constraint.pointIndices.length !== 2) {
          return { valid: false, reason: 'Coincident requires 2 points' };
        }
        break;
        
      case 'distance':
      case 'angle':
        if (constraint.value === undefined) {
          return { valid: false, reason: `${constraint.type} requires value` };
        }
        break;
    }
    
    return { valid: true };
  }
  
  /**
   * Update degrees of freedom count
   */
  private updateDegreesOfFreedom(): void {
    const entities = Array.from(this.system.entities.values());
    
    // Calculate total DOF from entities
    let totalDOF = 0;
    entities.forEach(entity => {
      switch (entity.type) {
        case 'line':
          totalDOF += 4; // 2 points × 2 coords
          break;
        case 'circle':
          totalDOF += 3; // center (2) + radius (1)
          break;
        case 'arc':
          totalDOF += 5; // center (2) + radius (1) + angles (2)
          break;
        case 'ellipse':
          totalDOF += 5; // center (2) + 2 radii (2) + rotation (1)
          break;
        default:
          totalDOF += entity.points.length * 2;
      }
    });
    
    // Subtract constraints
    const constraintCount = this.system.constraints.size;
    this.system.degrees_of_freedom = Math.max(0, totalDOF - constraintCount);
  }
  
  /**
   * Build Jacobian matrix
   */
  private buildJacobian(): number[][] {
    const constraints = Array.from(this.system.constraints.values());
    const variables = this.getVariables();
    
    const jacobian: number[][] = [];
    
    constraints.forEach(constraint => {
      const row: number[] = new Array(variables.length).fill(0);
      
      // Compute partial derivatives numerically
      const epsilon = 1e-8;
      const f0 = this.evaluateConstraint(constraint);
      
      variables.forEach((variable, i) => {
        const original = this.getVariable(variable);
        this.setVariable(variable, original + epsilon);
        const f1 = this.evaluateConstraint(constraint);
        this.setVariable(variable, original);
        
        row[i] = (f1 - f0) / epsilon;
      });
      
      jacobian.push(row);
    });
    
    return jacobian;
  }
  
  /**
   * Compute constraint residuals
   */
  private computeResiduals(): number[] {
    const constraints = Array.from(this.system.constraints.values());
    return constraints.map(c => this.evaluateConstraint(c));
  }
  
  /**
   * Evaluate single constraint
   */
  private evaluateConstraint(constraint: Constraint): number {
    const entities = constraint.entityIds.map(id => this.system.entities.get(id)!);
    
    switch (constraint.type) {
      case 'horizontal':
        return this.evaluateHorizontal(entities[0]);
        
      case 'vertical':
        return this.evaluateVertical(entities[0]);
        
      case 'parallel':
        return this.evaluateParallel(entities[0], entities[1]);
        
      case 'perpendicular':
        return this.evaluatePerpendicular(entities[0], entities[1]);
        
      case 'coincident':
        return this.evaluateCoincident(
          entities[0],
          entities[1],
          constraint.pointIndices![0],
          constraint.pointIndices![1]
        );
        
      case 'distance':
        return this.evaluateDistance(entities[0], entities[1], constraint.value!);
        
      case 'angle':
        return this.evaluateAngle(entities[0], entities[1], constraint.value!);
        
      case 'radius':
        return this.evaluateRadius(entities[0], constraint.value!);
        
      case 'equal':
        return this.evaluateEqual(entities[0], entities[1]);
        
      default:
        return 0;
    }
  }
  
  /**
   * Evaluate horizontal constraint
   */
  private evaluateHorizontal(entity: AdvancedSketchEntity): number {
    if (entity.type === 'line' && entity.points.length >= 2) {
      return entity.points[1].y - entity.points[0].y;
    }
    return 0;
  }
  
  /**
   * Evaluate vertical constraint
   */
  private evaluateVertical(entity: AdvancedSketchEntity): number {
    if (entity.type === 'line' && entity.points.length >= 2) {
      return entity.points[1].x - entity.points[0].x;
    }
    return 0;
  }
  
  /**
   * Evaluate parallel constraint
   */
  private evaluateParallel(e1: AdvancedSketchEntity, e2: AdvancedSketchEntity): number {
    const dir1 = this.getEntityDirection(e1);
    const dir2 = this.getEntityDirection(e2);
    
    if (!dir1 || !dir2) return 0;
    
    // Cross product should be zero for parallel
    return dir1.x * dir2.y - dir1.y * dir2.x;
  }
  
  /**
   * Evaluate perpendicular constraint
   */
  private evaluatePerpendicular(e1: AdvancedSketchEntity, e2: AdvancedSketchEntity): number {
    const dir1 = this.getEntityDirection(e1);
    const dir2 = this.getEntityDirection(e2);
    
    if (!dir1 || !dir2) return 0;
    
    // Dot product should be zero for perpendicular
    return dir1.dot(dir2);
  }
  
  /**
   * Evaluate coincident constraint
   */
  private evaluateCoincident(
    e1: AdvancedSketchEntity,
    e2: AdvancedSketchEntity,
    pointIndex1: number,
    pointIndex2: number
  ): number {
    const p1 = e1.points[pointIndex1];
    const p2 = e2.points[pointIndex2];
    
    if (!p1 || !p2) return 0;
    
    return p1.distanceTo(p2);
  }
  
  /**
   * Evaluate distance constraint
   */
  private evaluateDistance(e1: AdvancedSketchEntity, e2: AdvancedSketchEntity, targetDistance: number): number {
    // Distance between closest points
    const p1 = e1.points[0];
    const p2 = e2.points[0];
    
    if (!p1 || !p2) return 0;
    
    const actualDistance = p1.distanceTo(p2);
    return actualDistance - targetDistance;
  }
  
  /**
   * Evaluate angle constraint
   */
  private evaluateAngle(e1: AdvancedSketchEntity, e2: AdvancedSketchEntity, targetAngle: number): number {
    const dir1 = this.getEntityDirection(e1);
    const dir2 = this.getEntityDirection(e2);
    
    if (!dir1 || !dir2) return 0;
    
    const angle = Math.atan2(dir2.y, dir2.x) - Math.atan2(dir1.y, dir1.x);
    return angle - targetAngle;
  }
  
  /**
   * Evaluate radius constraint
   */
  private evaluateRadius(entity: AdvancedSketchEntity, targetRadius: number): number {
    if (entity.radius !== undefined) {
      return entity.radius - targetRadius;
    }
    return 0;
  }
  
  /**
   * Evaluate equal constraint
   */
  private evaluateEqual(e1: AdvancedSketchEntity, e2: AdvancedSketchEntity): number {
    // Equal length for lines, equal radius for circles
    if (e1.type === 'line' && e2.type === 'line' && e1.points.length >= 2 && e2.points.length >= 2) {
      const len1 = e1.points[0].distanceTo(e1.points[1]);
      const len2 = e2.points[0].distanceTo(e2.points[1]);
      return len1 - len2;
    }
    
    if (e1.radius !== undefined && e2.radius !== undefined) {
      return e1.radius - e2.radius;
    }
    
    return 0;
  }
  
  /**
   * Get entity direction vector
   */
  private getEntityDirection(entity: AdvancedSketchEntity): THREE.Vector2 | null {
    if (entity.type === 'line' && entity.points.length >= 2) {
      return entity.points[1].clone().sub(entity.points[0]).normalize();
    }
    return null;
  }
  
  /**
   * Get all variables in system
   */
  private getVariables(): string[] {
    const variables: string[] = [];
    
    this.system.entities.forEach((entity, id) => {
      entity.points.forEach((_, i) => {
        variables.push(`${id}.point[${i}].x`);
        variables.push(`${id}.point[${i}].y`);
      });
      
      if (entity.radius !== undefined) {
        variables.push(`${id}.radius`);
      }
    });
    
    return variables;
  }
  
  /**
   * Get variable value
   */
  private getVariable(variable: string): number {
    const [entityId, path] = variable.split('.');
    const entity = this.system.entities.get(entityId);
    if (!entity) return 0;
    
    if (path.startsWith('point')) {
      const match = path.match(/point\[(\d+)\]\.(x|y)/);
      if (match) {
        const index = parseInt(match[1]);
        const coord = match[2];
        return coord === 'x' ? entity.points[index].x : entity.points[index].y;
      }
    } else if (path === 'radius') {
      return entity.radius || 0;
    }
    
    return 0;
  }
  
  /**
   * Set variable value
   */
  private setVariable(variable: string, value: number): void {
    const [entityId, path] = variable.split('.');
    const entity = this.system.entities.get(entityId);
    if (!entity) return;
    
    if (path.startsWith('point')) {
      const match = path.match(/point\[(\d+)\]\.(x|y)/);
      if (match) {
        const index = parseInt(match[1]);
        const coord = match[2];
        if (coord === 'x') {
          entity.points[index].x = value;
        } else {
          entity.points[index].y = value;
        }
      }
    } else if (path === 'radius') {
      entity.radius = value;
    }
  }
  
  /**
   * Solve linear system Ax = b using Gaussian elimination
   */
  private solveLinearSystem(A: number[][], b: number[]): number[] {
    const n = b.length;
    const x = new Array(n).fill(0);
    
    // Simplified: Use damped least squares for overdetermined system
    // x = -damping * A^T * b
    
    const At = this.transpose(A);
    const Atb = this.matrixVectorMultiply(At, b);
    
    for (let i = 0; i < x.length; i++) {
      x[i] = -this.dampingFactor * Atb[i];
    }
    
    return x;
  }
  
  /**
   * Transpose matrix
   */
  private transpose(A: number[][]): number[][] {
    if (A.length === 0) return [];
    const rows = A.length;
    const cols = A[0].length;
    const At: number[][] = Array(cols).fill(0).map(() => Array(rows).fill(0));
    
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        At[j][i] = A[i][j];
      }
    }
    
    return At;
  }
  
  /**
   * Matrix-vector multiplication
   */
  private matrixVectorMultiply(A: number[][], b: number[]): number[] {
    return A.map(row => row.reduce((sum, val, i) => sum + val * b[i], 0));
  }
  
  /**
   * Apply updates to variables
   */
  private applyUpdates(updates: number[], modifiedEntities: Set<string>): void {
    const variables = this.getVariables();
    
    updates.forEach((update, i) => {
      const variable = variables[i];
      const entityId = variable.split('.')[0];
      const current = this.getVariable(variable);
      this.setVariable(variable, current + update);
      modifiedEntities.add(entityId);
    });
  }
  
  /**
   * Update constraint satisfaction states
   */
  private updateConstraintStates(): void {
    this.system.constraints.forEach(constraint => {
      const error = Math.abs(this.evaluateConstraint(constraint));
      constraint.error = error;
      constraint.satisfied = error < this.tolerance;
    });
  }
  
  /**
   * Detect constraint conflicts
   */
  private detectConflicts(): void {
    this.system.conflicts = [];
    
    // Check for over-constrained subsystems
    const dof = this.system.degrees_of_freedom;
    if (dof < 0) {
      this.system.conflicts.push({
        id: crypto.randomUUID(),
        constraintIds: [],
        message: `System is over-constrained (DOF: ${dof})`,
        severity: 'warning',
        suggestions: [
          'Remove redundant constraints',
          'Convert some dimensional constraints to driven dimensions'
        ]
      });
    }
    
    // Check for contradictory constraints
    this.detectContradictoryConstraints();
  }
  
  /**
   * Detect contradictory constraints
   */
  private detectContradictoryConstraints(): void {
    const constraints = Array.from(this.system.constraints.values());
    
    // Example: parallel + perpendicular on same entities
    for (let i = 0; i < constraints.length; i++) {
      for (let j = i + 1; j < constraints.length; j++) {
        const c1 = constraints[i];
        const c2 = constraints[j];
        
        // Same entities
        if (this.sameEntities(c1.entityIds, c2.entityIds)) {
          if ((c1.type === 'parallel' && c2.type === 'perpendicular') ||
              (c1.type === 'perpendicular' && c2.type === 'parallel')) {
            this.system.conflicts.push({
              id: crypto.randomUUID(),
              constraintIds: [c1.id, c2.id],
              message: 'Lines cannot be both parallel and perpendicular',
              severity: 'error',
              suggestions: ['Remove one of the conflicting constraints']
            });
          }
        }
      }
    }
  }
  
  /**
   * Check if entity lists are the same
   */
  private sameEntities(ids1: string[], ids2: string[]): boolean {
    if (ids1.length !== ids2.length) return false;
    const sorted1 = [...ids1].sort();
    const sorted2 = [...ids2].sort();
    return sorted1.every((id, i) => id === sorted2[i]);
  }
  
  /**
   * Infer constraints between two entities
   */
  private inferConstraintsBetween(e1: AdvancedSketchEntity, e2: AdvancedSketchEntity): Constraint[] {
    const constraints: Constraint[] = [];
    const tolerance = 0.1;
    
    // Lines
    if (e1.type === 'line' && e2.type === 'line' && e1.points.length >= 2 && e2.points.length >= 2) {
      const dir1 = e1.points[1].clone().sub(e1.points[0]).normalize();
      const dir2 = e2.points[1].clone().sub(e2.points[0]).normalize();
      
      // Check parallel
      const cross = Math.abs(dir1.x * dir2.y - dir1.y * dir2.x);
      if (cross < tolerance) {
        constraints.push({
          id: crypto.randomUUID(),
          type: 'parallel',
          entityIds: [e1.id, e2.id],
          autoInferred: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          version: 1,
          priority: 5
        });
      }
      
      // Check perpendicular
      const dot = Math.abs(dir1.dot(dir2));
      if (dot < tolerance) {
        constraints.push({
          id: crypto.randomUUID(),
          type: 'perpendicular',
          entityIds: [e1.id, e2.id],
          autoInferred: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          version: 1,
          priority: 5
        });
      }
    }
    
    // Check coincident points
    for (let i = 0; i < e1.points.length; i++) {
      for (let j = 0; j < e2.points.length; j++) {
        const dist = e1.points[i].distanceTo(e2.points[j]);
        if (dist < tolerance) {
          constraints.push({
            id: crypto.randomUUID(),
            type: 'coincident',
            entityIds: [e1.id, e2.id],
            pointIndices: [i, j],
            autoInferred: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            version: 1,
            priority: 10 // High priority
          });
        }
      }
    }
    
    return constraints;
  }
  
  /**
   * Infer constraints for single entity
   */
  private inferConstraintsFor(entity: AdvancedSketchEntity): Constraint[] {
    const constraints: Constraint[] = [];
    const tolerance = 0.1;
    
    if (entity.type === 'line' && entity.points.length >= 2) {
      const dx = Math.abs(entity.points[1].x - entity.points[0].x);
      const dy = Math.abs(entity.points[1].y - entity.points[0].y);
      
      // Check horizontal
      if (dy < tolerance) {
        constraints.push({
          id: crypto.randomUUID(),
          type: 'horizontal',
          entityIds: [entity.id],
          autoInferred: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          version: 1,
          priority: 8
        });
      }
      
      // Check vertical
      if (dx < tolerance) {
        constraints.push({
          id: crypto.randomUUID(),
          type: 'vertical',
          entityIds: [entity.id],
          autoInferred: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          version: 1,
          priority: 8
        });
      }
    }
    
    return constraints;
  }
  
  /**
   * Check if constraint is duplicate
   */
  private isDuplicateConstraint(constraint: Constraint): boolean {
    return Array.from(this.system.constraints.values()).some(existing => {
      return existing.type === constraint.type &&
             this.sameEntities(existing.entityIds, constraint.entityIds) &&
             JSON.stringify(existing.pointIndices) === JSON.stringify(constraint.pointIndices);
    });
  }
}
