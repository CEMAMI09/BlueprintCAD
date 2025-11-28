/**
 * Interactive Drag Handler - Drag parts with real-time mate solving
 * Supports mouse and touch input with collision feedback
 */

import * as THREE from 'three';
import { MateAdvancedSolver, SolverResult } from './mate-solver';
import { Mate } from './mate-system';

export interface DragState {
  instanceId: string;
  isDragging: boolean;
  startPosition: THREE.Vector3;
  currentPosition: THREE.Vector3;
  startTransform: THREE.Matrix4;
  dragPlane: THREE.Plane;
  camera: THREE.Camera;
  allowedDOF: {
    translateX: boolean;
    translateY: boolean;
    translateZ: boolean;
    rotateX: boolean;
    rotateY: boolean;
    rotateZ: boolean;
  };
}

export interface DragOptions {
  enableSnapping: boolean;
  snapDistance: number;
  enableCollisionFeedback: boolean;
  collisionHighlightColor: number;
  solverIterations: number;
}

export class InteractiveDragHandler {
  private dragState: DragState | null = null;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private solver: MateAdvancedSolver;
  private mates: Mate[] = [];
  private options: DragOptions;
  
  private onDragUpdateCallback?: (instanceId: string, transform: THREE.Matrix4, solverResult: SolverResult) => void;
  private onCollisionCallback?: (hasCollision: boolean) => void;

  constructor(
    solver: MateAdvancedSolver,
    options?: Partial<DragOptions>
  ) {
    this.solver = solver;
    this.options = {
      enableSnapping: true,
      snapDistance: 5,
      enableCollisionFeedback: true,
      collisionHighlightColor: 0xff0000,
      solverIterations: 10,
      ...options
    };
  }

  /**
   * Set mates for solver
   */
  setMates(mates: Mate[]): void {
    this.mates = mates;
  }

  /**
   * Set drag update callback
   */
  onDragUpdate(callback: (instanceId: string, transform: THREE.Matrix4, solverResult: SolverResult) => void): void {
    this.onDragUpdateCallback = callback;
  }

  /**
   * Set collision callback
   */
  onCollision(callback: (hasCollision: boolean) => void): void {
    this.onCollisionCallback = callback;
  }

  /**
   * Start dragging an instance
   */
  startDrag(
    event: MouseEvent | TouchEvent,
    instanceId: string,
    instanceMesh: THREE.Mesh,
    camera: THREE.Camera,
    canvas: HTMLElement,
    allowedDOF?: Partial<DragState['allowedDOF']>
  ): void {
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, camera);
    
    const intersects = this.raycaster.intersectObject(instanceMesh, true);
    if (intersects.length === 0) return;

    const intersectionPoint = intersects[0].point;
    
    // Create drag plane perpendicular to camera direction
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    const dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
      cameraDirection.negate(),
      intersectionPoint
    );

    this.dragState = {
      instanceId,
      isDragging: true,
      startPosition: intersectionPoint.clone(),
      currentPosition: intersectionPoint.clone(),
      startTransform: instanceMesh.matrix.clone(),
      dragPlane,
      camera,
      allowedDOF: {
        translateX: true,
        translateY: true,
        translateZ: true,
        rotateX: false,
        rotateY: false,
        rotateZ: false,
        ...allowedDOF
      }
    };
  }

  /**
   * Update drag position
   */
  updateDrag(
    event: MouseEvent | TouchEvent,
    canvas: HTMLElement,
    allTransforms: Map<string, THREE.Matrix4>,
    boundingBoxes?: Map<string, THREE.Box3>
  ): SolverResult | null {
    if (!this.dragState || !this.dragState.isDragging) return null;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.dragState.camera);

    // Intersect with drag plane
    const planeIntersect = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.dragState.dragPlane, planeIntersect);

    if (!planeIntersect) return null;

    this.dragState.currentPosition.copy(planeIntersect);

    // Calculate drag offset
    const dragOffset = planeIntersect.clone().sub(this.dragState.startPosition);

    // Apply DOF constraints
    if (!this.dragState.allowedDOF.translateX) dragOffset.x = 0;
    if (!this.dragState.allowedDOF.translateY) dragOffset.y = 0;
    if (!this.dragState.allowedDOF.translateZ) dragOffset.z = 0;

    // Apply snapping
    if (this.options.enableSnapping) {
      dragOffset.x = Math.round(dragOffset.x / this.options.snapDistance) * this.options.snapDistance;
      dragOffset.y = Math.round(dragOffset.y / this.options.snapDistance) * this.options.snapDistance;
      dragOffset.z = Math.round(dragOffset.z / this.options.snapDistance) * this.options.snapDistance;
    }

    // Create new transform with drag offset
    const pos = new THREE.Vector3();
    const rot = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    this.dragState.startTransform.decompose(pos, rot, scale);
    
    pos.add(dragOffset);
    const newTransform = new THREE.Matrix4().compose(pos, rot, scale);

    // Update transforms map
    const updatedTransforms = new Map(allTransforms);
    updatedTransforms.set(this.dragState.instanceId, newTransform);

    // Solve mates with updated transform
    const solverResult = this.solver.solve(
      this.mates,
      updatedTransforms,
      boundingBoxes
    );

    // Check for collisions
    if (this.options.enableCollisionFeedback && this.onCollisionCallback) {
      const hasCollision = solverResult.collisions.length > 0;
      this.onCollisionCallback(hasCollision);
    }

    // Notify callback
    if (this.onDragUpdateCallback) {
      const finalTransform = solverResult.solutions.get(this.dragState.instanceId) || newTransform;
      this.onDragUpdateCallback(this.dragState.instanceId, finalTransform, solverResult);
    }

    return solverResult;
  }

  /**
   * End dragging
   */
  endDrag(): void {
    if (this.dragState) {
      this.dragState.isDragging = false;
      this.dragState = null;
    }

    if (this.onCollisionCallback) {
      this.onCollisionCallback(false);
    }
  }

  /**
   * Check if currently dragging
   */
  isDragging(): boolean {
    return this.dragState?.isDragging || false;
  }

  /**
   * Get current drag state
   */
  getDragState(): DragState | null {
    return this.dragState;
  }

  /**
   * Cancel drag (reset to start)
   */
  cancelDrag(): THREE.Matrix4 | null {
    if (!this.dragState) return null;
    
    const startTransform = this.dragState.startTransform.clone();
    this.endDrag();
    return startTransform;
  }
}
