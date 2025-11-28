import * as THREE from 'three';

/**
 * Visual helper to display the neutral plane in draft analysis
 */
export class NeutralPlaneHelper extends THREE.Group {
  private plane: THREE.Plane;
  private size: number;
  private planeMesh: THREE.Mesh;
  private normalArrow: THREE.ArrowHelper;
  private grid: THREE.GridHelper;

  constructor(plane: THREE.Plane, size: number = 100, color: number = 0x00aaff) {
    super();
    
    this.plane = plane.clone();
    this.size = size;

    // Create plane mesh
    const planeGeometry = new THREE.PlaneGeometry(size, size);
    const planeMaterial = new THREE.MeshBasicMaterial({
      color,
      opacity: 0.3,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    
    this.planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
    this.add(this.planeMesh);

    // Create border
    const edgesGeometry = new THREE.EdgesGeometry(planeGeometry);
    const edgesMaterial = new THREE.LineBasicMaterial({ color, linewidth: 2 });
    const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    this.planeMesh.add(edges);

    // Create normal arrow
    const arrowOrigin = new THREE.Vector3(0, 0, 0);
    const arrowDirection = plane.normal.clone();
    const arrowLength = size * 0.3;
    
    this.normalArrow = new THREE.ArrowHelper(
      arrowDirection,
      arrowOrigin,
      arrowLength,
      color,
      arrowLength * 0.2,
      arrowLength * 0.15
    );
    this.add(this.normalArrow);

    // Create grid
    this.grid = new THREE.GridHelper(size, 10, color, 0x444444);
    this.add(this.grid);

    // Position and orient the plane
    this.updatePlane(plane);
  }

  /**
   * Update plane position and orientation
   */
  updatePlane(newPlane: THREE.Plane) {
    this.plane = newPlane.clone();

    // Get a point on the plane
    const planePoint = new THREE.Vector3();
    this.plane.coplanarPoint(planePoint);

    // Position the helper at the plane point
    this.position.copy(planePoint);

    // Orient the plane mesh to match the plane normal
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), this.plane.normal);
    this.planeMesh.quaternion.copy(quaternion);

    // Orient the grid
    if (Math.abs(this.plane.normal.y) > 0.9) {
      // Plane is mostly horizontal, keep grid as is
      this.grid.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), this.plane.normal);
    } else {
      // Plane is vertical or tilted, rotate grid
      this.grid.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), this.plane.normal);
    }

    // Update arrow direction
    this.normalArrow.setDirection(this.plane.normal);
  }

  /**
   * Set visibility of helper components
   */
  setComponentVisibility(showPlane: boolean, showArrow: boolean, showGrid: boolean) {
    this.planeMesh.visible = showPlane;
    this.normalArrow.visible = showArrow;
    this.grid.visible = showGrid;
  }

  /**
   * Update color
   */
  setColor(color: number) {
    (this.planeMesh.material as THREE.MeshBasicMaterial).color.setHex(color);
    this.normalArrow.setColor(color);
    (this.grid.material as THREE.LineBasicMaterial).color.setHex(color);
  }

  /**
   * Update opacity
   */
  setOpacity(opacity: number) {
    (this.planeMesh.material as THREE.MeshBasicMaterial).opacity = opacity;
  }

  /**
   * Get current plane
   */
  getPlane(): THREE.Plane {
    return this.plane.clone();
  }

  /**
   * Dispose of resources
   */
  dispose() {
    this.planeMesh.geometry.dispose();
    (this.planeMesh.material as THREE.Material).dispose();
    this.grid.geometry.dispose();
    (this.grid.material as THREE.Material).dispose();
  }
}

/**
 * Draft direction arrow helper
 */
export class DraftDirectionHelper extends THREE.ArrowHelper {
  constructor(direction: THREE.Vector3, position: THREE.Vector3, length: number = 50, color: number = 0xff8800) {
    super(direction.clone().normalize(), position, length, color, length * 0.3, length * 0.2);
  }

  updateDirection(direction: THREE.Vector3, position?: THREE.Vector3) {
    this.setDirection(direction.clone().normalize());
    if (position) {
      this.position.copy(position);
    }
  }
}
