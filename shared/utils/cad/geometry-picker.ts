/**
 * Geometry Picker - Interactive geometry selection for mates
 * Supports face, edge, vertex, and axis picking in 3D viewport
 */

import * as THREE from 'three';
import { GeometryType, GeometryReference } from './mate-system';

export interface PickResult {
  instanceId: string;
  geometryType: GeometryType;
  index?: number;
  position: THREE.Vector3;
  normal?: THREE.Vector3;
  direction?: THREE.Vector3;
  distance: number;
}

export class GeometryPicker {
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private camera: THREE.Camera;
  private scene: THREE.Scene;
  private pickMode: GeometryType = GeometryType.FACE;
  private highlightMaterial: THREE.MeshBasicMaterial;
  private highlightedObject: THREE.Object3D | null = null;

  constructor(camera: THREE.Camera, scene: THREE.Scene) {
    this.camera = camera;
    this.scene = scene;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    // Visual feedback material
    this.highlightMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
  }

  /**
   * Set picking mode (face, edge, vertex, etc.)
   */
  setPickMode(mode: GeometryType): void {
    this.pickMode = mode;
    this.clearHighlight();
  }

  /**
   * Pick geometry at mouse position
   */
  pick(
    event: MouseEvent,
    canvas: HTMLElement,
    instanceMeshes: Map<string, THREE.Mesh>
  ): PickResult | null {
    // Convert mouse coordinates to normalized device coordinates
    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Update raycaster
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Get all pickable meshes
    const pickableMeshes = Array.from(instanceMeshes.values());
    const intersects = this.raycaster.intersectObjects(pickableMeshes, true);

    if (intersects.length === 0) {
      this.clearHighlight();
      return null;
    }

    const intersection = intersects[0];
    const instanceId = this.getInstanceIdFromMesh(intersection.object as THREE.Mesh, instanceMeshes);
    
    if (!instanceId) {
      return null;
    }

    // Process based on pick mode
    switch (this.pickMode) {
      case GeometryType.FACE:
        return this.pickFace(intersection, instanceId);
      
      case GeometryType.EDGE:
        return this.pickEdge(intersection, instanceId);
      
      case GeometryType.VERTEX:
        return this.pickVertex(intersection, instanceId);
      
      case GeometryType.POINT:
        return this.pickPoint(intersection, instanceId);
      
      case GeometryType.AXIS:
        return this.pickAxis(intersection, instanceId);
      
      case GeometryType.PLANE:
        return this.pickPlane(intersection, instanceId);
      
      default:
        return null;
    }
  }

  /**
   * Pick a face
   */
  private pickFace(intersection: THREE.Intersection, instanceId: string): PickResult {
    const faceIndex = intersection.faceIndex || 0;
    const point = intersection.point;
    const normal = intersection.face?.normal ? 
      intersection.face.normal.clone().applyMatrix3(
        new THREE.Matrix3().getNormalMatrix(intersection.object.matrixWorld)
      ).normalize() : 
      new THREE.Vector3(0, 0, 1);

    this.highlightFace(intersection);

    return {
      instanceId,
      geometryType: GeometryType.FACE,
      index: faceIndex,
      position: point.clone(),
      normal: normal.clone(),
      distance: intersection.distance
    };
  }

  /**
   * Pick an edge (approximated from nearby geometry)
   */
  private pickEdge(intersection: THREE.Intersection, instanceId: string): PickResult {
    const mesh = intersection.object as THREE.Mesh;
    const geometry = mesh.geometry;
    
    if (!geometry.index) {
      throw new Error('Geometry must be indexed for edge picking');
    }

    const faceIndex = intersection.faceIndex || 0;
    const face = this.getFace(geometry, faceIndex);
    
    // Find closest edge of the face
    const point = intersection.point.clone();
    mesh.worldToLocal(point);
    
    const vertices = [
      this.getVertex(geometry, face.a),
      this.getVertex(geometry, face.b),
      this.getVertex(geometry, face.c)
    ];

    // Check all three edges
    const edges = [
      { start: vertices[0], end: vertices[1], indices: [face.a, face.b] },
      { start: vertices[1], end: vertices[2], indices: [face.b, face.c] },
      { start: vertices[2], end: vertices[0], indices: [face.c, face.a] }
    ];

    let closestEdge = edges[0];
    let minDistance = this.distanceToLineSegment(point, edges[0].start, edges[0].end);

    for (let i = 1; i < edges.length; i++) {
      const dist = this.distanceToLineSegment(point, edges[i].start, edges[i].end);
      if (dist < minDistance) {
        minDistance = dist;
        closestEdge = edges[i];
      }
    }

    // Calculate edge direction
    const direction = closestEdge.end.clone().sub(closestEdge.start).normalize();
    mesh.localToWorld(direction);
    direction.transformDirection(mesh.matrixWorld);

    const worldPoint = closestEdge.start.clone().add(closestEdge.end).multiplyScalar(0.5);
    mesh.localToWorld(worldPoint);

    this.highlightEdge(mesh, closestEdge.start, closestEdge.end);

    return {
      instanceId,
      geometryType: GeometryType.EDGE,
      index: face.a, // Store first vertex index as reference
      position: worldPoint,
      direction: direction,
      distance: intersection.distance
    };
  }

  /**
   * Pick a vertex
   */
  private pickVertex(intersection: THREE.Intersection, instanceId: string): PickResult {
    const mesh = intersection.object as THREE.Mesh;
    const geometry = mesh.geometry;
    const faceIndex = intersection.faceIndex || 0;
    const face = this.getFace(geometry, faceIndex);
    const point = intersection.point.clone();
    mesh.worldToLocal(point);

    // Find closest vertex of the face
    const vertices = [
      { pos: this.getVertex(geometry, face.a), index: face.a },
      { pos: this.getVertex(geometry, face.b), index: face.b },
      { pos: this.getVertex(geometry, face.c), index: face.c }
    ];

    let closestVertex = vertices[0];
    let minDistance = point.distanceTo(vertices[0].pos);

    for (let i = 1; i < vertices.length; i++) {
      const dist = point.distanceTo(vertices[i].pos);
      if (dist < minDistance) {
        minDistance = dist;
        closestVertex = vertices[i];
      }
    }

    const worldPoint = closestVertex.pos.clone();
    mesh.localToWorld(worldPoint);

    this.highlightVertex(mesh, closestVertex.pos);

    return {
      instanceId,
      geometryType: GeometryType.VERTEX,
      index: closestVertex.index,
      position: worldPoint,
      distance: intersection.distance
    };
  }

  /**
   * Pick a point (any surface point)
   */
  private pickPoint(intersection: THREE.Intersection, instanceId: string): PickResult {
    return {
      instanceId,
      geometryType: GeometryType.POINT,
      position: intersection.point.clone(),
      distance: intersection.distance
    };
  }

  /**
   * Pick an axis (cylindrical surface or edge direction)
   */
  private pickAxis(intersection: THREE.Intersection, instanceId: string): PickResult {
    // For cylindrical surfaces, calculate axis from geometry
    const mesh = intersection.object as THREE.Mesh;
    const point = intersection.point.clone();
    const normal = intersection.face?.normal ? 
      intersection.face.normal.clone().applyMatrix3(
        new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld)
      ).normalize() : 
      new THREE.Vector3(0, 1, 0);

    // Assume Y-axis for now (could be improved with geometry analysis)
    const direction = new THREE.Vector3(0, 1, 0);
    direction.transformDirection(mesh.matrixWorld).normalize();

    return {
      instanceId,
      geometryType: GeometryType.AXIS,
      position: point,
      direction: direction,
      distance: intersection.distance
    };
  }

  /**
   * Pick a plane (planar face)
   */
  private pickPlane(intersection: THREE.Intersection, instanceId: string): PickResult {
    const result = this.pickFace(intersection, instanceId);
    result.geometryType = GeometryType.PLANE;
    return result;
  }

  /**
   * Highlight selected face
   */
  private highlightFace(intersection: THREE.Intersection): void {
    this.clearHighlight();
    
    const mesh = intersection.object as THREE.Mesh;
    const geometry = mesh.geometry.clone();
    const faceIndex = intersection.faceIndex || 0;
    
    // Create highlight mesh for single face
    const highlightGeometry = new THREE.BufferGeometry();
    const positions = geometry.attributes.position;
    const face = this.getFace(geometry, faceIndex);
    
    const highlightPositions = new Float32Array([
      positions.getX(face.a), positions.getY(face.a), positions.getZ(face.a),
      positions.getX(face.b), positions.getY(face.b), positions.getZ(face.b),
      positions.getX(face.c), positions.getY(face.c), positions.getZ(face.c)
    ]);
    
    highlightGeometry.setAttribute('position', new THREE.BufferAttribute(highlightPositions, 3));
    
    const highlightMesh = new THREE.Mesh(highlightGeometry, this.highlightMaterial);
    highlightMesh.position.copy(mesh.position);
    highlightMesh.rotation.copy(mesh.rotation);
    highlightMesh.scale.copy(mesh.scale);
    highlightMesh.renderOrder = 999;
    
    this.scene.add(highlightMesh);
    this.highlightedObject = highlightMesh;
  }

  /**
   * Highlight selected edge
   */
  private highlightEdge(mesh: THREE.Mesh, start: THREE.Vector3, end: THREE.Vector3): void {
    this.clearHighlight();
    
    const points = [start.clone(), end.clone()];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ 
      color: 0x00ff00, 
      linewidth: 5 
    });
    
    const line = new THREE.Line(geometry, material);
    line.position.copy(mesh.position);
    line.rotation.copy(mesh.rotation);
    line.scale.copy(mesh.scale);
    
    this.scene.add(line);
    this.highlightedObject = line;
  }

  /**
   * Highlight selected vertex
   */
  private highlightVertex(mesh: THREE.Mesh, position: THREE.Vector3): void {
    this.clearHighlight();
    
    const geometry = new THREE.SphereGeometry(2, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(position);
    sphere.position.applyMatrix4(mesh.matrixWorld);
    
    this.scene.add(sphere);
    this.highlightedObject = sphere;
  }

  /**
   * Clear current highlight
   */
  clearHighlight(): void {
    if (this.highlightedObject) {
      this.scene.remove(this.highlightedObject);
      if (this.highlightedObject instanceof THREE.Mesh) {
        this.highlightedObject.geometry.dispose();
        if (Array.isArray(this.highlightedObject.material)) {
          this.highlightedObject.material.forEach(m => m.dispose());
        } else {
          this.highlightedObject.material.dispose();
        }
      }
      this.highlightedObject = null;
    }
  }

  /**
   * Get instance ID from mesh
   */
  private getInstanceIdFromMesh(
    mesh: THREE.Mesh,
    instanceMeshes: Map<string, THREE.Mesh>
  ): string | null {
    for (const [id, instanceMesh] of instanceMeshes.entries()) {
      if (instanceMesh === mesh || instanceMesh.uuid === mesh.uuid) {
        return id;
      }
      // Check if mesh is a child of instance mesh
      if (instanceMesh.children.includes(mesh)) {
        return id;
      }
    }
    return null;
  }

  /**
   * Get face from indexed geometry
   */
  private getFace(geometry: THREE.BufferGeometry, faceIndex: number): { a: number; b: number; c: number } {
    if (!geometry.index) {
      throw new Error('Geometry must be indexed');
    }
    
    const index = geometry.index;
    const a = index.getX(faceIndex * 3);
    const b = index.getX(faceIndex * 3 + 1);
    const c = index.getX(faceIndex * 3 + 2);
    
    return { a, b, c };
  }

  /**
   * Get vertex position from geometry
   */
  private getVertex(geometry: THREE.BufferGeometry, index: number): THREE.Vector3 {
    const positions = geometry.attributes.position;
    return new THREE.Vector3(
      positions.getX(index),
      positions.getY(index),
      positions.getZ(index)
    );
  }

  /**
   * Calculate distance from point to line segment
   */
  private distanceToLineSegment(point: THREE.Vector3, start: THREE.Vector3, end: THREE.Vector3): number {
    const line = end.clone().sub(start);
    const len = line.length();
    
    if (len === 0) {
      return point.distanceTo(start);
    }
    
    const t = Math.max(0, Math.min(1, point.clone().sub(start).dot(line) / (len * len)));
    const projection = start.clone().add(line.multiplyScalar(t));
    
    return point.distanceTo(projection);
  }

  /**
   * Convert pick result to geometry reference
   */
  static pickResultToGeometryReference(result: PickResult): GeometryReference {
    return {
      type: result.geometryType,
      instanceId: result.instanceId,
      index: result.index,
      position: result.position.clone(),
      direction: result.direction?.clone(),
      normal: result.normal?.clone()
    };
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.clearHighlight();
    this.highlightMaterial.dispose();
  }
}
