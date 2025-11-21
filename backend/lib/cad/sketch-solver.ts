// Constraint solver for 2D sketches
import * as THREE from 'three';
import { Constraint, SketchEntity } from './geometry-kernel';

export class SketchSolver {
  // Solve constraints on sketch entities
  solve(entities: SketchEntity[], constraints: Constraint[]): boolean {
    let changed = false;
    const maxIterations = 100;
    let iteration = 0;

    while (iteration < maxIterations) {
      let iterationChanged = false;

      for (const constraint of constraints) {
        const result = this.applyConstraint(constraint, entities);
        if (result) {
          iterationChanged = true;
          changed = true;
        }
      }

      if (!iterationChanged) break;
      iteration++;
    }

    return changed;
  }

  private applyConstraint(constraint: Constraint, entities: SketchEntity[]): boolean {
    const entityMap = new Map(entities.map(e => [e.id, e]));
    
    switch (constraint.type) {
      case 'horizontal':
        return this.applyHorizontal(constraint, entityMap);
      case 'vertical':
        return this.applyVertical(constraint, entityMap);
      case 'parallel':
        return this.applyParallel(constraint, entityMap);
      case 'perpendicular':
        return this.applyPerpendicular(constraint, entityMap);
      case 'equal':
        return this.applyEqual(constraint, entityMap);
      case 'distance':
        return this.applyDistance(constraint, entityMap);
      case 'angle':
        return this.applyAngle(constraint, entityMap);
      case 'radius':
        return this.applyRadius(constraint, entityMap);
      case 'concentric':
        return this.applyConcentric(constraint, entityMap);
      case 'tangent':
        return this.applyTangent(constraint, entityMap);
      default:
        return false;
    }
  }

  private applyHorizontal(constraint: Constraint, entities: Map<string, SketchEntity>): boolean {
    const entity = entities.get(constraint.entities[0]);
    if (!entity || entity.type !== 'line' || entity.points.length < 2) return false;

    const avgY = (entity.points[0].y + entity.points[1].y) / 2;
    entity.points[0].y = avgY;
    entity.points[1].y = avgY;
    return true;
  }

  private applyVertical(constraint: Constraint, entities: Map<string, SketchEntity>): boolean {
    const entity = entities.get(constraint.entities[0]);
    if (!entity || entity.type !== 'line' || entity.points.length < 2) return false;

    const avgX = (entity.points[0].x + entity.points[1].x) / 2;
    entity.points[0].x = avgX;
    entity.points[1].x = avgX;
    return true;
  }

  private applyParallel(constraint: Constraint, entities: Map<string, SketchEntity>): boolean {
    const e1 = entities.get(constraint.entities[0]);
    const e2 = entities.get(constraint.entities[1]);
    
    if (!e1 || !e2 || e1.type !== 'line' || e2.type !== 'line') return false;
    if (e1.points.length < 2 || e2.points.length < 2) return false;

    // Calculate direction of first line
    const dir1 = new THREE.Vector2()
      .subVectors(e1.points[1], e1.points[0])
      .normalize();

    // Adjust second line to be parallel
    const length2 = e2.points[0].distanceTo(e2.points[1]);
    e2.points[1].copy(e2.points[0]).add(dir1.clone().multiplyScalar(length2));
    
    return true;
  }

  private applyPerpendicular(constraint: Constraint, entities: Map<string, SketchEntity>): boolean {
    const e1 = entities.get(constraint.entities[0]);
    const e2 = entities.get(constraint.entities[1]);
    
    if (!e1 || !e2 || e1.type !== 'line' || e2.type !== 'line') return false;
    if (e1.points.length < 2 || e2.points.length < 2) return false;

    // Calculate direction of first line
    const dir1 = new THREE.Vector2()
      .subVectors(e1.points[1], e1.points[0])
      .normalize();

    // Perpendicular direction
    const dir2 = new THREE.Vector2(-dir1.y, dir1.x);
    
    const length2 = e2.points[0].distanceTo(e2.points[1]);
    e2.points[1].copy(e2.points[0]).add(dir2.multiplyScalar(length2));
    
    return true;
  }

  private applyEqual(constraint: Constraint, entities: Map<string, SketchEntity>): boolean {
    const e1 = entities.get(constraint.entities[0]);
    const e2 = entities.get(constraint.entities[1]);
    
    if (!e1 || !e2) return false;

    if (e1.type === 'line' && e2.type === 'line') {
      const len1 = e1.points[0].distanceTo(e1.points[1]);
      const len2 = e2.points[0].distanceTo(e2.points[1]);
      const avgLen = (len1 + len2) / 2;

      const dir2 = new THREE.Vector2()
        .subVectors(e2.points[1], e2.points[0])
        .normalize();
      e2.points[1].copy(e2.points[0]).add(dir2.multiplyScalar(avgLen));
      
      return true;
    }

    if (e1.type === 'circle' && e2.type === 'circle') {
      const avgRadius = ((e1.radius || 0) + (e2.radius || 0)) / 2;
      e1.radius = avgRadius;
      e2.radius = avgRadius;
      return true;
    }

    return false;
  }

  private applyDistance(constraint: Constraint, entities: Map<string, SketchEntity>): boolean {
    const entity = entities.get(constraint.entities[0]);
    if (!entity || entity.type !== 'line' || entity.points.length < 2) return false;
    if (constraint.value === undefined) return false;

    const dir = new THREE.Vector2()
      .subVectors(entity.points[1], entity.points[0])
      .normalize();
    
    entity.points[1].copy(entity.points[0]).add(dir.multiplyScalar(constraint.value));
    return true;
  }

  private applyAngle(constraint: Constraint, entities: Map<string, SketchEntity>): boolean {
    const e1 = entities.get(constraint.entities[0]);
    const e2 = entities.get(constraint.entities[1]);
    
    if (!e1 || !e2 || e1.type !== 'line' || e2.type !== 'line') return false;
    if (constraint.value === undefined) return false;

    const dir1 = new THREE.Vector2()
      .subVectors(e1.points[1], e1.points[0])
      .normalize();

    const angleRad = (constraint.value * Math.PI) / 180;
    const dir2 = new THREE.Vector2(
      dir1.x * Math.cos(angleRad) - dir1.y * Math.sin(angleRad),
      dir1.x * Math.sin(angleRad) + dir1.y * Math.cos(angleRad)
    );

    const length2 = e2.points[0].distanceTo(e2.points[1]);
    e2.points[1].copy(e2.points[0]).add(dir2.multiplyScalar(length2));
    
    return true;
  }

  private applyRadius(constraint: Constraint, entities: Map<string, SketchEntity>): boolean {
    const entity = entities.get(constraint.entities[0]);
    if (!entity || (entity.type !== 'circle' && entity.type !== 'arc')) return false;
    if (constraint.value === undefined) return false;

    entity.radius = constraint.value;
    return true;
  }

  private applyConcentric(constraint: Constraint, entities: Map<string, SketchEntity>): boolean {
    const e1 = entities.get(constraint.entities[0]);
    const e2 = entities.get(constraint.entities[1]);
    
    if (!e1 || !e2) return false;
    if ((e1.type !== 'circle' && e1.type !== 'arc') || (e2.type !== 'circle' && e2.type !== 'arc')) return false;

    const center1 = e1.points[0];
    const center2 = e2.points[0];
    const avgCenter = new THREE.Vector2().addVectors(center1, center2).multiplyScalar(0.5);
    
    e1.points[0].copy(avgCenter);
    e2.points[0].copy(avgCenter);
    
    return true;
  }

  private applyTangent(constraint: Constraint, entities: Map<string, SketchEntity>): boolean {
    // Simplified tangent constraint
    // Full implementation would need proper geometric tangency calculation
    return false;
  }
}
