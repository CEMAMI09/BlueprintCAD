/**
 * Edge Visualization Helper for Three.js Viewport
 * Highlights edges during fillet/chamfer operations
 */

import * as THREE from 'three';
import { Edge as BREPEdge } from '@/lib/cad/brep/topology';

export interface EdgeHighlight {
  line: THREE.Line;
  edgeIndex: number;
  selected: boolean;
}

/**
 * Create edge visualization from BREP edges
 */
export function createEdgeVisualization(
  edges: BREPEdge[],
  color: number = 0xffaa00,
  lineWidth: number = 2
): THREE.LineSegments {
  const points: THREE.Vector3[] = [];

  for (const edge of edges) {
    // Sample edge into segments for smooth curves
    const segments = 10;
    const startPos = edge.startVertex.position;
    const endPos = edge.endVertex.position;
    
    for (let i = 0; i < segments; i++) {
      const t1 = i / segments;
      const t2 = (i + 1) / segments;

      const p1 = startPos.clone().lerp(endPos, t1);
      const p2 = startPos.clone().lerp(endPos, t2);

      points.push(p1, p2);
    }
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    linewidth: lineWidth,
    transparent: true,
    opacity: 0.8
  });

  return new THREE.LineSegments(geometry, material);
}

/**
 * Highlight specific edges
 */
export function highlightEdges(
  edges: BREPEdge[],
  indices: number[],
  scene: THREE.Scene,
  color: number = 0x00ff00
): THREE.LineSegments | null {
  const selectedEdges = indices.map(i => edges[i]).filter(e => e !== undefined);
  
  if (selectedEdges.length === 0) return null;

  const highlight = createEdgeVisualization(selectedEdges, color, 3);
  scene.add(highlight);
  
  return highlight;
}

/**
 * Create clickable edge helpers from mesh geometry
 */
export function createEdgeHelpersFromMesh(
  mesh: THREE.Mesh,
  onEdgeClick?: (edgeIndex: number) => void
): THREE.LineSegments {
  const edges = new THREE.EdgesGeometry(mesh.geometry);
  const material = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.3,
    linewidth: 1
  });

  const lineSegments = new THREE.LineSegments(edges, material);
  lineSegments.position.copy(mesh.position);
  lineSegments.rotation.copy(mesh.rotation);
  lineSegments.scale.copy(mesh.scale);

  // Store edge data for raycasting
  (lineSegments as any).isEdgeHelper = true;
  (lineSegments as any).parentMesh = mesh;

  return lineSegments;
}

/**
 * Highlight edges on hover
 */
export class EdgeHighlighter {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private raycaster: THREE.Raycaster;
  private hoveredEdge: THREE.Line | null = null;
  private selectedEdges: Set<number> = new Set();
  private edgeHelpers: Map<string, THREE.LineSegments> = new Map();
  private onEdgeSelect?: (edgeIndex: number) => void;

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    onEdgeSelect?: (edgeIndex: number) => void
  ) {
    this.scene = scene;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Line = { threshold: 2 };
    this.onEdgeSelect = onEdgeSelect;
  }

  /**
   * Enable edge selection for a mesh
   */
  enableEdgeSelection(mesh: THREE.Mesh, featureId: string): void {
    const edgeHelper = createEdgeHelpersFromMesh(mesh);
    this.edgeHelpers.set(featureId, edgeHelper);
    this.scene.add(edgeHelper);
  }

  /**
   * Disable edge selection for a mesh
   */
  disableEdgeSelection(featureId: string): void {
    const edgeHelper = this.edgeHelpers.get(featureId);
    if (edgeHelper) {
      this.scene.remove(edgeHelper);
      this.edgeHelpers.delete(featureId);
    }
  }

  /**
   * Handle mouse move for hover effects
   */
  onMouseMove(event: MouseEvent, container: HTMLElement): void {
    const rect = container.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    this.raycaster.setFromCamera(mouse, this.camera);

    const edgeHelpers = Array.from(this.edgeHelpers.values());
    const intersects = this.raycaster.intersectObjects(edgeHelpers, false);

    // Clear previous hover
    if (this.hoveredEdge) {
      (this.hoveredEdge.material as THREE.LineBasicMaterial).color.setHex(0xffffff);
      (this.hoveredEdge.material as THREE.LineBasicMaterial).opacity = 0.3;
      this.hoveredEdge = null;
    }

    // Highlight hovered edge
    if (intersects.length > 0) {
      const edge = intersects[0].object as THREE.Line;
      (edge.material as THREE.LineBasicMaterial).color.setHex(0xffaa00);
      (edge.material as THREE.LineBasicMaterial).opacity = 0.8;
      this.hoveredEdge = edge;
      
      // Change cursor
      container.style.cursor = 'pointer';
    } else {
      container.style.cursor = 'default';
    }
  }

  /**
   * Handle mouse click for edge selection
   */
  onClick(event: MouseEvent, container: HTMLElement): void {
    if (!this.hoveredEdge) return;

    const rect = container.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    this.raycaster.setFromCamera(mouse, this.camera);

    const edgeHelpers = Array.from(this.edgeHelpers.values());
    const intersects = this.raycaster.intersectObjects(edgeHelpers, false);

    if (intersects.length > 0) {
      // Compute edge index from intersection
      const edgeIndex = Math.floor(intersects[0].index! / 2);

      // Toggle selection
      const object = intersects[0].object as THREE.LineSegments;
      const material = object.material as THREE.LineBasicMaterial;
      
      if (this.selectedEdges.has(edgeIndex)) {
        this.selectedEdges.delete(edgeIndex);
        material.color.setHex(0xffffff);
      } else {
        this.selectedEdges.add(edgeIndex);
        material.color.setHex(0x00ff00);
      }

      material.opacity = 0.8;

      // Callback
      if (this.onEdgeSelect) {
        this.onEdgeSelect(edgeIndex);
      }
    }
  }

  /**
   * Get selected edge indices
   */
  getSelectedEdges(): number[] {
    return Array.from(this.selectedEdges);
  }

  /**
   * Clear all selections
   */
  clearSelection(): void {
    this.selectedEdges.clear();
    
    for (const edgeHelper of this.edgeHelpers.values()) {
      (edgeHelper.material as THREE.LineBasicMaterial).color.setHex(0xffffff);
      (edgeHelper.material as THREE.LineBasicMaterial).opacity = 0.3;
    }
  }

  /**
   * Cleanup
   */
  dispose(): void {
    for (const [featureId] of this.edgeHelpers) {
      this.disableEdgeSelection(featureId);
    }
    this.edgeHelpers.clear();
    this.selectedEdges.clear();
  }
}
