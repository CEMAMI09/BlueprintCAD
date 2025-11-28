import * as THREE from 'three';
import { ConstraintSolver, Constraint, ConstraintType } from './constraint-solver';
import {
  Dimension,
  LinearDimension,
  RadialDimension,
  AngularDimension,
  calculateDimensionValue,
  createLinearDimension,
  createRadialDimension,
  createAngularDimension
} from './dimension-annotations';
import { SketchEntity } from './geometry-kernel';

/**
 * Dimension Manager
 * 
 * Integrates dimension annotations with the constraint solver.
 * Dimensions are bidirectional:
 * - Driving dimensions create constraints that control geometry
 * - Reference dimensions display measurements without constraining
 * 
 * When a driving dimension value changes, the constraint solver
 * updates the geometry. When geometry changes, dimension displays update.
 */

export class DimensionManager {
  private dimensions: Map<string, Dimension> = new Map();
  private solver: ConstraintSolver;
  private dimensionToConstraintMap: Map<string, string> = new Map();
  private constraintToDimensionMap: Map<string, string> = new Map();
  
  constructor(solver: ConstraintSolver) {
    this.solver = solver;
  }
  
  /**
   * Add a dimension and create associated constraint if driving
   */
  addDimension(dimension: Dimension): void {
    this.dimensions.set(dimension.id, dimension);
    
    if (dimension.isDriving) {
      const constraint = this.createConstraintFromDimension(dimension);
      if (constraint) {
        this.solver.addConstraint(constraint);
        dimension.constraintId = constraint.id;
        this.dimensionToConstraintMap.set(dimension.id, constraint.id);
        this.constraintToDimensionMap.set(constraint.id, dimension.id);
      }
    }
  }
  
  /**
   * Remove a dimension and its associated constraint
   */
  removeDimension(dimensionId: string): void {
    const dimension = this.dimensions.get(dimensionId);
    if (!dimension) return;
    
    if (dimension.constraintId) {
      this.solver.removeConstraint(dimension.constraintId);
      this.dimensionToConstraintMap.delete(dimensionId);
      this.constraintToDimensionMap.delete(dimension.constraintId);
    }
    
    this.dimensions.delete(dimensionId);
  }
  
  /**
   * Update a dimension value (drives geometry if driving dimension)
   */
  updateDimensionValue(
    dimensionId: string,
    newValue: number,
    options?: {
      precision?: number;
      units?: string;
      isDriving?: boolean;
      locked?: boolean;
      label?: string;
      tolerance?: { upper: number; lower: number } | null;
    }
  ): void {
    const dimension = this.dimensions.get(dimensionId);
    if (!dimension) return;
    
    const wasDriving = dimension.isDriving;
    const oldConstraintId = dimension.constraintId;
    
    // Update dimension properties
    if (options?.precision !== undefined) dimension.precision = options.precision;
    if (options?.units !== undefined) dimension.units = options.units;
    if (options?.locked !== undefined) dimension.locked = options.locked;
    if (options?.label !== undefined) dimension.label = options.label;
    if (options?.tolerance !== undefined) {
      dimension.tolerance = options.tolerance ?? undefined;
    }
    
    // Handle driving/reference toggle
    if (options?.isDriving !== undefined && options.isDriving !== wasDriving) {
      if (options.isDriving) {
        // Convert to driving dimension
        dimension.isDriving = true;
        dimension.nominalValue = newValue;
        dimension.value = newValue;
        
        const constraint = this.createConstraintFromDimension(dimension);
        if (constraint) {
          this.solver.addConstraint(constraint);
          dimension.constraintId = constraint.id;
          this.dimensionToConstraintMap.set(dimensionId, constraint.id);
          this.constraintToDimensionMap.set(constraint.id, dimensionId);
        }
      } else {
        // Convert to reference dimension
        dimension.isDriving = false;
        dimension.nominalValue = undefined;
        
        if (oldConstraintId) {
          this.solver.removeConstraint(oldConstraintId);
          this.dimensionToConstraintMap.delete(dimensionId);
          this.constraintToDimensionMap.delete(oldConstraintId);
          dimension.constraintId = undefined;
        }
      }
    } else if (dimension.isDriving) {
      // Update existing driving dimension
      dimension.nominalValue = newValue;
      dimension.value = newValue;
      
      if (dimension.constraintId) {
        this.solver.updateConstraint(dimension.constraintId, { value: newValue });
      }
    } else {
      // Reference dimension - just update display value
      dimension.value = newValue;
    }
    
    dimension.updatedAt = Date.now();
    dimension.version++;
  }
  
  /**
   * Update dimension displays from current geometry
   */
  updateDimensionsFromGeometry(): void {
    this.dimensions.forEach(dimension => {
      if (!dimension.isDriving && !dimension.locked) {
        // Reference dimensions update from geometry
        const calculatedValue = calculateDimensionValue(dimension);
        dimension.value = calculatedValue;
      } else if (dimension.isDriving && !dimension.locked) {
        // Driving dimensions may need to sync with actual geometry after solving
        const calculatedValue = calculateDimensionValue(dimension);
        if (Math.abs(calculatedValue - dimension.value) > 0.001) {
          dimension.value = calculatedValue;
        }
      }
    });
  }
  
  /**
   * Get all dimensions
   */
  getDimensions(): Dimension[] {
    return Array.from(this.dimensions.values());
  }
  
  /**
   * Get a specific dimension
   */
  getDimension(dimensionId: string): Dimension | undefined {
    return this.dimensions.get(dimensionId);
  }
  
  /**
   * Get dimensions associated with specific entities
   */
  getDimensionsForEntities(entityIds: string[]): Dimension[] {
    return this.getDimensions().filter(dim =>
      dim.entityIds.some(id => entityIds.includes(id))
    );
  }
  
  /**
   * Create constraint from dimension
   */
  private createConstraintFromDimension(dimension: Dimension): Constraint | null {
    const value = dimension.nominalValue ?? dimension.value;
    
    if (dimension.type === 'linear') {
      const constraintType = this.getLinearConstraintType(dimension);
      return {
        id: `constraint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: constraintType,
        entityIds: dimension.entityIds,
        value,
        locked: dimension.locked,
        autoInferred: false,
        priority: 5,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1
      };
    } else if (dimension.type === 'radial') {
      const constraintType: ConstraintType = dimension.subtype === 'radius' ? 'radius' : 'diameter';
      return {
        id: `constraint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: constraintType,
        entityIds: dimension.entityIds,
        value,
        locked: dimension.locked,
        autoInferred: false,
        priority: 5,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1
      };
    } else if (dimension.type === 'angular') {
      return {
        id: `constraint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'angle',
        entityIds: dimension.entityIds,
        value,
        locked: dimension.locked,
        autoInferred: false,
        priority: 5,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1
      };
    }
    
    return null;
  }
  
  private getLinearConstraintType(dimension: LinearDimension): ConstraintType {
    // Linear dimensions map to distance or length constraints
    if (dimension.entityIds.length === 1) {
      return 'length';
    } else {
      return 'distance';
    }
  }
  
  /**
   * Export dimension state for persistence
   */
  exportState(): {
    dimensions: Dimension[];
    dimensionToConstraintMap: Record<string, string>;
  } {
    return {
      dimensions: Array.from(this.dimensions.values()),
      dimensionToConstraintMap: Object.fromEntries(this.dimensionToConstraintMap)
    };
  }
  
  /**
   * Import dimension state
   */
  importState(state: {
    dimensions: Dimension[];
    dimensionToConstraintMap: Record<string, string>;
  }): void {
    this.dimensions.clear();
    this.dimensionToConstraintMap.clear();
    this.constraintToDimensionMap.clear();
    
    state.dimensions.forEach(dim => {
      this.dimensions.set(dim.id, dim);
    });
    
    Object.entries(state.dimensionToConstraintMap).forEach(([dimId, constraintId]) => {
      this.dimensionToConstraintMap.set(dimId, constraintId);
      this.constraintToDimensionMap.set(constraintId, dimId);
    });
  }
  
  /**
   * Helper to create linear dimension from two entities
   */
  createLinearDimensionFromEntities(
    entities: SketchEntity[],
    subtype: 'horizontal' | 'vertical' | 'aligned',
    isDriving: boolean = true
  ): LinearDimension | null {
    if (entities.length !== 2) return null;
    
    const e1 = entities[0];
    const e2 = entities[1];
    
    let start: THREE.Vector2 | null = null;
    let end: THREE.Vector2 | null = null;
    
    // Get points from entities
    if (e1.type === 'line' && e1.points.length >= 2) {
      start = new THREE.Vector2(e1.points[0].x, e1.points[0].y);
    } else if (e1.type === 'circle' && e1.center) {
      start = new THREE.Vector2(e1.center.x, e1.center.y);
    }
    
    if (e2.type === 'line' && e2.points.length >= 2) {
      end = new THREE.Vector2(e2.points[0].x, e2.points[0].y);
    } else if (e2.type === 'circle' && e2.center) {
      end = new THREE.Vector2(e2.center.x, e2.center.y);
    }
    
    if (!start || !end) return null;
    
    return createLinearDimension(
      [e1.id, e2.id],
      start,
      end,
      subtype,
      isDriving
    );
  }
  
  /**
   * Helper to create radial dimension from circular entity
   */
  createRadialDimensionFromEntity(
    entity: SketchEntity,
    subtype: 'radius' | 'diameter',
    isDriving: boolean = true
  ): RadialDimension | null {
    if (entity.type !== 'circle' && entity.type !== 'arc') return null;
    if (!entity.center) return null;
    
    const center = new THREE.Vector2(entity.center.x, entity.center.y);
    const radius = entity.radius ?? 10;
    const radiusPoint = new THREE.Vector2(center.x + radius, center.y);
    
    return createRadialDimension(
      [entity.id],
      center,
      radiusPoint,
      subtype,
      isDriving
    );
  }
  
  /**
   * Helper to create angular dimension from two line entities
   */
  createAngularDimensionFromEntities(
    entities: SketchEntity[],
    isDriving: boolean = true
  ): AngularDimension | null {
    if (entities.length !== 2) return null;
    
    const e1 = entities[0];
    const e2 = entities[1];
    
    if (e1.type !== 'line' || e2.type !== 'line') return null;
    if (e1.points.length < 2 || e2.points.length < 2) return null;
    
    // Find common vertex (if any)
    let vertex: THREE.Vector2 | null = null;
    let dir1: THREE.Vector2 | null = null;
    let dir2: THREE.Vector2 | null = null;
    
    const e1p1 = new THREE.Vector2(e1.points[0].x, e1.points[0].y);
    const e1p2 = new THREE.Vector2(e1.points[1].x, e1.points[1].y);
    const e2p1 = new THREE.Vector2(e2.points[0].x, e2.points[0].y);
    const e2p2 = new THREE.Vector2(e2.points[1].x, e2.points[1].y);
    
    const threshold = 0.1;
    
    if (e1p1.distanceTo(e2p1) < threshold) {
      vertex = e1p1;
      dir1 = e1p2.clone().sub(e1p1).normalize();
      dir2 = e2p2.clone().sub(e2p1).normalize();
    } else if (e1p1.distanceTo(e2p2) < threshold) {
      vertex = e1p1;
      dir1 = e1p2.clone().sub(e1p1).normalize();
      dir2 = e2p1.clone().sub(e2p2).normalize();
    } else if (e1p2.distanceTo(e2p1) < threshold) {
      vertex = e1p2;
      dir1 = e1p1.clone().sub(e1p2).normalize();
      dir2 = e2p2.clone().sub(e2p1).normalize();
    } else if (e1p2.distanceTo(e2p2) < threshold) {
      vertex = e1p2;
      dir1 = e1p1.clone().sub(e1p2).normalize();
      dir2 = e2p1.clone().sub(e2p2).normalize();
    }
    
    if (!vertex || !dir1 || !dir2) return null;
    
    return createAngularDimension(
      [e1.id, e2.id],
      vertex,
      dir1,
      dir2,
      isDriving
    );
  }
}
