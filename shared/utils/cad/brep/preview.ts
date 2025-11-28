/**
 * Three.js Preview Integration for BREP Boolean Operations
 * 
 * Provides real-time visualization and preview of boolean operations
 * in the CAD viewport.
 */

import * as THREE from 'three';
import { Solid, Face, Edge, Vertex } from './topology';
import { BooleanOperation, BooleanResult, booleanOperation } from './boolean';

export interface PreviewOptions {
  showWireframe: boolean;
  showIntersections: boolean;
  colorA: number;
  colorB: number;
  colorResult: number;
  colorIntersection: number;
  opacity: number;
  animationDuration: number;
}

export const DEFAULT_PREVIEW_OPTIONS: PreviewOptions = {
  showWireframe: true,
  showIntersections: true,
  colorA: 0x3b82f6, // Blue
  colorB: 0xef4444, // Red
  colorResult: 0x10b981, // Green
  colorIntersection: 0xfbbf24, // Yellow
  opacity: 0.8,
  animationDuration: 500 // ms
};

/**
 * Convert BREP Solid to Three.js Mesh for visualization
 */
export function solidToMesh(
  solid: Solid,
  material?: THREE.Material
): THREE.Mesh {
  const geometry = new THREE.BufferGeometry();
  const positions: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];

  const vertexMap = new Map<Vertex, number>();
  let vertexIndex = 0;

  // Convert faces to triangles
  for (const face of solid.outerShell.faces) {
    const faceVertices = face.outerLoop.getVertices();
    const faceNormal = face.normal || face.calculateNormal();

    // Triangulate face (simple fan triangulation)
    for (let i = 1; i < faceVertices.length - 1; i++) {
      const v0 = faceVertices[0];
      const v1 = faceVertices[i];
      const v2 = faceVertices[i + 1];

      for (const vertex of [v0, v1, v2]) {
        if (!vertexMap.has(vertex)) {
          vertexMap.set(vertex, vertexIndex++);
          positions.push(vertex.position.x, vertex.position.y, vertex.position.z);
          normals.push(faceNormal.x, faceNormal.y, faceNormal.z);
        }
      }

      indices.push(
        vertexMap.get(v0)!,
        vertexMap.get(v1)!,
        vertexMap.get(v2)!
      );
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();

  const defaultMaterial = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    roughness: 0.5,
    metalness: 0.1,
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(geometry, material || defaultMaterial);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

/**
 * Create wireframe from BREP solid
 */
export function solidToWireframe(solid: Solid, color: number = 0x000000): THREE.LineSegments {
  const positions: number[] = [];

  for (const edge of solid.outerShell.getEdges()) {
    const points = edge.curve.getPoints(10);
    for (let i = 0; i < points.length - 1; i++) {
      positions.push(
        points[i].x, points[i].y, points[i].z,
        points[i + 1].x, points[i + 1].y, points[i + 1].z
      );
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  const material = new THREE.LineBasicMaterial({ color, linewidth: 2 });
  return new THREE.LineSegments(geometry, material);
}

/**
 * Boolean Operation Preview Manager
 */
export class BooleanPreview {
  private scene: THREE.Scene;
  private options: PreviewOptions;
  
  private meshA: THREE.Mesh | null = null;
  private meshB: THREE.Mesh | null = null;
  private meshResult: THREE.Mesh | null = null;
  
  private wireframeA: THREE.LineSegments | null = null;
  private wireframeB: THREE.LineSegments | null = null;
  
  private intersectionMarkers: THREE.Points | null = null;
  
  private animationGroup: THREE.Group;

  constructor(scene: THREE.Scene, options: Partial<PreviewOptions> = {}) {
    this.scene = scene;
    this.options = { ...DEFAULT_PREVIEW_OPTIONS, ...options };
    this.animationGroup = new THREE.Group();
    this.animationGroup.name = 'boolean-preview';
    this.scene.add(this.animationGroup);
  }

  /**
   * Show preview of two solids before boolean operation
   */
  showInputSolids(solidA: Solid, solidB: Solid): void {
    this.clear();

    // Create meshes
    const materialA = new THREE.MeshStandardMaterial({
      color: this.options.colorA,
      transparent: true,
      opacity: this.options.opacity,
      roughness: 0.5,
      metalness: 0.1
    });

    const materialB = new THREE.MeshStandardMaterial({
      color: this.options.colorB,
      transparent: true,
      opacity: this.options.opacity,
      roughness: 0.5,
      metalness: 0.1
    });

    this.meshA = solidToMesh(solidA, materialA);
    this.meshB = solidToMesh(solidB, materialB);

    this.animationGroup.add(this.meshA);
    this.animationGroup.add(this.meshB);

    // Add wireframes
    if (this.options.showWireframe) {
      this.wireframeA = solidToWireframe(solidA, this.options.colorA);
      this.wireframeB = solidToWireframe(solidB, this.options.colorB);
      this.animationGroup.add(this.wireframeA);
      this.animationGroup.add(this.wireframeB);
    }
  }

  /**
   * Show preview of boolean operation result
   */
  async showResult(result: BooleanResult, animate: boolean = true): Promise<void> {
    if (!result.success || !result.solid) {
      console.error('Boolean operation failed:', result.errors);
      return;
    }

    const materialResult = new THREE.MeshStandardMaterial({
      color: this.options.colorResult,
      transparent: true,
      opacity: animate ? 0 : this.options.opacity,
      roughness: 0.5,
      metalness: 0.1
    });

    this.meshResult = solidToMesh(result.solid, materialResult);
    this.meshResult.visible = !animate;
    this.animationGroup.add(this.meshResult);

    if (animate) {
      await this.animateTransition();
    }
  }

  /**
   * Animate transition from input solids to result
   */
  private async animateTransition(): Promise<void> {
    const duration = this.options.animationDuration;
    const startTime = performance.now();

    return new Promise((resolve) => {
      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = this.easeInOutCubic(progress);

        // Fade out input meshes
        if (this.meshA && this.meshB) {
          const mat1 = this.meshA.material as THREE.MeshStandardMaterial;
          const mat2 = this.meshB.material as THREE.MeshStandardMaterial;
          mat1.opacity = this.options.opacity * (1 - eased);
          mat2.opacity = this.options.opacity * (1 - eased);
        }

        // Fade in result mesh
        if (this.meshResult) {
          const matResult = this.meshResult.material as THREE.MeshStandardMaterial;
          matResult.opacity = this.options.opacity * eased;
          this.meshResult.visible = true;
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Hide input meshes after animation
          if (this.meshA) this.meshA.visible = false;
          if (this.meshB) this.meshB.visible = false;
          if (this.wireframeA) this.wireframeA.visible = false;
          if (this.wireframeB) this.wireframeB.visible = false;
          resolve();
        }
      };

      animate();
    });
  }

  /**
   * Show intersection points between two solids
   */
  showIntersections(intersections: THREE.Vector3[]): void {
    if (!this.options.showIntersections || intersections.length === 0) return;

    const positions = new Float32Array(intersections.length * 3);
    for (let i = 0; i < intersections.length; i++) {
      positions[i * 3] = intersections[i].x;
      positions[i * 3 + 1] = intersections[i].y;
      positions[i * 3 + 2] = intersections[i].z;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: this.options.colorIntersection,
      size: 0.5,
      sizeAttenuation: true
    });

    this.intersectionMarkers = new THREE.Points(geometry, material);
    this.animationGroup.add(this.intersectionMarkers);
  }

  /**
   * Perform and visualize boolean operation
   */
  async performOperation(
    solidA: Solid,
    solidB: Solid,
    operation: BooleanOperation,
    animate: boolean = true
  ): Promise<BooleanResult> {
    // Show input solids
    this.showInputSolids(solidA, solidB);

    // Wait a bit to show inputs
    if (animate) {
      await this.delay(200);
    }

    // Perform boolean operation
    const result = booleanOperation(solidA, solidB, operation);

    // Show result
    await this.showResult(result, animate);

    return result;
  }

  /**
   * Clear all preview objects
   */
  clear(): void {
    if (this.meshA) {
      this.animationGroup.remove(this.meshA);
      this.meshA.geometry.dispose();
      (this.meshA.material as THREE.Material).dispose();
      this.meshA = null;
    }

    if (this.meshB) {
      this.animationGroup.remove(this.meshB);
      this.meshB.geometry.dispose();
      (this.meshB.material as THREE.Material).dispose();
      this.meshB = null;
    }

    if (this.meshResult) {
      this.animationGroup.remove(this.meshResult);
      this.meshResult.geometry.dispose();
      (this.meshResult.material as THREE.Material).dispose();
      this.meshResult = null;
    }

    if (this.wireframeA) {
      this.animationGroup.remove(this.wireframeA);
      this.wireframeA.geometry.dispose();
      (this.wireframeA.material as THREE.Material).dispose();
      this.wireframeA = null;
    }

    if (this.wireframeB) {
      this.animationGroup.remove(this.wireframeB);
      this.wireframeB.geometry.dispose();
      (this.wireframeB.material as THREE.Material).dispose();
      this.wireframeB = null;
    }

    if (this.intersectionMarkers) {
      this.animationGroup.remove(this.intersectionMarkers);
      this.intersectionMarkers.geometry.dispose();
      (this.intersectionMarkers.material as THREE.Material).dispose();
      this.intersectionMarkers = null;
    }
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    this.clear();
    this.scene.remove(this.animationGroup);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}

/**
 * Quick preview functions for CADViewport integration
 */

export function previewUnion(
  scene: THREE.Scene,
  solidA: Solid,
  solidB: Solid,
  animate: boolean = true
): Promise<BooleanResult> {
  const preview = new BooleanPreview(scene);
  return preview.performOperation(solidA, solidB, BooleanOperation.UNION, animate);
}

export function previewSubtract(
  scene: THREE.Scene,
  solidA: Solid,
  solidB: Solid,
  animate: boolean = true
): Promise<BooleanResult> {
  const preview = new BooleanPreview(scene);
  return preview.performOperation(solidA, solidB, BooleanOperation.SUBTRACT, animate);
}

export function previewIntersect(
  scene: THREE.Scene,
  solidA: Solid,
  solidB: Solid,
  animate: boolean = true
): Promise<BooleanResult> {
  const preview = new BooleanPreview(scene);
  return preview.performOperation(solidA, solidB, BooleanOperation.INTERSECT, animate);
}
