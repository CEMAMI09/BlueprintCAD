// Geometry Kernel - Core CAD operations
import * as THREE from 'three';
import { CSG } from 'three-csg-ts';
import { 
  Solid as BREPSolid, 
  Shell as BREPShell,
  Edge as BREPEdge,
  Face as BREPFace
} from './brep/topology';
import { 
  BooleanOperation as BREPBooleanOp, 
  booleanOperation as brepBoolean 
} from './brep/boolean';
// OCCT import removed to prevent build errors - loaded dynamically when needed
import {
  fillet,
  chamfer,
  FilletParameters,
  ChamferParameters,
  FilletResult,
  ChamferResult,
  getAllEdges,
  isFilletableEdge
} from './brep/fillet-chamfer';

export interface Sketch {
  id: string;
  name: string;
  plane: THREE.Plane;
  entities: SketchEntity[];
  constraints: Constraint[];
}

export interface SketchEntity {
  id: string;
  type: 'line' | 'circle' | 'arc' | 'arc-3point' | 'arc-tangent' | 'spline' | 'bspline' | 'nurbs' | 'ellipse' | 'ellipse-arc' | 'point' | 'rectangle' | 'polygon' | 'polyline';
  points: THREE.Vector2[];
  
  // Common parameters
  radius?: number;
  radiusX?: number;
  radiusY?: number;
  
  // Arc parameters
  startAngle?: number;
  endAngle?: number;
  center?: THREE.Vector2;
  clockwise?: boolean;
  
  // Spline/B-spline parameters
  controlPoints?: THREE.Vector2[];
  knots?: number[];
  degree?: number;
  weights?: number[]; // For NURBS
  
  // Ellipse parameters
  majorAxis?: THREE.Vector2;
  minorAxis?: THREE.Vector2;
  rotation?: number;
  
  // Polygon parameters
  sides?: number;
  inscribed?: boolean;
  
  // Polyline parameters
  closed?: boolean;
  
  // Construction geometry
  construction?: boolean;
  
  // Version control metadata
  createdAt?: number;
  updatedAt?: number;
  version?: number;
}

export interface Constraint {
  id: string;
  type: 'horizontal' | 'vertical' | 'parallel' | 'perpendicular' | 'tangent' | 'equal' | 'concentric' | 'distance' | 'angle' | 'radius';
  entities: string[];
  value?: number;
}

export interface Feature {
  id: string;
  type: 'extrude' | 'revolve' | 'sweep' | 'loft' | 'boolean' | 'fillet' | 'chamfer' | 'shell' | 'pattern' | 'hole';
  name: string;
  sketch?: string;
  parameters: any;
  mesh?: THREE.Mesh;
  brepSolid?: BREPSolid; // BREP topology representation
  suppressed: boolean;
  useBREP?: boolean; // Whether to use BREP or mesh-based operations
}

export class GeometryKernel {
  private features: Map<string, Feature> = new Map();
  private sketches: Map<string, Sketch> = new Map();

  // Create a 2D sketch on a plane
  createSketch(name: string, plane: THREE.Plane): Sketch {
    const sketch: Sketch = {
      id: this.generateId(),
      name,
      plane,
      entities: [],
      constraints: []
    };
    this.sketches.set(sketch.id, sketch);
    return sketch;
  }

  // Add entity to sketch
  addSketchEntity(sketchId: string, entity: Omit<SketchEntity, 'id'>): SketchEntity {
    const sketch = this.sketches.get(sketchId);
    if (!sketch) throw new Error('Sketch not found');

    const fullEntity: SketchEntity = {
      ...entity,
      id: this.generateId()
    };
    sketch.entities.push(fullEntity);
    return fullEntity;
  }

  // Add constraint to sketch
  addConstraint(sketchId: string, constraint: Omit<Constraint, 'id'>): Constraint {
    const sketch = this.sketches.get(sketchId);
    if (!sketch) throw new Error('Sketch not found');

    const fullConstraint: Constraint = {
      ...constraint,
      id: this.generateId()
    };
    sketch.constraints.push(fullConstraint);
    return fullConstraint;
  }

  // Extrude a sketch
  extrude(sketchId: string, distance: number, direction: 'positive' | 'negative' | 'symmetric' = 'positive'): Feature {
    const sketch = this.sketches.get(sketchId);
    if (!sketch) throw new Error('Sketch not found');

    // Convert sketch to 3D shape
    const shape = this.sketchToShape(sketch);
    
    // Create extruded geometry
    const extrudeSettings = {
      depth: direction === 'symmetric' ? distance / 2 : distance,
      bevelEnabled: false
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const material = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      roughness: 0.5,
      metalness: 0.1
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const feature: Feature = {
      id: this.generateId(),
      type: 'extrude',
      name: `Extrude ${this.features.size + 1}`,
      sketch: sketchId,
      parameters: { distance, direction },
      mesh,
      suppressed: false
    };

    this.features.set(feature.id, feature);
    return feature;
  }

  // Revolve a sketch around an axis
  revolve(sketchId: string, axis: THREE.Vector3, angle: number = 360): Feature {
    const sketch = this.sketches.get(sketchId);
    if (!sketch) throw new Error('Sketch not found');

    const shape = this.sketchToShape(sketch);
    
    // Create revolved geometry using LatheGeometry
    const points: THREE.Vector2[] = [];
    sketch.entities.forEach(entity => {
      if (entity.type === 'line') {
        entity.points.forEach(p => points.push(p));
      }
    });

    const geometry = new THREE.LatheGeometry(points, 32, 0, (angle * Math.PI) / 180);
    const material = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.5,
      metalness: 0.1
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const feature: Feature = {
      id: this.generateId(),
      type: 'revolve',
      name: `Revolve ${this.features.size + 1}`,
      sketch: sketchId,
      parameters: { axis, angle },
      mesh,
      suppressed: false
    };

    this.features.set(feature.id, feature);
    return feature;
  }

  // Boolean operations (supports both BREP and mesh-based)
  async booleanOperation(
    op: 'union' | 'subtract' | 'intersect', 
    feature1Id: string, 
    feature2Id: string,
    useBREP: boolean = true
  ): Promise<Feature> {
    const f1 = this.features.get(feature1Id);
    const f2 = this.features.get(feature2Id);
    
    if (!f1 || !f2) throw new Error('Features not found');

    let resultMesh: THREE.Mesh | undefined;
    let resultBREP: BREPSolid | undefined;

    try {
      // BREP-based boolean (preferred for accuracy)
      if (useBREP && f1.brepSolid && f2.brepSolid) {
        console.log(`Using BREP boolean: ${op}`);
        
        const brepOp = op === 'union' ? BREPBooleanOp.UNION :
                      op === 'subtract' ? BREPBooleanOp.SUBTRACT :
                      BREPBooleanOp.INTERSECT;

        // Use native BREP boolean operation
        const result = brepBoolean(
          f1.brepSolid, 
          f2.brepSolid, 
          brepOp
        );

        if (!result.success || !result.solid) {
          throw new Error(`BREP boolean failed: ${result.errors.join(', ')}`);
        }

        resultBREP = result.solid;
        
        // Convert BREP to mesh for visualization
        resultMesh = this.brepSolidToMesh(resultBREP);
        
        console.log(`BREP boolean completed in ${result.executionTime.toFixed(2)}ms`);

      } 
      // Fallback: Mesh-based boolean (three-csg-ts)
      else if (f1.mesh && f2.mesh) {
        console.log(`Using mesh-based boolean: ${op}`);
        
        const mesh1 = f1.mesh.clone();
        const mesh2 = f2.mesh.clone();

        mesh1.updateMatrixWorld(true);
        mesh2.updateMatrixWorld(true);

        switch (op) {
          case 'union':
            resultMesh = CSG.union(mesh1, mesh2);
            break;
          case 'subtract':
            resultMesh = CSG.subtract(mesh1, mesh2);
            break;
          case 'intersect':
            resultMesh = CSG.intersect(mesh1, mesh2);
            break;
        }

        resultMesh.castShadow = true;
        resultMesh.receiveShadow = true;
      } else {
        throw new Error('Features missing both BREP and mesh data');
      }

      const feature: Feature = {
        id: this.generateId(),
        type: 'boolean',
        name: `${op.charAt(0).toUpperCase() + op.slice(1)} ${this.features.size + 1}`,
        parameters: { operation: op, feature1: feature1Id, feature2: feature2Id },
        mesh: resultMesh,
        brepSolid: resultBREP,
        suppressed: false,
        useBREP
      };

      this.features.set(feature.id, feature);
      return feature;
    } catch (error) {
      console.error('Boolean operation failed:', error);
      throw error;
    }
  }

  // Helper: Convert BREP solid to Three.js mesh
  private brepSolidToMesh(solid: BREPSolid): THREE.Mesh {
    const { solidToMesh } = require('./brep/preview');
    return solidToMesh(solid);
  }

  // Fillet operations with BREP support
  async filletEdges(
    featureId: string,
    edgeIndices: number[],
    radius: number,
    variableRadii?: Map<number, number>
  ): Promise<Feature> {
    const feature = this.features.get(featureId);
    if (!feature) throw new Error('Feature not found');
    
    if (!feature.brepSolid) {
      throw new Error('Feature does not have BREP topology. Cannot apply fillet.');
    }

    // Get all edges from solid
    const allEdges = getAllEdges(feature.brepSolid);
    
    // Select edges by indices
    const selectedEdges = edgeIndices.map(idx => allEdges[idx]).filter(e => e !== undefined);
    
    if (selectedEdges.length === 0) {
      throw new Error('No valid edges selected for fillet');
    }

    // Validate edges are fillettable
    for (const edge of selectedEdges) {
      if (!isFilletableEdge(edge, feature.brepSolid)) {
        console.warn(`Edge ${edge.id} is not suitable for filleting (boundary or smooth edge)`);
      }
    }

    // Build variable radii map if provided
    const radiiMap = new Map<BREPEdge, number>();
    if (variableRadii) {
      for (const [idx, r] of variableRadii.entries()) {
        if (allEdges[idx]) {
          radiiMap.set(allEdges[idx], r);
        }
      }
    }

    // Perform fillet
    const params: FilletParameters = {
      edges: selectedEdges,
      radius,
      variableRadii: radiiMap.size > 0 ? radiiMap : undefined,
      blendType: 'rolling-ball',
      continuity: 'G1'
    };

    const result: FilletResult = fillet(feature.brepSolid, params);

    if (!result.success || !result.solid) {
      throw new Error(`Fillet failed: ${result.errors.join(', ')}`);
    }

    // Convert to mesh
    const resultMesh = this.brepSolidToMesh(result.solid);

    // Create new feature
    const filletFeature: Feature = {
      id: this.generateId(),
      type: 'fillet',
      name: `Fillet ${this.features.size + 1}`,
      parameters: {
        baseFeature: featureId,
        edgeIndices,
        radius,
        variableRadii: variableRadii ? Array.from(variableRadii.entries()) : undefined
      },
      mesh: resultMesh,
      brepSolid: result.solid,
      suppressed: false,
      useBREP: true
    };

    this.features.set(filletFeature.id, filletFeature);
    console.log(`Fillet completed in ${result.executionTime.toFixed(2)}ms`);
    
    return filletFeature;
  }

  // Chamfer operations with BREP support
  async chamferEdges(
    featureId: string,
    edgeIndices: number[],
    distance1: number,
    distance2?: number,
    angle?: number
  ): Promise<Feature> {
    const feature = this.features.get(featureId);
    if (!feature) throw new Error('Feature not found');
    
    if (!feature.brepSolid) {
      throw new Error('Feature does not have BREP topology. Cannot apply chamfer.');
    }

    // Get all edges from solid
    const allEdges = getAllEdges(feature.brepSolid);
    
    // Select edges by indices
    const selectedEdges = edgeIndices.map(idx => allEdges[idx]).filter(e => e !== undefined);
    
    if (selectedEdges.length === 0) {
      throw new Error('No valid edges selected for chamfer');
    }

    // Determine chamfer type
    let chamferType: 'distance-distance' | 'distance-angle' = 'distance-distance';
    if (angle !== undefined) {
      chamferType = 'distance-angle';
    }

    // Perform chamfer
    const params: ChamferParameters = {
      edges: selectedEdges,
      distance1,
      distance2,
      angle,
      chamferType
    };

    const result: ChamferResult = chamfer(feature.brepSolid, params);

    if (!result.success || !result.solid) {
      throw new Error(`Chamfer failed: ${result.errors.join(', ')}`);
    }

    // Convert to mesh
    const resultMesh = this.brepSolidToMesh(result.solid);

    // Create new feature
    const chamferFeature: Feature = {
      id: this.generateId(),
      type: 'chamfer',
      name: `Chamfer ${this.features.size + 1}`,
      parameters: {
        baseFeature: featureId,
        edgeIndices,
        distance1,
        distance2,
        angle,
        chamferType
      },
      mesh: resultMesh,
      brepSolid: result.solid,
      suppressed: false,
      useBREP: true
    };

    this.features.set(chamferFeature.id, chamferFeature);
    console.log(`Chamfer completed in ${result.executionTime.toFixed(2)}ms`);
    
    return chamferFeature;
  }

  // Get all edges from a feature for selection UI
  getFeatureEdges(featureId: string): BREPEdge[] {
    const feature = this.features.get(featureId);
    if (!feature || !feature.brepSolid) return [];
    
    return getAllEdges(feature.brepSolid);
  }

  // Legacy fillet (for backwards compatibility)
  fillet(featureId: string, edges: number[], radius: number): Feature {
    const feature = this.features.get(featureId);
    if (!feature?.mesh) throw new Error('Feature not found');

    // Simplified fillet - would need proper edge detection in production
    const newMesh = feature.mesh.clone();
    
    const filletFeature: Feature = {
      id: this.generateId(),
      type: 'fillet',
      name: `Fillet ${this.features.size + 1}`,
      parameters: { baseFeature: featureId, edges, radius },
      mesh: newMesh,
      suppressed: false
    };

    this.features.set(filletFeature.id, filletFeature);
    return filletFeature;
  }

  // Pattern features
  pattern(
    featureId: string, 
    type: 'linear' | 'circular', 
    count: number, 
    spacing?: THREE.Vector3, 
    angle?: number
  ): Feature {
    const feature = this.features.get(featureId);
    if (!feature?.mesh) throw new Error('Feature not found');

    const group = new THREE.Group();
    
    for (let i = 0; i < count; i++) {
      const instance = feature.mesh.clone();
      
      if (type === 'linear' && spacing) {
        instance.position.copy(spacing.clone().multiplyScalar(i));
      } else if (type === 'circular' && angle) {
        const theta = (angle * i * Math.PI) / 180;
        instance.position.set(
          Math.cos(theta) * 50,
          0,
          Math.sin(theta) * 50
        );
      }
      
      group.add(instance);
    }

    // Create a single mesh from group (simplified)
    const mesh = feature.mesh.clone();

    const patternFeature: Feature = {
      id: this.generateId(),
      type: 'pattern',
      name: `Pattern ${this.features.size + 1}`,
      parameters: { baseFeature: featureId, type, count, spacing, angle },
      mesh,
      suppressed: false
    };

    this.features.set(patternFeature.id, patternFeature);
    return patternFeature;
  }

  // Get all features
  getFeatures(): Feature[] {
    return Array.from(this.features.values());
  }

  // Get feature by ID
  getFeature(id: string): Feature | undefined {
    return this.features.get(id);
  }

  // Delete feature
  deleteFeature(id: string): boolean {
    return this.features.delete(id);
  }

  // Suppress/unsuppress feature
  toggleSuppress(id: string): void {
    const feature = this.features.get(id);
    if (feature) {
      feature.suppressed = !feature.suppressed;
    }
  }

  // Convert sketch to THREE.Shape
  private sketchToShape(sketch: Sketch): THREE.Shape {
    const shape = new THREE.Shape();
    
    sketch.entities.forEach((entity, index) => {
      if (entity.type === 'line' && entity.points.length >= 2) {
        if (index === 0) {
          shape.moveTo(entity.points[0].x, entity.points[0].y);
        }
        shape.lineTo(entity.points[1].x, entity.points[1].y);
      } else if (entity.type === 'circle' && entity.radius) {
        const center = entity.points[0] || new THREE.Vector2(0, 0);
        shape.absarc(center.x, center.y, entity.radius, 0, Math.PI * 2, false);
      } else if (entity.type === 'arc' && entity.radius && entity.startAngle !== undefined && entity.endAngle !== undefined) {
        const center = entity.points[0] || new THREE.Vector2(0, 0);
        shape.absarc(center.x, center.y, entity.radius, entity.startAngle, entity.endAngle, false);
      } else if (entity.type === 'rectangle' && entity.points.length >= 2) {
        const p1 = entity.points[0];
        const p2 = entity.points[1];
        shape.moveTo(p1.x, p1.y);
        shape.lineTo(p2.x, p1.y);
        shape.lineTo(p2.x, p2.y);
        shape.lineTo(p1.x, p2.y);
        shape.lineTo(p1.x, p1.y);
      }
    });

    return shape;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
