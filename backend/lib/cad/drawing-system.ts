import * as THREE from 'three';

/**
 * 2D Drawing System
 * Creates engineering drawings with orthographic, isometric, section, detail, and auxiliary views
 * Pulls geometry from BREP solids and syncs with file versions
 */

export type ViewType = 'orthographic' | 'isometric' | 'section' | 'detail' | 'auxiliary';
export type OrthographicDirection = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';
export type ProjectionType = 'first-angle' | 'third-angle';
export type LineType = 'visible' | 'hidden' | 'centerline' | 'dimension' | 'section' | 'phantom';

export interface DrawingView {
  id: string;
  name: string;
  type: ViewType;
  position: { x: number; y: number }; // Position on sheet (mm)
  scale: number; // Drawing scale (1, 0.5, 2, etc.)
  rotation: number; // Rotation in degrees
  
  // View-specific parameters
  orthographicDirection?: OrthographicDirection;
  isometricAngle?: { x: number; y: number }; // Isometric rotation angles
  sectionPlane?: {
    point: THREE.Vector3;
    normal: THREE.Vector3;
    cutawayDirection: THREE.Vector3;
  };
  detailSource?: {
    sourceViewId: string;
    centerPoint: { x: number; y: number };
    radius: number; // Detail circle radius
  };
  auxiliaryPlane?: {
    normal: THREE.Vector3;
    up: THREE.Vector3;
  };
  
  // Visibility settings
  showHiddenLines: boolean;
  showCenterlines: boolean;
  showDimensions: boolean;
  showAnnotations: boolean;
  
  // Geometry data
  edges: DrawingEdge[];
  annotations: DrawingAnnotation[];
  dimensions: Dimension[];
}

export interface DrawingEdge {
  id: string;
  type: LineType;
  points: { x: number; y: number }[]; // 2D points in view space
  sourceGeometry?: {
    faceIndex?: number;
    edgeIndex?: number;
    vertexIndices?: number[];
  };
}

export interface DrawingAnnotation {
  id: string;
  type: 'text' | 'leader' | 'symbol' | 'note' | 'balloon' | 'gdt' | 'surface-finish' | 'welding';
  position: { x: number; y: number };
  text?: string;
  leaderPoints?: { x: number; y: number }[];
  fontSize?: number;
  rotation?: number;
  style?: any; // AnnotationStyle from annotation-styles.ts (avoid circular dependency)
}

export interface Dimension {
  id: string;
  type: 'linear' | 'angular' | 'radial' | 'diameter' | 'ordinate';
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  dimensionPoint: { x: number; y: number }; // Where dimension line sits
  value: number; // Measured value
  text?: string; // Override text
  tolerance?: {
    upper: number;
    lower: number;
  };
  style?: any; // AnnotationStyle from annotation-styles.ts (avoid circular dependency)
}

export interface DrawingSheet {
  id: string;
  name: string;
  size: 'A0' | 'A1' | 'A2' | 'A3' | 'A4' | 'B' | 'C' | 'D' | 'E' | 'custom';
  orientation: 'portrait' | 'landscape';
  width: number; // mm
  height: number; // mm
  
  // Title block
  titleBlock: {
    title: string;
    partNumber?: string;
    revision?: string;
    drawnBy?: string;
    checkedBy?: string;
    approvedBy?: string;
    date?: string;
    scale?: string;
    material?: string;
    finish?: string;
    notes?: string;
  };
  
  // Drawing settings
  projectionType: ProjectionType;
  units: 'mm' | 'in' | 'cm';
  precision: number; // Decimal places
  
  // Views on this sheet
  views: DrawingView[];
  
  // Source file reference
  sourceFileId?: number;
  sourceFileVersion?: number;
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
}

export interface DrawingDocument {
  id: string;
  name: string;
  folderId?: number;
  sheets: DrawingSheet[];
  metadata: {
    createdAt: number;
    updatedAt: number;
    author: string;
    version: number;
    description?: string;
  };
  permissions: {
    canEdit: boolean;
    canView: boolean;
    canDelete: boolean;
    isOwner: boolean;
  };
}

// Standard sheet sizes (in mm)
const SHEET_SIZES = {
  A0: { width: 841, height: 1189 },
  A1: { width: 594, height: 841 },
  A2: { width: 420, height: 594 },
  A3: { width: 297, height: 420 },
  A4: { width: 210, height: 297 },
  B: { width: 279, height: 432 }, // ANSI B (11x17)
  C: { width: 432, height: 559 }, // ANSI C (17x22)
  D: { width: 559, height: 864 }, // ANSI D (22x34)
  E: { width: 864, height: 1118 }, // ANSI E (34x44)
};

export class DrawingSystem {
  private sheets: Map<string, DrawingSheet> = new Map();
  private drawingDocument: DrawingDocument | null = null;
  private changeListeners: Set<(event: string, data: any) => void> = new Set();

  /**
   * Create a new drawing sheet
   */
  createSheet(
    name: string,
    size: DrawingSheet['size'] = 'A3',
    orientation: 'portrait' | 'landscape' = 'landscape'
  ): DrawingSheet {
    const dimensions = size === 'custom' ? { width: 297, height: 420 } : SHEET_SIZES[size];
    const width = orientation === 'landscape' ? Math.max(dimensions.width, dimensions.height) : Math.min(dimensions.width, dimensions.height);
    const height = orientation === 'landscape' ? Math.min(dimensions.width, dimensions.height) : Math.max(dimensions.width, dimensions.height);

    const sheet: DrawingSheet = {
      id: `sheet_${Date.now()}`,
      name,
      size,
      orientation,
      width,
      height,
      titleBlock: {
        title: name,
        scale: '1:1',
      },
      projectionType: 'third-angle',
      units: 'mm',
      precision: 2,
      views: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.sheets.set(sheet.id, sheet);
    this.notifyChange('sheet-created', { sheet });

    return sheet;
  }

  /**
   * Add a view to a sheet
   */
  addView(
    sheetId: string,
    type: ViewType,
    name: string,
    position: { x: number; y: number },
    scale: number = 1
  ): DrawingView {
    const sheet = this.sheets.get(sheetId);
    if (!sheet) throw new Error('Sheet not found');

    const view: DrawingView = {
      id: `view_${Date.now()}`,
      name,
      type,
      position,
      scale,
      rotation: 0,
      showHiddenLines: type !== 'section',
      showCenterlines: true,
      showDimensions: true,
      showAnnotations: true,
      edges: [],
      annotations: [],
      dimensions: [],
    };

    sheet.views.push(view);
    sheet.updatedAt = Date.now();
    this.notifyChange('view-added', { sheetId, view });

    return view;
  }

  /**
   * Generate orthographic view from 3D geometry
   */
  generateOrthographicView(
    mesh: THREE.Mesh,
    direction: OrthographicDirection,
    scale: number = 1
  ): DrawingEdge[] {
    const geometry = mesh.geometry as THREE.BufferGeometry;
    const position = geometry.attributes.position as THREE.BufferAttribute;
    
    if (!position) return [];

    // Get camera matrix for projection
    const camera = this.getOrthographicCamera(direction);
    const projectionMatrix = new THREE.Matrix4();
    projectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);

    // Transform mesh to world space
    const worldMatrix = mesh.matrixWorld;

    // Extract edges from geometry
    const edges: DrawingEdge[] = [];
    const edgeSet = new Set<string>();

    // Process triangles to find edges
    const index = geometry.index;
    const vertexCount = index ? index.count : position.count;

    for (let i = 0; i < vertexCount; i += 3) {
      const indices = [
        index ? index.getX(i) : i,
        index ? index.getX(i + 1) : i + 1,
        index ? index.getX(i + 2) : i + 2,
      ];

      // Get triangle edges
      const triangleEdges = [
        [indices[0], indices[1]],
        [indices[1], indices[2]],
        [indices[2], indices[0]],
      ];

      for (const [v1, v2] of triangleEdges) {
        const edgeKey = [Math.min(v1, v2), Math.max(v1, v2)].join('-');

        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);

          // Project vertices to 2D
          const p1 = this.projectVertex(position, v1, worldMatrix, projectionMatrix, scale);
          const p2 = this.projectVertex(position, v2, worldMatrix, projectionMatrix, scale);

          // Determine if edge is visible or hidden (simplified)
          const normal = this.getTriangleNormal(geometry, i / 3);
          const viewVector = camera.getWorldDirection(new THREE.Vector3());
          const isVisible = normal.dot(viewVector) < 0;

          edges.push({
            id: `edge_${edgeKey}`,
            type: isVisible ? 'visible' : 'hidden',
            points: [p1, p2],
            sourceGeometry: {
              vertexIndices: [v1, v2],
            },
          });
        }
      }
    }

    return edges;
  }

  /**
   * Generate isometric view
   */
  generateIsometricView(
    mesh: THREE.Mesh,
    angleX: number = 35.264, // Standard isometric angle
    angleY: number = 45,
    scale: number = 1
  ): DrawingEdge[] {
    const geometry = mesh.geometry as THREE.BufferGeometry;
    const position = geometry.attributes.position as THREE.BufferAttribute;
    
    if (!position) return [];

    // Create isometric projection matrix
    const rotX = new THREE.Matrix4().makeRotationX(THREE.MathUtils.degToRad(angleX));
    const rotY = new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(angleY));
    const isoMatrix = new THREE.Matrix4().multiplyMatrices(rotY, rotX);

    const worldMatrix = mesh.matrixWorld.clone().multiply(isoMatrix);

    // Orthographic projection for isometric
    const orthoMatrix = new THREE.Matrix4().makeOrthographic(-100, 100, 100, -100, 0.1, 1000);

    const edges: DrawingEdge[] = [];
    const edgeSet = new Set<string>();

    const index = geometry.index;
    const vertexCount = index ? index.count : position.count;

    for (let i = 0; i < vertexCount; i += 3) {
      const indices = [
        index ? index.getX(i) : i,
        index ? index.getX(i + 1) : i + 1,
        index ? index.getX(i + 2) : i + 2,
      ];

      const triangleEdges = [
        [indices[0], indices[1]],
        [indices[1], indices[2]],
        [indices[2], indices[0]],
      ];

      for (const [v1, v2] of triangleEdges) {
        const edgeKey = [Math.min(v1, v2), Math.max(v1, v2)].join('-');

        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);

          const p1 = this.projectVertex(position, v1, worldMatrix, orthoMatrix, scale);
          const p2 = this.projectVertex(position, v2, worldMatrix, orthoMatrix, scale);

          edges.push({
            id: `edge_${edgeKey}`,
            type: 'visible', // Isometric typically shows all as visible
            points: [p1, p2],
            sourceGeometry: {
              vertexIndices: [v1, v2],
            },
          });
        }
      }
    }

    return edges;
  }

  /**
   * Generate section view
   */
  generateSectionView(
    mesh: THREE.Mesh,
    sectionPlane: { point: THREE.Vector3; normal: THREE.Vector3 },
    scale: number = 1
  ): DrawingEdge[] {
    const geometry = mesh.geometry as THREE.BufferGeometry;
    const position = geometry.attributes.position as THREE.BufferAttribute;
    
    if (!position) return [];

    const edges: DrawingEdge[] = [];
    const sectionEdges: DrawingEdge[] = [];

    // Create plane for sectioning
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
      sectionPlane.normal.clone().normalize(),
      sectionPlane.point
    );

    // Process triangles
    const index = geometry.index;
    const vertexCount = index ? index.count : position.count;

    for (let i = 0; i < vertexCount; i += 3) {
      const indices = [
        index ? index.getX(i) : i,
        index ? index.getX(i + 1) : i + 1,
        index ? index.getX(i + 2) : i + 2,
      ];

      const vertices = indices.map(idx => {
        const v = new THREE.Vector3(
          position.getX(idx),
          position.getY(idx),
          position.getZ(idx)
        );
        v.applyMatrix4(mesh.matrixWorld);
        return v;
      });

      // Check which vertices are on which side of plane
      const distances = vertices.map(v => plane.distanceToPoint(v));
      const intersections: THREE.Vector3[] = [];

      // Find intersections with plane
      for (let j = 0; j < 3; j++) {
        const v1 = vertices[j];
        const v2 = vertices[(j + 1) % 3];
        const d1 = distances[j];
        const d2 = distances[(j + 1) % 3];

        if ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) {
          // Edge crosses plane
          const t = d1 / (d1 - d2);
          const intersection = new THREE.Vector3().lerpVectors(v1, v2, t);
          intersections.push(intersection);
        }
      }

      // Create section line if triangle intersects plane
      if (intersections.length === 2) {
        // Project to 2D view perpendicular to section plane
        const viewMatrix = this.getSectionViewMatrix(sectionPlane.normal);
        const p1 = this.projectPoint(intersections[0], viewMatrix, scale);
        const p2 = this.projectPoint(intersections[1], viewMatrix, scale);

        sectionEdges.push({
          id: `section_${i}`,
          type: 'section',
          points: [p1, p2],
        });
      }

      // Add remaining visible edges (behind section plane)
      const triangleEdges = [
        [indices[0], indices[1]],
        [indices[1], indices[2]],
        [indices[2], indices[0]],
      ];

      for (const [v1, v2] of triangleEdges) {
        const vert1 = vertices[v1];
        const vert2 = vertices[v2];
        
        // Only show edges behind the cut plane
        if (plane.distanceToPoint(vert1) < 0 && plane.distanceToPoint(vert2) < 0) {
          const viewMatrix = this.getSectionViewMatrix(sectionPlane.normal);
          const p1 = this.projectPoint(vert1, viewMatrix, scale);
          const p2 = this.projectPoint(vert2, viewMatrix, scale);

          edges.push({
            id: `edge_${v1}_${v2}`,
            type: 'visible',
            points: [p1, p2],
          });
        }
      }
    }

    return [...sectionEdges, ...edges];
  }

  /**
   * Generate detail view (zoomed-in portion of another view)
   */
  generateDetailView(
    sourceView: DrawingView,
    centerPoint: { x: number; y: number },
    radius: number,
    detailScale: number
  ): DrawingEdge[] {
    const detailEdges: DrawingEdge[] = [];

    // Filter edges that fall within the detail circle
    for (const edge of sourceView.edges) {
      let includeEdge = false;

      for (const point of edge.points) {
        const dx = point.x - centerPoint.x;
        const dy = point.y - centerPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= radius) {
          includeEdge = true;
          break;
        }
      }

      if (includeEdge) {
        // Scale and translate edge to detail view
        const scaleFactor = detailScale / sourceView.scale;
        const scaledPoints = edge.points.map(p => ({
          x: (p.x - centerPoint.x) * scaleFactor,
          y: (p.y - centerPoint.y) * scaleFactor,
        }));

        detailEdges.push({
          ...edge,
          id: `detail_${edge.id}`,
          points: scaledPoints,
        });
      }
    }

    return detailEdges;
  }

  /**
   * Generate auxiliary view (projection onto arbitrary plane)
   */
  generateAuxiliaryView(
    mesh: THREE.Mesh,
    planeNormal: THREE.Vector3,
    planeUp: THREE.Vector3,
    scale: number = 1
  ): DrawingEdge[] {
    const geometry = mesh.geometry as THREE.BufferGeometry;
    const position = geometry.attributes.position as THREE.BufferAttribute;
    
    if (!position) return [];

    // Create view matrix for auxiliary plane
    const normal = planeNormal.clone().normalize();
    const up = planeUp.clone().normalize();
    const right = new THREE.Vector3().crossVectors(up, normal).normalize();
    up.crossVectors(normal, right).normalize();

    const viewMatrix = new THREE.Matrix4().makeBasis(right, up, normal);
    viewMatrix.setPosition(0, 0, -100); // Move back for orthographic view

    const edges: DrawingEdge[] = [];
    const edgeSet = new Set<string>();

    const index = geometry.index;
    const vertexCount = index ? index.count : position.count;

    for (let i = 0; i < vertexCount; i += 3) {
      const indices = [
        index ? index.getX(i) : i,
        index ? index.getX(i + 1) : i + 1,
        index ? index.getX(i + 2) : i + 2,
      ];

      const triangleEdges = [
        [indices[0], indices[1]],
        [indices[1], indices[2]],
        [indices[2], indices[0]],
      ];

      for (const [v1, v2] of triangleEdges) {
        const edgeKey = [Math.min(v1, v2), Math.max(v1, v2)].join('-');

        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);

          const vert1 = new THREE.Vector3(
            position.getX(v1),
            position.getY(v1),
            position.getZ(v1)
          ).applyMatrix4(mesh.matrixWorld);

          const vert2 = new THREE.Vector3(
            position.getX(v2),
            position.getY(v2),
            position.getZ(v2)
          ).applyMatrix4(mesh.matrixWorld);

          const p1 = this.projectPoint(vert1, viewMatrix, scale);
          const p2 = this.projectPoint(vert2, viewMatrix, scale);

          edges.push({
            id: `edge_${edgeKey}`,
            type: 'visible',
            points: [p1, p2],
          });
        }
      }
    }

    return edges;
  }

  /**
   * Sync drawing with source file version
   */
  async syncWithSourceFile(sheetId: string, fileId: number, version: number): Promise<void> {
    const sheet = this.sheets.get(sheetId);
    if (!sheet) throw new Error('Sheet not found');

    // Update source file reference
    sheet.sourceFileId = fileId;
    sheet.sourceFileVersion = version;
    sheet.updatedAt = Date.now();

    this.notifyChange('sheet-synced', { sheetId, fileId, version });
  }

  /**
   * Add dimension to view
   */
  addDimension(
    viewId: string,
    sheetId: string,
    dimension: Dimension
  ): void {
    const sheet = this.sheets.get(sheetId);
    if (!sheet) throw new Error('Sheet not found');

    const view = sheet.views.find(v => v.id === viewId);
    if (!view) throw new Error('View not found');

    view.dimensions.push(dimension);
    sheet.updatedAt = Date.now();

    this.notifyChange('dimension-added', { viewId, dimension });
  }

  /**
   * Add annotation to view
   */
  addAnnotation(
    viewId: string,
    sheetId: string,
    annotation: DrawingAnnotation
  ): void {
    const sheet = this.sheets.get(sheetId);
    if (!sheet) throw new Error('Sheet not found');

    const view = sheet.views.find(v => v.id === viewId);
    if (!view) throw new Error('View not found');

    view.annotations.push(annotation);
    sheet.updatedAt = Date.now();

    this.notifyChange('annotation-added', { viewId, annotation });
  }

  // Helper methods

  private getOrthographicCamera(direction: OrthographicDirection): THREE.OrthographicCamera {
    const camera = new THREE.OrthographicCamera(-100, 100, 100, -100, 0.1, 1000);

    switch (direction) {
      case 'front':
        camera.position.set(0, 0, 100);
        camera.lookAt(0, 0, 0);
        break;
      case 'back':
        camera.position.set(0, 0, -100);
        camera.lookAt(0, 0, 0);
        break;
      case 'left':
        camera.position.set(-100, 0, 0);
        camera.lookAt(0, 0, 0);
        break;
      case 'right':
        camera.position.set(100, 0, 0);
        camera.lookAt(0, 0, 0);
        break;
      case 'top':
        camera.position.set(0, 100, 0);
        camera.up.set(0, 0, -1);
        camera.lookAt(0, 0, 0);
        break;
      case 'bottom':
        camera.position.set(0, -100, 0);
        camera.up.set(0, 0, 1);
        camera.lookAt(0, 0, 0);
        break;
    }

    camera.updateMatrixWorld();
    return camera;
  }

  private projectVertex(
    position: THREE.BufferAttribute,
    index: number,
    worldMatrix: THREE.Matrix4,
    projectionMatrix: THREE.Matrix4,
    scale: number
  ): { x: number; y: number } {
    const vertex = new THREE.Vector3(
      position.getX(index),
      position.getY(index),
      position.getZ(index)
    );

    vertex.applyMatrix4(worldMatrix);
    vertex.applyMatrix4(projectionMatrix);

    return {
      x: vertex.x * scale,
      y: vertex.y * scale,
    };
  }

  private projectPoint(
    point: THREE.Vector3,
    viewMatrix: THREE.Matrix4,
    scale: number
  ): { x: number; y: number } {
    const projected = point.clone().applyMatrix4(viewMatrix);
    return {
      x: projected.x * scale,
      y: projected.y * scale,
    };
  }

  private getSectionViewMatrix(normal: THREE.Vector3): THREE.Matrix4 {
    const up = Math.abs(normal.y) < 0.99 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const right = new THREE.Vector3().crossVectors(up, normal).normalize();
    up.crossVectors(normal, right).normalize();

    const matrix = new THREE.Matrix4().makeBasis(right, up, normal);
    return matrix;
  }

  private getTriangleNormal(geometry: THREE.BufferGeometry, triangleIndex: number): THREE.Vector3 {
    const position = geometry.attributes.position as THREE.BufferAttribute;
    const index = geometry.index;

    const i = triangleIndex * 3;
    const indices = [
      index ? index.getX(i) : i,
      index ? index.getX(i + 1) : i + 1,
      index ? index.getX(i + 2) : i + 2,
    ];

    const v1 = new THREE.Vector3(
      position.getX(indices[0]),
      position.getY(indices[0]),
      position.getZ(indices[0])
    );
    const v2 = new THREE.Vector3(
      position.getX(indices[1]),
      position.getY(indices[1]),
      position.getZ(indices[1])
    );
    const v3 = new THREE.Vector3(
      position.getX(indices[2]),
      position.getY(indices[2]),
      position.getZ(indices[2])
    );

    const edge1 = new THREE.Vector3().subVectors(v2, v1);
    const edge2 = new THREE.Vector3().subVectors(v3, v1);

    return new THREE.Vector3().crossVectors(edge1, edge2).normalize();
  }

  private notifyChange(event: string, data: any): void {
    this.changeListeners.forEach((listener) => {
      listener(event, data);
    });
  }

  /**
   * Add change listener
   */
  addChangeListener(listener: (event: string, data: any) => void): void {
    this.changeListeners.add(listener);
  }

  /**
   * Remove change listener
   */
  removeChangeListener(listener: (event: string, data: any) => void): void {
    this.changeListeners.delete(listener);
  }

  /**
   * Get all sheets
   */
  getAllSheets(): DrawingSheet[] {
    return Array.from(this.sheets.values());
  }

  /**
   * Get sheet by ID
   */
  getSheet(sheetId: string): DrawingSheet | undefined {
    return this.sheets.get(sheetId);
  }

  /**
   * Delete sheet
   */
  deleteSheet(sheetId: string): void {
    this.sheets.delete(sheetId);
    this.notifyChange('sheet-deleted', { sheetId });
  }

  /**
   * Export to JSON
   */
  toJSON(): any {
    return {
      sheets: Array.from(this.sheets.values()),
      document: this.drawingDocument,
    };
  }

  /**
   * Load from JSON
   */
  fromJSON(data: any): void {
    if (data.sheets) {
      this.sheets.clear();
      for (const sheet of data.sheets) {
        this.sheets.set(sheet.id, sheet);
      }
    }
    if (data.document) {
      this.drawingDocument = data.document;
    }
  }
}
